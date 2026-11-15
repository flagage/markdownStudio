import { describe, expect, it } from 'vitest'
import { canWriteFile } from './fileSaveConflict'

describe('canWriteFile', () => {
  it('allows a save when the file still matches the opened version', () => {
    expect(canWriteFile('original', 'original', false)).toBe(true)
  })

  it('rejects a save when the file changed outside the editor', () => {
    expect(canWriteFile('external edit', 'original', false)).toBe(false)
  })

  it('allows an explicit overwrite after the user chooses it', () => {
    expect(canWriteFile('external edit', 'original', true)).toBe(true)
  })
})
