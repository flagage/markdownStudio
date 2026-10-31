import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage } from 'electron'
import { readdir, readFile, writeFile, mkdir, stat, lstat, rename, copyFile, rm } from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import HTMLtoDOCX from 'html-to-docx'
import { marked } from 'marked'

let workspaceRoot: string | null = null
let lastWorkspaceDirectory = '.'
let preferencesWrite = Promise.resolve()
let recentFilesWrite = Promise.resolve()
let mainWindow: BrowserWindow | null = null
let workspaceSearchGeneration = 0
const pendingMarkdownFiles: string[] = []
let recentMarkdownFiles: string[] = []
const maxRecentMarkdownFiles = 10
const markdownSearchIndex = new Map<string, {
  size: number
  modifiedAt: number
  content: string
}>()
const wordpressImageMimeTypes: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}
const imageMimeTypes: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

function queueMarkdownFile(filePath: string): void {
  if (path.extname(filePath).toLowerCase() !== '.md') return
  pendingMarkdownFiles.push(path.resolve(filePath))
  mainWindow?.webContents.send('files:pending')
}

function queueMarkdownFileFromArguments(args: string[]): void {
  const filePath = args.find((argument) => path.extname(argument).toLowerCase() === '.md')
  if (filePath) queueMarkdownFile(filePath)
}

function showMainWindow(): void {
  if (!mainWindow) {
    if (app.isReady()) createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

function recentMarkdownFilesPath(): string {
  return path.join(app.getPath('userData'), 'recent-files.json')
}

function wordpressSettingsPath(): string {
  return path.join(app.getPath('userData'), 'wordpress.json')
}

interface StoredWordPressSettings {
  siteUrl: string
  username: string
  encryptedPassword: string
}

interface WordPressSettingsSummary {
  siteUrl: string
  username: string
  configured: boolean
}

async function readWordPressSettings(): Promise<StoredWordPressSettings | null> {
  let contents: string
  try {
    contents = await readFile(wordpressSettingsPath(), 'utf8')
  } catch (reason) {
    if (reason instanceof Error && 'code' in reason && reason.code === 'ENOENT') return null
    throw reason
  }
  const parsed: unknown = JSON.parse(contents)
  if (!parsed || typeof parsed !== 'object' ||
    !('siteUrl' in parsed) || typeof parsed.siteUrl !== 'string' ||
    !('username' in parsed) || typeof parsed.username !== 'string' ||
    !('encryptedPassword' in parsed) || typeof parsed.encryptedPassword !== 'string') {
    throw new Error('La configuration WordPress est invalide.')
  }
  return parsed as StoredWordPressSettings
}

function getWordPressApiBase(siteUrl: string): string {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(siteUrl)
  } catch {
    throw new Error('Saisis une adresse de site WordPress valide.')
  }
  if ((parsedUrl.protocol !== 'https:' &&
    !(parsedUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname))) ||
    parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    throw new Error('Le site WordPress doit utiliser HTTPS (HTTP est accepté uniquement en local).')
  }
  return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/, '')}/wp-json/wp/v2`
}

function wordPressAuthorization(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

async function getWordPressPassword(settings: StoredWordPressSettings): Promise<string> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Le stockage sécurisé des identifiants est indisponible sur cet appareil.')
  }
  return safeStorage.decryptString(Buffer.from(settings.encryptedPassword, 'base64'))
}

async function wordPressRequest(
  endpoint: string,
  username: string,
  password: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: wordPressAuthorization(username, password)
    },
    signal: AbortSignal.timeout(60_000)
  })
  if (!response.ok) {
    const body = await response.text()
    let message = `WordPress a répondu avec le statut ${response.status}.`
    let errorCode = ''
    try {
      const error: unknown = JSON.parse(body)
      if (error && typeof error === 'object') {
        if ('code' in error && typeof error.code === 'string') errorCode = error.code
        if ('message' in error && typeof error.message === 'string') message = error.message
      }
    } catch {
      if (body) message = body.slice(0, 500)
    }
    if (errorCode === 'rest_not_logged_in') {
      let redirectedToDifferentSite = false
      try {
        redirectedToDifferentSite = response.url !== '' &&
          new URL(response.url).origin !== new URL(endpoint).origin
      } catch {
        redirectedToDifferentSite = false
      }
      if (redirectedToDifferentSite) {
        message = `L’adresse WordPress redirige vers ${response.url}. Utilise directement l’adresse finale du site dans les réglages : WordPress ne transmet pas les identifiants lors d’une redirection vers un autre domaine.`
      } else {
        message = `WordPress ne reconnaît pas l’authentification. Vérifie que tu utilises le nom de connexion WordPress (pas le nom affiché), un mot de passe d’application valide, et que l’API REST du site accepte l’en-tête Authorization. La connexion doit être en HTTPS. Réponse WordPress : ${message}`
      }
    }
    throw new Error(message)
  }
  return response
}

async function saveWordPressSettings(
  siteUrl: string,
  username: string,
  password: string
): Promise<WordPressSettingsSummary> {
  if (typeof siteUrl !== 'string' || typeof username !== 'string' ||
    typeof password !== 'string' || !username.trim()) {
    throw new Error('L’adresse du site et le nom d’utilisateur sont obligatoires.')
  }
  const apiBase = getWordPressApiBase(siteUrl.trim())
  const normalizedSiteUrl = new URL(siteUrl.trim()).href.replace(/\/+$/, '')
  const normalizedUsername = username.trim()
  let appPassword = password.replace(/\s+/g, '')
  const previous = await readWordPressSettings()
  if (!appPassword && previous &&
    previous.siteUrl === normalizedSiteUrl && previous.username === normalizedUsername) {
    appPassword = await getWordPressPassword(previous)
  }
  if (!appPassword) throw new Error('Saisis un mot de passe d’application WordPress.')

  await wordPressRequest(`${apiBase}/users/me?context=edit`, normalizedUsername, appPassword)
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Le stockage sécurisé des identifiants est indisponible sur cet appareil.')
  }
  const encryptedPassword = safeStorage.encryptString(appPassword).toString('base64')
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(wordpressSettingsPath(), JSON.stringify({
    siteUrl: normalizedSiteUrl,
    username: normalizedUsername,
    encryptedPassword
  } satisfies StoredWordPressSettings), 'utf8')
  return { siteUrl: normalizedSiteUrl, username: normalizedUsername, configured: true }
}

async function getWordPressSettingsSummary(): Promise<WordPressSettingsSummary> {
  const settings = await readWordPressSettings()
  return {
    siteUrl: settings?.siteUrl ?? '',
    username: settings?.username ?? '',
    configured: Boolean(settings)
  }
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const isHex = code[1]?.toLowerCase() === 'x'
      const numericValue = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      return Number.isFinite(numericValue) ? String.fromCodePoint(numericValue) : entity
    }
    const entities: Record<string, string> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      nbsp: ' ',
      quot: '"'
    }
    return entities[code.toLowerCase()] ?? entity
  })
}

async function uploadWordPressImage(
  apiBase: string,
  username: string,
  password: string,
  imagePath: string
): Promise<string> {
  const resolvedImagePath = path.resolve(imagePath)
  const mimeType = wordpressImageMimeTypes[path.extname(resolvedImagePath).toLowerCase()]
  if (!mimeType) throw new Error(`Le format de l’image « ${path.basename(imagePath)} » n’est pas pris en charge.`)
  const imageStats = await stat(resolvedImagePath)
  if (!imageStats.isFile()) throw new Error(`L’image « ${path.basename(imagePath)} » est introuvable.`)
  if (imageStats.size > 20 * 1024 * 1024) {
    throw new Error(`L’image « ${path.basename(imagePath)} » dépasse 20 Mo.`)
  }

  const image = await readFile(resolvedImagePath)
  const filename = path.basename(resolvedImagePath)
  const response = await wordPressRequest(`${apiBase}/media`, username, password, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
    },
    body: image
  })
  const media: unknown = await response.json()
  if (!media || typeof media !== 'object' || !('source_url' in media) ||
    typeof media.source_url !== 'string') {
    throw new Error(`WordPress n’a pas renvoyé l’URL de l’image « ${filename} ».`)
  }
  return media.source_url
}

async function uploadLocalWordPressImages(
  html: string,
  markdownPath: string,
  apiBase: string,
  username: string,
  password: string
): Promise<string> {
  const imageTagPattern = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi
  const uploadedImages = new Map<string, string>()
  let result = ''
  let previousIndex = 0

  for (const match of html.matchAll(imageTagPattern)) {
    const imageTag = match[0]
    const source = decodeHtmlEntities(match[2])
    let outputTag = imageTag
    const isFileUrl = source.startsWith('file://')
    if (isFileUrl || !/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(source)) {
      let imagePath: string
      try {
        imagePath = isFileUrl
          ? fileURLToPath(source)
          : path.resolve(path.dirname(markdownPath), decodeURIComponent(source.split(/[?#]/, 1)[0]))
      } catch {
        throw new Error(`Le chemin de l’image « ${source} » est invalide.`)
      }
      let uploadedUrl = uploadedImages.get(imagePath)
      if (!uploadedUrl) {
        uploadedUrl = await uploadWordPressImage(apiBase, username, password, imagePath)
        uploadedImages.set(imagePath, uploadedUrl)
      }
      const escapedUploadedUrl = uploadedUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      outputTag = imageTag.replace(
        `src=${match[1]}${match[2]}${match[1]}`,
        `src=${match[1]}${escapedUploadedUrl}${match[1]}`
      )
    }
    result += html.slice(previousIndex, match.index) + outputTag
    previousIndex = match.index + imageTag.length
  }
  return result + html.slice(previousIndex)
}

async function publishWordPressDraft(
  markdown: string,
  markdownPath: string
): Promise<{ title: string; url: string }> {
  if (typeof markdown !== 'string' || typeof markdownPath !== 'string' ||
    !path.isAbsolute(markdownPath) || path.extname(markdownPath).toLowerCase() !== '.md') {
    throw new Error('Les informations du document Markdown sont invalides.')
  }
  const settings = await readWordPressSettings()
  if (!settings) throw new Error('Configure d’abord la connexion à WordPress dans le menu Fichier.')
  const password = await getWordPressPassword(settings)
  const apiBase = getWordPressApiBase(settings.siteUrl)
  const html = await marked.parse(markdown, { gfm: true })
  const titleMatch = html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]*>/g, '').trim())
    : path.basename(markdownPath, path.extname(markdownPath))
  if (!title) throw new Error('Le titre de l’article Markdown est vide.')

  const content = await uploadLocalWordPressImages(
    html,
    markdownPath,
    apiBase,
    settings.username,
    password
  )
  const response = await wordPressRequest(`${apiBase}/posts`, settings.username, password, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, status: 'draft' })
  })
  const post: unknown = await response.json()
  if (!post || typeof post !== 'object' || !('link' in post) || typeof post.link !== 'string') {
    throw new Error('WordPress n’a pas renvoyé le lien du brouillon.')
  }
  return { title, url: post.link }
}

async function loadRecentMarkdownFiles(): Promise<void> {
  let contents: string
  try {
    contents = await readFile(recentMarkdownFilesPath(), 'utf8')
  } catch (reason) {
    if (reason instanceof Error && 'code' in reason && reason.code === 'ENOENT') return
    throw reason
  }

  const parsed: unknown = JSON.parse(contents)
  if (!Array.isArray(parsed) || !parsed.every((filePath) =>
    typeof filePath === 'string' && path.isAbsolute(filePath) &&
    path.extname(filePath).toLowerCase() === '.md'
  )) {
    throw new Error('La liste des fichiers récents est invalide.')
  }
  recentMarkdownFiles = parsed.slice(0, maxRecentMarkdownFiles)
}

function refreshApplicationMenu(window: BrowserWindow): void {
  const recentMenuItems: Electron.MenuItemConstructorOptions[] = recentMarkdownFiles.length > 0
    ? recentMarkdownFiles.map((filePath) => ({
      label: `${path.basename(filePath)} — ${path.dirname(filePath)}`,
      click: () => {
        queueMarkdownFile(filePath)
        showMainWindow()
      }
    }))
    : [{ label: 'Aucun fichier récent', enabled: false }]
  if (recentMarkdownFiles.length > 0) {
    recentMenuItems.push({ type: 'separator' }, {
      label: 'Effacer les fichiers récents',
      click: () => {
        void clearRecentMarkdownFiles().catch((reason: unknown) => {
          console.error('Impossible d’effacer les fichiers récents :', reason)
        })
      }
    })
  }

  const menu = Menu.buildFromTemplate([
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Ouvrir un fichier Markdown…',
          accelerator: 'CmdOrCtrl+O',
          click: () => window.webContents.send('menu:open-file')
        },
        {
          label: 'Imprimer…',
          accelerator: 'CmdOrCtrl+P',
          click: () => window.webContents.send('menu:print-document')
        },
        {
          label: 'Fichiers récents',
          submenu: recentMenuItems
        },
        {
          label: 'WordPress',
          submenu: [
            {
              label: 'Configurer WordPress…',
              click: () => window.webContents.send('menu:wordpress-settings')
            },
            {
              label: 'Créer un brouillon avec le document actif',
              click: () => window.webContents.send('menu:wordpress-publish')
            }
          ]
        },
        {
          label: 'Exporter',
          submenu: [
            {
              label: 'PDF…',
              click: () => window.webContents.send('menu:export-document', 'pdf')
            },
            {
              label: 'Word (.docx)…',
              click: () => window.webContents.send('menu:export-document', 'docx')
            },
            {
              label: 'E-mail (.eml)…',
              click: () => window.webContents.send('menu:export-document', 'eml')
            }
          ]
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        {
          label: 'Zoom avant',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => window.webContents.setZoomLevel(
            Math.min(window.webContents.getZoomLevel() + 1, 5)
          )
        },
        {
          label: 'Zoom arrière',
          accelerator: 'CmdOrCtrl+-',
          click: () => window.webContents.setZoomLevel(
            Math.max(window.webContents.getZoomLevel() - 1, -5)
          )
        },
        {
          label: 'Taille réelle',
          accelerator: 'CmdOrCtrl+0',
          click: () => window.webContents.setZoomLevel(0)
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
}

function persistRecentMarkdownFiles(): Promise<void> {
  const operation = recentFilesWrite.catch(() => {}).then(async () => {
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(recentMarkdownFilesPath(), JSON.stringify(recentMarkdownFiles), 'utf8')
  })
  recentFilesWrite = operation.then(() => {}, () => {})
  return operation
}

async function rememberRecentMarkdownFile(filePath: string): Promise<void> {
  const resolvedPath = path.resolve(filePath)
  if (path.extname(resolvedPath).toLowerCase() !== '.md') return
  recentMarkdownFiles = [
    resolvedPath,
    ...recentMarkdownFiles.filter((recentPath) => recentPath !== resolvedPath)
  ].slice(0, maxRecentMarkdownFiles)
  await persistRecentMarkdownFiles()
  if (mainWindow) refreshApplicationMenu(mainWindow)
}

async function clearRecentMarkdownFiles(): Promise<void> {
  recentMarkdownFiles = []
  await persistRecentMarkdownFiles()
  if (mainWindow) refreshApplicationMenu(mainWindow)
}

interface WorkspacePreferences {
  path: string
  directory: string
}

interface UserTemplate {
  id: string
  name: string
  content: string
}

let templatesWrite = Promise.resolve()

function preferencesPath(): string {
  return path.join(app.getPath('userData'), 'workspace.json')
}

function templatesPath(): string {
  return path.join(app.getPath('userData'), 'templates.json')
}

async function readUserTemplates(): Promise<UserTemplate[]> {
  let contents: string
  try {
    contents = await readFile(templatesPath(), 'utf8')
  } catch (reason) {
    if (reason instanceof Error && 'code' in reason && reason.code === 'ENOENT') return []
    throw reason
  }

  const parsed: unknown = JSON.parse(contents)
  if (!Array.isArray(parsed) || !parsed.every((item) =>
    item && typeof item.id === 'string' && typeof item.name === 'string' &&
    typeof item.content === 'string'
  )) {
    throw new Error('Le fichier des modèles est invalide.')
  }
  return parsed
}

function updateUserTemplates(
  update: (templates: UserTemplate[]) => UserTemplate[]
): Promise<UserTemplate[]> {
  const operation = templatesWrite.catch(() => {}).then(async () => {
    const templates = await readUserTemplates()
    const updatedTemplates = update(templates)
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(templatesPath(), JSON.stringify(updatedTemplates), 'utf8')
    return updatedTemplates
  })
  templatesWrite = operation.then(() => {}, () => {})
  return operation
}

function persistWorkspacePreferences(): Promise<void> {
  if (!workspaceRoot) return Promise.resolve()
  const preferences: WorkspacePreferences = {
    path: workspaceRoot,
    directory: lastWorkspaceDirectory
  }
  preferencesWrite = preferencesWrite.catch(() => {}).then(async () => {
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(preferencesPath(), JSON.stringify(preferences), 'utf8')
  })
  return preferencesWrite
}

function resolveInsideWorkspace(targetPath: string): string {
  if (!workspaceRoot) throw new Error('Aucun dossier de travail n’est ouvert.')
  const resolved = path.resolve(workspaceRoot, targetPath)
  const relative = path.relative(workspaceRoot, resolved)
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Le chemin demandé sort du dossier de travail.')
  }
  return resolved
}

async function searchWorkspace(
  directory: string,
  query: string,
  isObsolete: () => boolean
) {
  if (typeof query !== 'string' || !query.trim()) {
    throw new Error('Le terme de recherche est invalide.')
  }
  const resolvedDirectory = resolveInsideWorkspace(directory)
  if (!(await stat(resolvedDirectory)).isDirectory()) {
    throw new Error('Le dossier demandé n’est pas valide.')
  }

  const directories = [resolvedDirectory]
  const filePaths: string[] = []
  while (directories.length > 0 && !isObsolete()) {
    const batch = directories.splice(0, 8)
    const batches = await Promise.all(batch.map((directoryPath) =>
      readdir(directoryPath, { withFileTypes: true })
    ))
    for (let index = 0; index < batch.length; index += 1) {
      for (const entry of batches[index]) {
        if (entry.name.startsWith('.')) continue
        const entryPath = path.join(batch[index], entry.name)
        if (entry.isDirectory()) directories.push(entryPath)
        else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
          filePaths.push(entryPath)
        }
      }
    }
  }

  const queryLower = query.trim().toLowerCase()
  const escapedQuery = queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const exactWordPattern = new RegExp(
    `(^|[^\\p{L}\\p{N}\\p{M}_])(${escapedQuery})(?=$|[^\\p{L}\\p{N}\\p{M}_])`,
    'iu'
  )
  const matchingFiles: Array<{ name: string; path: string; kind: 'file' }> = []
  const indexedPaths = new Set(filePaths)
  let nextFileIndex = 0
  await Promise.all(Array.from({ length: Math.min(8, filePaths.length) }, async () => {
    while (nextFileIndex < filePaths.length && !isObsolete()) {
      const filePath = filePaths[nextFileIndex]
      nextFileIndex += 1
      let fileStats
      try {
        fileStats = await stat(filePath)
      } catch (reason) {
        if (reason instanceof Error && 'code' in reason && reason.code === 'ENOENT') continue
        throw reason
      }
      let indexedFile = markdownSearchIndex.get(filePath)
      if (!indexedFile || indexedFile.size !== fileStats.size ||
        indexedFile.modifiedAt !== fileStats.mtimeMs) {
        let content: string
        try {
          content = await readFile(filePath, 'utf8')
        } catch (reason) {
          if (reason instanceof Error && 'code' in reason && reason.code === 'ENOENT') continue
          throw reason
        }
        indexedFile = {
          size: fileStats.size,
          modifiedAt: fileStats.mtimeMs,
          content: content.toLowerCase()
        }
        markdownSearchIndex.set(filePath, indexedFile)
      }
      if (exactWordPattern.test(indexedFile.content)) {
        matchingFiles.push({
          name: path.basename(filePath),
          path: path.relative(workspaceRoot!, filePath),
          kind: 'file'
        })
      }
    }
  }))

  if (isObsolete()) return []

  for (const indexedPath of markdownSearchIndex.keys()) {
    const relativePath = path.relative(resolvedDirectory, indexedPath)
    const isInSearchedDirectory = relativePath === '' ||
      (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' &&
        !path.isAbsolute(relativePath))
    if (isInSearchedDirectory && !indexedPaths.has(indexedPath)) {
      markdownSearchIndex.delete(indexedPath)
    }
  }

  return matchingFiles.sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base', numeric: true })
  )
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = window
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  refreshApplicationMenu(window)

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('workspace:select', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  workspaceRoot = result.filePaths[0]
  markdownSearchIndex.clear()
  lastWorkspaceDirectory = '.'
  await persistWorkspacePreferences()
  return { path: workspaceRoot, name: path.basename(workspaceRoot) }
})

async function readExternalMarkdownFile(filePath: string): Promise<{ path: string; content: string }> {
  if (!path.isAbsolute(filePath) || path.extname(filePath).toLowerCase() !== '.md') {
    throw new Error('Seuls les fichiers Markdown (.md) peuvent être ouverts.')
  }
  const fileStats = await stat(filePath)
  if (!fileStats.isFile()) {
    throw new Error('Le chemin demandé ne correspond pas à un fichier.')
  }
  const content = await readFile(filePath, 'utf8')
  await rememberRecentMarkdownFile(filePath)
  return { path: filePath, content }
}

ipcMain.handle('workspace:open-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Fichiers Markdown', extensions: ['md'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return readExternalMarkdownFile(result.filePaths[0])
})

ipcMain.handle('workspace:take-pending-files', () => pendingMarkdownFiles.splice(0))

ipcMain.handle('wordpress:get-settings', () => getWordPressSettingsSummary())
ipcMain.handle(
  'wordpress:save-settings',
  (_event, siteUrl: string, username: string, password: string) =>
    saveWordPressSettings(siteUrl, username, password)
)
ipcMain.handle(
  'wordpress:publish-draft',
  (_event, markdown: string, markdownPath: string) =>
    publishWordPressDraft(markdown, markdownPath)
)

async function embedLocalImages(
  html: string,
  markdownPath: string,
  rejectUnsupportedFormats = false
): Promise<string> {
  const documentDirectory = path.dirname(markdownPath)
  const imageTagPattern = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi
  let result = ''
  let previousIndex = 0

  for (const match of html.matchAll(imageTagPattern)) {
    const imageTag = match[0]
    const src = decodeHtmlEntities(match[2])
    let imagePath: string | null = null

    if (src.startsWith('file://')) {
      try {
        imagePath = fileURLToPath(src)
      } catch {
        throw new Error(`Le chemin de l’image « ${src} » est invalide.`)
      }
    } else if (!/^[a-z][a-z\d+.-]*:/i.test(src) && !src.startsWith('/')) {
      try {
        imagePath = path.resolve(
          documentDirectory,
          decodeURIComponent(src.split(/[?#]/, 1)[0])
        )
      } catch {
        throw new Error(`Le chemin de l’image « ${src} » est invalide.`)
      }
    }

    let outputTag = imageTag
    if (imagePath) {
      const mimeType = imageMimeTypes[path.extname(imagePath).toLowerCase()]
      if (!mimeType) {
        if (rejectUnsupportedFormats) {
          throw new Error(`Le format de l’image « ${path.basename(imagePath)} » n’est pas pris en charge.`)
        }
      } else {
        const imageStats = await stat(imagePath)
        if (!imageStats.isFile()) throw new Error(`L’image « ${path.basename(imagePath)} » est introuvable.`)
        if (imageStats.size > 20 * 1024 * 1024) {
          throw new Error(`L’image « ${path.basename(imagePath)} » dépasse 20 Mo.`)
        }
        const image = await readFile(imagePath)
        const dataUrl = `data:${mimeType};base64,${image.toString('base64')}`
        outputTag = imageTag.replace(
          `src=${match[1]}${match[2]}${match[1]}`,
          `src=${match[1]}${dataUrl}${match[1]}`
        )
      }
    }

    result += html.slice(previousIndex, match.index) + outputTag
    previousIndex = match.index + imageTag.length
  }

  return result + html.slice(previousIndex)
}

function encodeMimeBase64(value: Buffer | string): string {
  const encoded = (Buffer.isBuffer(value) ? value : Buffer.from(value)).toString('base64')
  return encoded.match(/.{1,76}/g)?.join('\r\n') ?? ''
}

function createEmailMessage(title: string, content: string): string {
  const boundary = `markdown-studio-${randomUUID()}`
  const imageTagPattern = /<img\b[^>]*\bsrc=(["'])(data:image\/[a-z\d.+-]+;base64,([^"']+))\1[^>]*>/gi
  const imageParts: string[] = []
  let html = ''
  let previousIndex = 0

  for (const match of content.matchAll(imageTagPattern)) {
    const contentId = randomUUID()
    const imageBytes = Buffer.from(match[3], 'base64')
    const imageTag = match[0].replace(
      `src=${match[1]}${match[2]}${match[1]}`,
      `src=${match[1]}cid:${contentId}${match[1]}`
    )
    imageParts.push([
      `--${boundary}`,
      `Content-Type: ${match[2].slice(5, match[2].indexOf(';'))}`,
      'Content-Transfer-Encoding: base64',
      `Content-ID: <${contentId}>`,
      `Content-Disposition: inline; filename="${contentId}"`,
      '',
      encodeMimeBase64(imageBytes)
    ].join('\r\n'))
    html += content.slice(previousIndex, match.index) + imageTag
    previousIndex = match.index + match[0].length
  }
  html += content.slice(previousIndex)

  const escapedTitle = title.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!)
  const emailHtml = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapedTitle}</title>
  <style>body{color:#242726;font:11pt/1.6 Arial,sans-serif}img{max-width:100%;height:auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #b8bdb4;padding:5px 8px;text-align:left}pre{white-space:pre-wrap;background:#f2f3ef;padding:10px}blockquote{border-left:3px solid #aeb8a9;margin-left:0;padding-left:12px;color:#60675e}</style>
</head>
<body>${html}</body>
</html>`
  const emailContentId = randomUUID()
  return [
    `Subject: =?UTF-8?B?${Buffer.from(title).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    `Content-ID: <${emailContentId}>`,
    '',
    encodeMimeBase64(emailHtml),
    ...imageParts,
    `--${boundary}--`,
    ''
  ].join('\r\n')
}

function createExportHtml(title: string, content: string): string {
  const escapedTitle = title.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[character]
  })
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapedTitle}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { color: #242726; font: 11pt/1.6 Arial, sans-serif; }
    h1, h2, h3, h4 { line-height: 1.25; margin: 1.2em 0 .5em; }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #b8bdb4; padding: 5px 8px; text-align: left; }
    pre { white-space: pre-wrap; background: #f2f3ef; padding: 10px; }
    blockquote { border-left: 3px solid #aeb8a9; margin-left: 0; padding-left: 12px; color: #60675e; }
  </style>
</head>
<body>${content}</body>
</html>`
}

ipcMain.handle(
  'document:export',
  async (
    event,
    format: 'pdf' | 'docx' | 'eml',
    markdown: string,
    markdownPath: string
  ) => {
    if ((format !== 'pdf' && format !== 'docx' && format !== 'eml') || typeof markdown !== 'string' ||
      typeof markdownPath !== 'string' || !path.isAbsolute(markdownPath) ||
      path.extname(markdownPath).toLowerCase() !== '.md') {
      throw new Error('Les informations du document à exporter sont invalides.')
    }

    const title = path.basename(markdownPath, path.extname(markdownPath))
    const formatLabel = format === 'pdf'
      ? 'PDF'
      : format === 'docx' ? 'Word' : 'e-mail'
    const saveDialogOptions = {
      title: `Exporter vers ${formatLabel}`,
      defaultPath: path.join(path.dirname(markdownPath), `${title}.${format}`),
      filters: [{
        name: format === 'pdf' ? 'Document PDF' : format === 'docx'
          ? 'Document Word' : 'Message e-mail',
        extensions: [format]
      }]
    }
    const owner = BrowserWindow.fromWebContents(event.sender)
    const result = owner
      ? await dialog.showSaveDialog(owner, saveDialogOptions)
      : await dialog.showSaveDialog(saveDialogOptions)
    if (result.canceled || !result.filePath) return null

    const renderedMarkdown = await marked.parse(markdown, { gfm: true })
    const htmlWithImages = await embedLocalImages(renderedMarkdown, markdownPath, format === 'eml')
    if (format === 'eml') {
      await writeFile(result.filePath, createEmailMessage(title, htmlWithImages), 'utf8')
      return result.filePath
    }

    const html = createExportHtml(title, htmlWithImages)
    if (format === 'docx') {
      const converted = await HTMLtoDOCX(html, null, {
        title,
        creator: 'Markdown Studio',
        lang: 'fr-FR'
      })
      const data = Buffer.isBuffer(converted)
        ? converted
        : Buffer.from(await converted.arrayBuffer())
      await writeFile(result.filePath, data)
      return result.filePath
    }

    const exportWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        javascript: false
      }
    })
    try {
      await exportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const pdf = await exportWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true
      })
      await writeFile(result.filePath, pdf)
    } finally {
      exportWindow.close()
    }
    return result.filePath
  }
)

ipcMain.handle('workspace:open-dropped-file', async (_event, filePath: string) => {
  return readExternalMarkdownFile(filePath)
})

ipcMain.handle(
  'workspace:select-image',
  async (_event, markdownPath: string, external: boolean) => {
    if (typeof external !== 'boolean') {
      throw new Error('Le type du document Markdown est invalide.')
    }
    const resolvedMarkdownPath = external
      ? markdownPath
      : resolveInsideWorkspace(markdownPath)
    if (!path.isAbsolute(resolvedMarkdownPath) ||
      path.extname(resolvedMarkdownPath).toLowerCase() !== '.md') {
      throw new Error('Le document actif n’est pas un fichier Markdown valide.')
    }
    if (!(await stat(resolvedMarkdownPath)).isFile()) {
      throw new Error('Le document Markdown actif n’existe plus.')
    }

    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
      }]
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const imagePath = result.filePaths[0]
    const mimeType = imageMimeTypes[path.extname(imagePath).toLowerCase()]
    if (!mimeType) throw new Error('Ce format d’image n’est pas pris en charge.')
    const imageStats = await stat(imagePath)
    if (!imageStats.isFile()) throw new Error('Le chemin demandé ne correspond pas à une image.')
    if (imageStats.size > 20 * 1024 * 1024) {
      throw new Error('L’image dépasse la taille maximale de 20 Mo.')
    }

    const documentDirectory = path.dirname(resolvedMarkdownPath)
    const imageName = path.basename(imagePath)
    let relativePath = imageName
    if (path.dirname(imagePath) !== documentDirectory) {
      let copyNumber = 0
      while (true) {
        const extension = path.extname(imageName)
        const basename = path.basename(imageName, extension)
        const candidateName = copyNumber === 0
          ? imageName
          : `${basename} (${copyNumber})${extension}`
        try {
          await copyFile(
            imagePath,
            path.join(documentDirectory, candidateName),
            constants.COPYFILE_EXCL
          )
          relativePath = candidateName
          break
        } catch (reason) {
          if (!(reason instanceof Error && 'code' in reason && reason.code === 'EEXIST')) {
            throw reason
          }
          copyNumber += 1
        }
      }
    }

    return {
      name: relativePath,
      relativePath: encodeURIComponent(relativePath)
    }
  }
)

ipcMain.handle('workspace:write-external', async (_event, filePath: string, content: string) => {
  if (!path.isAbsolute(filePath) || path.extname(filePath).toLowerCase() !== '.md') {
    throw new Error('Seuls les fichiers Markdown (.md) peuvent être enregistrés.')
  }
  const fileStats = await stat(filePath)
  if (!fileStats.isFile()) {
    throw new Error('Le chemin demandé ne correspond pas à un fichier.')
  }
  await writeFile(filePath, content, 'utf8')
  markdownSearchIndex.delete(filePath)
})

ipcMain.handle('workspace:restore', async () => {
  let contents: string
  try {
    contents = await readFile(preferencesPath(), 'utf8')
  } catch (reason) {
    if (reason instanceof Error && 'code' in reason && reason.code === 'ENOENT') return null
    throw reason
  }

  const preferences = JSON.parse(contents) as Partial<WorkspacePreferences>
  if (typeof preferences.path !== 'string' || typeof preferences.directory !== 'string') {
    throw new Error('Les préférences du dossier de travail sont invalides.')
  }

  const workspaceStats = await stat(preferences.path)
  if (!workspaceStats.isDirectory()) {
    throw new Error('Le dernier dossier de travail n’est pas un dossier valide.')
  }
  workspaceRoot = preferences.path
  lastWorkspaceDirectory = '.'
  try {
    const restoredDirectory = resolveInsideWorkspace(preferences.directory)
    if ((await stat(restoredDirectory)).isDirectory()) {
      lastWorkspaceDirectory = preferences.directory
    }
  } catch (reason) {
    if (!(reason instanceof Error && 'code' in reason && reason.code === 'ENOENT')) throw reason
  }

  return {
    workspace: { path: workspaceRoot, name: path.basename(workspaceRoot) },
    directory: lastWorkspaceDirectory
  }
})

ipcMain.handle('workspace:remember-directory', async (_event, directory: string) => {
  const resolvedDirectory = resolveInsideWorkspace(directory)
  if (!(await stat(resolvedDirectory)).isDirectory()) {
    throw new Error('Le dossier demandé n’est pas valide.')
  }
  lastWorkspaceDirectory = directory
  await persistWorkspacePreferences()
})

ipcMain.handle('workspace:list', async (_event, directory = '.') => {
  const resolvedDirectory = resolveInsideWorkspace(directory)
  const entries = await readdir(resolvedDirectory, { withFileTypes: true })
  return entries
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => ({
      name: entry.name,
      path: path.relative(workspaceRoot!, path.join(resolvedDirectory, entry.name)),
      kind: entry.isDirectory() ? 'directory' : 'file'
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base', numeric: true }))
})

ipcMain.handle('workspace:search', (_event, directory: string, query: string) => {
  const generation = ++workspaceSearchGeneration
  return searchWorkspace(directory, query, () => generation !== workspaceSearchGeneration)
})

ipcMain.handle('workspace:read', async (_event, filePath: string) => {
  const resolvedFile = resolveInsideWorkspace(filePath)
  if (path.extname(resolvedFile).toLowerCase() !== '.md') {
    throw new Error('Seuls les fichiers Markdown (.md) peuvent être ouverts.')
  }
  const content = await readFile(resolvedFile, 'utf8')
  await rememberRecentMarkdownFile(resolvedFile)
  return content
})

ipcMain.handle('workspace:write', async (_event, filePath: string, content: string) => {
  const resolvedFile = resolveInsideWorkspace(filePath)
  if (path.extname(resolvedFile).toLowerCase() !== '.md') {
    throw new Error('Seuls les fichiers Markdown (.md) peuvent être enregistrés.')
  }
  await writeFile(resolvedFile, content, 'utf8')
  markdownSearchIndex.delete(resolvedFile)
})

ipcMain.handle(
  'workspace:create',
  async (
    _event,
    directory: string,
    name: string,
    kind: 'file' | 'directory',
    content = ''
  ) => {
    if (!name.trim() || name !== path.basename(name) || name.startsWith('.')) {
      throw new Error('Nom de fichier ou de dossier invalide.')
    }
    const parent = resolveInsideWorkspace(directory)
    if (kind === 'directory') {
      await mkdir(path.join(parent, name))
      return
    }
    const filename = name.toLowerCase().endsWith('.md') ? name : `${name}.md`
    await writeFile(path.join(parent, filename), content, { flag: 'wx' })
  }
)

ipcMain.handle('workspace:move', async (_event, sourcePath: string, destinationDirectory: string) => {
  const source = resolveInsideWorkspace(sourcePath)
  const destination = resolveInsideWorkspace(destinationDirectory)
  const relativeSource = path.relative(workspaceRoot!, source)

  if (!relativeSource) {
    throw new Error('Le dossier de travail ne peut pas être déplacé.')
  }

  const [sourceStats, destinationStats] = await Promise.all([lstat(source), lstat(destination)])
  if (!destinationStats.isDirectory()) {
    throw new Error('La destination doit être un dossier.')
  }

  const sourceDirectory = path.dirname(source)
  if (sourceDirectory === destination) return path.relative(workspaceRoot!, source)

  const pathToDestination = path.relative(source, destination)
  if (sourceStats.isDirectory() && pathToDestination !== '..' &&
    !pathToDestination.startsWith(`..${path.sep}`) && !path.isAbsolute(pathToDestination)) {
    throw new Error('Un dossier ne peut pas être déplacé dans lui-même ou dans un de ses sous-dossiers.')
  }

  const destinationPath = path.join(destination, path.basename(source))
  try {
    await lstat(destinationPath)
    throw new Error('Un fichier ou un dossier portant ce nom existe déjà dans la destination.')
  } catch (reason) {
    if (!(reason instanceof Error && 'code' in reason && reason.code === 'ENOENT')) throw reason
  }

  await rename(source, destinationPath)
  return path.relative(workspaceRoot!, destinationPath)
})

ipcMain.handle('workspace:rename', async (_event, sourcePath: string, newName: string) => {
  const source = resolveInsideWorkspace(sourcePath)
  const relativeSource = path.relative(workspaceRoot!, source)
  if (!relativeSource) {
    throw new Error('Le dossier de travail ne peut pas être renommé.')
  }
  if (typeof newName !== 'string' || !newName.trim() || newName !== newName.trim() ||
    newName !== path.basename(newName) || newName === '.' || newName === '..' ||
    newName.startsWith('.')) {
    throw new Error('Nom de fichier ou de dossier invalide.')
  }

  await lstat(source)
  const destination = path.join(path.dirname(source), newName)
  if (destination === source) return relativeSource
  try {
    await lstat(destination)
    throw new Error('Un fichier ou un dossier portant ce nom existe déjà.')
  } catch (reason) {
    if (!(reason instanceof Error && 'code' in reason && reason.code === 'ENOENT')) throw reason
  }

  await rename(source, destination)
  return path.relative(workspaceRoot!, destination)
})

ipcMain.handle('workspace:duplicate', async (_event, sourcePath: string) => {
  const source = resolveInsideWorkspace(sourcePath)
  const sourceStats = await lstat(source)
  if (!sourceStats.isFile()) {
    throw new Error('Seuls les fichiers peuvent être dupliqués.')
  }

  const extension = path.extname(source)
  const filename = path.basename(source, extension)
  const directory = path.dirname(source)
  let copyNumber = 1

  while (true) {
    const suffix = copyNumber === 1 ? ' (copie)' : ` (copie ${copyNumber})`
    const destination = path.join(directory, `${filename}${suffix}${extension}`)
    try {
      await copyFile(source, destination, constants.COPYFILE_EXCL)
      return path.relative(workspaceRoot!, destination)
    } catch (reason) {
      if (!(reason instanceof Error && 'code' in reason && reason.code === 'EEXIST')) throw reason
      copyNumber += 1
    }
  }
})

ipcMain.handle('workspace:delete', async (_event, targetPath: string) => {
  const target = resolveInsideWorkspace(targetPath)
  const relativeTarget = path.relative(workspaceRoot!, target)
  if (!relativeTarget) {
    throw new Error('Le dossier de travail ne peut pas être supprimé.')
  }

  let parent = workspaceRoot!
  for (const part of path.dirname(relativeTarget).split(path.sep).filter(Boolean)) {
    parent = path.join(parent, part)
    const parentStats = await lstat(parent)
    if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) {
      throw new Error('La suppression à travers un lien symbolique n’est pas autorisée.')
    }
  }

  await lstat(target)
  await rm(target, { recursive: true })
})

ipcMain.handle('templates:list', () => readUserTemplates())

ipcMain.handle('templates:create', async (_event, name: string, content: string) => {
  const normalizedName = typeof name === 'string' ? name.trim() : ''
  if (!normalizedName || typeof content !== 'string') {
    throw new Error('Le nom et le contenu du modèle sont obligatoires.')
  }

  return updateUserTemplates((templates) => {
    if (templates.some((template) => template.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
      throw new Error('Un modèle portant ce nom existe déjà.')
    }
    return [...templates, { id: randomUUID(), name: normalizedName, content }]
  })
})

ipcMain.handle('templates:delete', async (_event, id: string) => {
  return updateUserTemplates((templates) => {
    if (!templates.some((template) => template.id === id)) {
      throw new Error('Le modèle demandé n’existe plus.')
    }
    return templates.filter((template) => template.id !== id)
  })
})

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    queueMarkdownFile(filePath)
    showMainWindow()
  })

  app.on('second-instance', (_event, commandLine) => {
    queueMarkdownFileFromArguments(commandLine.slice(1))
    showMainWindow()
  })

  app.whenReady().then(() => {
    queueMarkdownFileFromArguments(process.argv.slice(1))
    loadRecentMarkdownFiles().catch((reason: unknown) => {
      console.error('Impossible de charger les fichiers récents :', reason)
      recentMarkdownFiles = []
    }).finally(() => {
      if (mainWindow) refreshApplicationMenu(mainWindow)
    })
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
