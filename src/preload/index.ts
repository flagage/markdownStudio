import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('workspace', {
  select: () => ipcRenderer.invoke('workspace:select'),
  openFile: () => ipcRenderer.invoke('workspace:open-file'),
  openDroppedFile: (filePath: string) =>
    ipcRenderer.invoke('workspace:open-dropped-file', filePath),
  writeExternal: (filePath: string, content: string) =>
    ipcRenderer.invoke('workspace:write-external', filePath, content),
  onOpenFile: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('menu:open-file', listener)
    return () => ipcRenderer.removeListener('menu:open-file', listener)
  },
  exportDocument: (format: 'pdf' | 'docx', markdown: string, markdownPath: string) =>
    ipcRenderer.invoke('document:export', format, markdown, markdownPath) as Promise<string | null>,
  onExportDocument: (callback: (format: 'pdf' | 'docx') => void) => {
    const listener = (_event: Electron.IpcRendererEvent, format: 'pdf' | 'docx') => callback(format)
    ipcRenderer.on('menu:export-document', listener)
    return () => ipcRenderer.removeListener('menu:export-document', listener)
  },
  onWordPressSettings: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('menu:wordpress-settings', listener)
    return () => ipcRenderer.removeListener('menu:wordpress-settings', listener)
  },
  onWordPressPublish: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('menu:wordpress-publish', listener)
    return () => ipcRenderer.removeListener('menu:wordpress-publish', listener)
  },
  getWordPressSettings: () =>
    ipcRenderer.invoke('wordpress:get-settings') as Promise<WordPressSettingsSummary>,
  saveWordPressSettings: (siteUrl: string, username: string, password: string) =>
    ipcRenderer.invoke('wordpress:save-settings', siteUrl, username, password) as
      Promise<WordPressSettingsSummary>,
  publishWordPressDraft: (markdown: string, markdownPath: string) =>
    ipcRenderer.invoke('wordpress:publish-draft', markdown, markdownPath) as
      Promise<{ title: string; url: string }>,
  takePendingFiles: () => ipcRenderer.invoke('workspace:take-pending-files') as Promise<string[]>,
  onFilesOpened: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('files:pending', listener)
    return () => ipcRenderer.removeListener('files:pending', listener)
  },
  selectImage: (markdownPath: string, external: boolean) =>
    ipcRenderer.invoke('workspace:select-image', markdownPath, external) as Promise<{
    name: string
    relativePath: string
  } | null>,
  onFilesDropped: (callback: (filePaths: string[]) => void) => {
    const listener = (event: DragEvent) => {
      const filePaths = Array.from(event.dataTransfer?.files ?? [])
        .map((file) => webUtils.getPathForFile(file))
      if (filePaths.length > 0) callback(filePaths)
    }
    window.addEventListener('drop', listener)
    return () => window.removeEventListener('drop', listener)
  },
  restore: () => ipcRenderer.invoke('workspace:restore'),
  rememberDirectory: (directory: string) =>
    ipcRenderer.invoke('workspace:remember-directory', directory),
  list: (directory: string) => ipcRenderer.invoke('workspace:list', directory),
  search: (directory: string, query: string) =>
    ipcRenderer.invoke('workspace:search', directory, query),
  read: (filePath: string) => ipcRenderer.invoke('workspace:read', filePath),
  write: (filePath: string, content: string) =>
    ipcRenderer.invoke('workspace:write', filePath, content),
  create: (directory: string, name: string, kind: 'file' | 'directory', content = '') =>
    ipcRenderer.invoke('workspace:create', directory, name, kind, content),
  move: (sourcePath: string, destinationDirectory: string) =>
    ipcRenderer.invoke('workspace:move', sourcePath, destinationDirectory),
  rename: (sourcePath: string, newName: string) =>
    ipcRenderer.invoke('workspace:rename', sourcePath, newName),
  duplicate: (sourcePath: string) =>
    ipcRenderer.invoke('workspace:duplicate', sourcePath),
  delete: (targetPath: string) => ipcRenderer.invoke('workspace:delete', targetPath),
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  createTemplate: (name: string, content: string) =>
    ipcRenderer.invoke('templates:create', name, content),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id)
})
