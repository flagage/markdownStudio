interface RecoveryDraft {
  version: 1
  content: string
}

interface RecoveryStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function getRecoveryDraftKey(
  path: string,
  external: boolean,
  workspacePath: string | null
): string {
  return `plumelier-recovery-v1:${JSON.stringify([
    external ? 'external' : workspacePath ?? 'workspace',
    path
  ])}`
}

export function readRecoveryDraft(storage: RecoveryStorage, key: string): string | null {
  const value = storage.getItem(key)
  if (value === null) return null

  let draft: unknown
  try {
    draft = JSON.parse(value)
  } catch (reason) {
    throw new Error('La copie de récupération est illisible.', { cause: reason })
  }
  if (
    typeof draft !== 'object' ||
    draft === null ||
    !('version' in draft) ||
    draft.version !== 1 ||
    !('content' in draft) ||
    typeof draft.content !== 'string'
  ) {
    throw new Error('La copie de récupération est invalide.')
  }
  return draft.content
}

export function writeRecoveryDraft(
  storage: RecoveryStorage,
  key: string,
  content: string
): void {
  storage.setItem(key, JSON.stringify({ version: 1, content } satisfies RecoveryDraft))
}

export function clearRecoveryDraft(storage: RecoveryStorage, key: string): void {
  storage.removeItem(key)
}
