import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { readdir, readFile, writeFile, mkdir, stat, lstat, rename, copyFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

let workspaceRoot: string | null = null
let lastWorkspaceDirectory = '.'
let preferencesWrite = Promise.resolve()

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
  lastWorkspaceDirectory = '.'
  await persistWorkspacePreferences()
  return { path: workspaceRoot, name: path.basename(workspaceRoot) }
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

ipcMain.handle('workspace:read', async (_event, filePath: string) => {
  const resolvedFile = resolveInsideWorkspace(filePath)
  if (path.extname(resolvedFile).toLowerCase() !== '.md') {
    throw new Error('Seuls les fichiers Markdown (.md) peuvent être ouverts.')
  }
  return readFile(resolvedFile, 'utf8')
})

ipcMain.handle('workspace:write', async (_event, filePath: string, content: string) => {
  const resolvedFile = resolveInsideWorkspace(filePath)
  if (path.extname(resolvedFile).toLowerCase() !== '.md') {
    throw new Error('Seuls les fichiers Markdown (.md) peuvent être enregistrés.')
  }
  await writeFile(resolvedFile, content, 'utf8')
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

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
