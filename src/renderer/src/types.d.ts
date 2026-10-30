interface WorkspaceEntry {
  name: string
  path: string
  kind: 'directory' | 'file'
}

interface WorkspaceInfo {
  path: string
  name: string
}

interface UserTemplate {
  id: string
  name: string
  content: string
}

interface RestoredWorkspace {
  workspace: WorkspaceInfo
  directory: string
}

interface Window {
  workspace: {
    select: () => Promise<WorkspaceInfo | null>
    openFile: () => Promise<{ path: string; content: string } | null>
    openDroppedFile: (filePath: string) => Promise<{ path: string; content: string }>
    writeExternal: (filePath: string, content: string) => Promise<void>
    onOpenFile: (callback: () => void) => () => void
    exportDocument: (
      format: 'pdf' | 'docx',
      markdown: string,
      markdownPath: string
    ) => Promise<string | null>
    onExportDocument: (callback: (format: 'pdf' | 'docx') => void) => () => void
    takePendingFiles: () => Promise<string[]>
    onFilesOpened: (callback: () => void) => () => void
    selectImage: (
      markdownPath: string,
      external: boolean
    ) => Promise<{ name: string; relativePath: string } | null>
    onFilesDropped: (callback: (filePaths: string[]) => void) => () => void
    restore: () => Promise<RestoredWorkspace | null>
    rememberDirectory: (directory: string) => Promise<void>
    list: (directory: string) => Promise<WorkspaceEntry[]>
    read: (filePath: string) => Promise<string>
    write: (filePath: string, content: string) => Promise<void>
    create: (
      directory: string,
      name: string,
      kind: 'file' | 'directory',
      content?: string
    ) => Promise<void>
    move: (sourcePath: string, destinationDirectory: string) => Promise<string>
    rename: (sourcePath: string, newName: string) => Promise<string>
    duplicate: (sourcePath: string) => Promise<string>
    delete: (targetPath: string) => Promise<void>
    listTemplates: () => Promise<UserTemplate[]>
    createTemplate: (name: string, content: string) => Promise<UserTemplate[]>
    deleteTemplate: (id: string) => Promise<UserTemplate[]>
  }
}
