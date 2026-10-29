interface WorkspaceEntry {
  name: string
  path: string
  kind: 'directory' | 'file'
}

interface WorkspaceInfo {
  path: string
  name: string
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
    create: (directory: string, name: string, kind: 'file' | 'directory') => Promise<void>
    move: (sourcePath: string, destinationDirectory: string) => Promise<string>
  }
}
