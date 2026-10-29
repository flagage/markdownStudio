import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('workspace', {
  select: () => ipcRenderer.invoke('workspace:select'),
  restore: () => ipcRenderer.invoke('workspace:restore'),
  rememberDirectory: (directory: string) =>
    ipcRenderer.invoke('workspace:remember-directory', directory),
  list: (directory: string) => ipcRenderer.invoke('workspace:list', directory),
  read: (filePath: string) => ipcRenderer.invoke('workspace:read', filePath),
  write: (filePath: string, content: string) =>
    ipcRenderer.invoke('workspace:write', filePath, content),
  create: (directory: string, name: string, kind: 'file' | 'directory') =>
    ipcRenderer.invoke('workspace:create', directory, name, kind),
  move: (sourcePath: string, destinationDirectory: string) =>
    ipcRenderer.invoke('workspace:move', sourcePath, destinationDirectory),
  rename: (sourcePath: string, newName: string) =>
    ipcRenderer.invoke('workspace:rename', sourcePath, newName),
  duplicate: (sourcePath: string) =>
    ipcRenderer.invoke('workspace:duplicate', sourcePath),
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  createTemplate: (name: string, content: string) =>
    ipcRenderer.invoke('templates:create', name, content),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id)
})
