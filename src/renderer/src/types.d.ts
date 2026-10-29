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
