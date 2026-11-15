import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRecoveryDraft,
  getRecoveryDraftKey,
  readRecoveryDraft,
  writeRecoveryDraft
} from './recoveryDrafts'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  }
}

describe('recovery drafts', () => {
  const storage = createStorage()

  beforeEach(() => {
    for (const key of ['workspace', 'external']) clearRecoveryDraft(storage, key)
  })

  it('scopes drafts to both document kind and workspace', () => {
    expect(getRecoveryDraftKey('notes.md', false, '/work/a'))
      .not.toBe(getRecoveryDraftKey('notes.md', false, '/work/b'))
    expect(getRecoveryDraftKey('/work/notes.md', true, null))
      .not.toBe(getRecoveryDraftKey('/work/notes.md', false, null))
  })

  it('stores, reads, and clears a recovered version', () => {
    writeRecoveryDraft(storage, 'workspace', '# Recovered')

    expect(readRecoveryDraft(storage, 'workspace')).toBe('# Recovered')

    clearRecoveryDraft(storage, 'workspace')
    expect(readRecoveryDraft(storage, 'workspace')).toBeNull()
  })

  it('reports corrupt recovery data instead of silently discarding it', () => {
    storage.setItem('workspace', '{broken')

    expect(() => readRecoveryDraft(storage, 'workspace'))
      .toThrow('La copie de récupération est illisible.')
  })

  it('rejects recovery data with an unsupported shape', () => {
    storage.setItem('workspace', JSON.stringify({ version: 2, content: 'draft' }))

    expect(() => readRecoveryDraft(storage, 'workspace'))
      .toThrow('La copie de récupération est invalide.')
  })
})
