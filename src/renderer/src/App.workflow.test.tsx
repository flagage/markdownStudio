// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { exportDiagrams } = vi.hoisted(() => ({
  exportDiagrams: vi.fn()
}))

vi.mock('./MarkdownEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    React.createElement('textarea', {
      'aria-label': 'Editor Markdown',
      value,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)
    })
}))

vi.mock('./AppMenu', () => ({
  default: (props: {
    onExport: (format: 'pdf' | 'docx' | 'eml') => void
    onToggleMoveMode: () => void
  }) => React.createElement('div', null,
    React.createElement('button', {
      type: 'button',
      onClick: () => props.onExport('pdf')
    }, 'Test exporter PDF'),
    React.createElement('button', {
      type: 'button',
      onClick: props.onToggleMoveMode
    }, 'Test déplacer')
  )
}))

vi.mock('./mermaidExport', () => ({
  renderMermaidDiagramsForExport: exportDiagrams
}))

interface MockFile {
  path: string
  content: string
}

describe('App document workflows', () => {
  let container: HTMLDivElement
  let root: Root | undefined
  let files: MockFile[]
  let entries: WorkspaceEntry[]
  let localStorageDescriptor: PropertyDescriptor | undefined

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    const storage = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear()
      }
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false })
    })

    files = [{ path: 'note.md', content: '# Original' }]
    entries = [
      { name: 'note.md', path: 'note.md', kind: 'file' },
      { name: 'archive', path: 'archive', kind: 'directory' }
    ]
    exportDiagrams.mockResolvedValue({ diagrams: [], failedCount: 0 })
    window.workspace = {
      restore: vi.fn().mockResolvedValue({
        workspace: { path: '/workspace', name: 'workspace' },
        directory: '.'
      }),
      list: vi.fn().mockImplementation(async (directory: string) =>
        directory === '.' ? entries : []
      ),
      rememberDirectory: vi.fn().mockResolvedValue(undefined),
      listTemplates: vi.fn().mockResolvedValue([]),
      takePendingFiles: vi.fn().mockResolvedValue([]),
      onOpenFile: vi.fn().mockReturnValue(() => {}),
      onPrintDocument: vi.fn().mockReturnValue(() => {}),
      onExportDocument: vi.fn().mockReturnValue(() => {}),
      onWordPressSettings: vi.fn().mockReturnValue(() => {}),
      onWordPressPublish: vi.fn().mockReturnValue(() => {}),
      onFilesOpened: vi.fn().mockReturnValue(() => {}),
      onFilesDropped: vi.fn().mockReturnValue(() => {}),
      search: vi.fn().mockResolvedValue([]),
      read: vi.fn().mockImplementation(async (path: string) =>
        files.find((file) => file.path === path)?.content ?? ''
      ),
      write: vi.fn().mockImplementation(async (path: string, content: string) => {
        const file = files.find((item) => item.path === path)
        if (!file) throw new Error('File not found')
        file.content = content
        return true
      }),
      writeExternal: vi.fn().mockResolvedValue(true),
      openDroppedFile: vi.fn(),
      openFile: vi.fn(),
      select: vi.fn(),
      exportDocument: vi.fn().mockResolvedValue('/workspace/export.pdf'),
      savePastedImage: vi.fn(),
      selectImage: vi.fn(),
      move: vi.fn().mockImplementation(async (source: string, destination: string) => {
        const file = files.find((item) => item.path === source)
        if (!file) throw new Error('File not found')
        file.path = `${destination}/${source.split('/').at(-1)}`
        entries = entries.filter((entry) => entry.path !== source)
        return file.path
      }),
      rename: vi.fn().mockImplementation(async (source: string, name: string) => {
        const file = files.find((item) => item.path === source)
        if (!file) throw new Error('File not found')
        file.path = name
        entries = entries.map((entry) => entry.path === source
          ? { name, path: name, kind: 'file' }
          : entry)
        return name
      }),
      create: vi.fn(),
      duplicate: vi.fn(),
      delete: vi.fn(),
      clearRecentFiles: vi.fn(),
      recentFiles: vi.fn().mockResolvedValue([]),
      getWordPressSettings: vi.fn(),
      saveWordPressSettings: vi.fn(),
      publishWordPressDraft: vi.fn(),
      createTemplate: vi.fn(),
      deleteTemplate: vi.fn()
    }

    await act(async () => {
      root?.render(<App />)
      await Promise.resolve()
      await Promise.resolve()
    })
  })

  afterEach(() => {
    if (root) act(() => root?.unmount())
    container.remove()
    root = undefined
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    if (localStorageDescriptor) {
      Object.defineProperty(window, 'localStorage', localStorageDescriptor)
    } else {
      Reflect.deleteProperty(window, 'localStorage')
    }
    exportDiagrams.mockReset()
  })

  function button(label: string): HTMLButtonElement {
    const result = Array.from(container.querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.trim() === label ||
        candidate.textContent?.trim().endsWith(label))
    if (!result) throw new Error(`Button not found: ${label}`)
    return result
  }

  async function click(element: HTMLElement) {
    await act(async () => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  async function openNote() {
    await click(button('note.md'))
    expect(container.querySelector<HTMLTextAreaElement>('[aria-label="Editor Markdown"]')?.value)
      .toBe('# Original')
  }

  async function editNote(content: string) {
    const editor = container.querySelector<HTMLTextAreaElement>('[aria-label="Editor Markdown"]')
    if (!editor) throw new Error('Markdown editor not found')
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set
      setter?.call(editor, content)
      editor.dispatchEvent(new Event('input', { bubbles: true }))
      editor.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  it('opens, edits, autosaves, and exports the updated document', async () => {
    await openNote()
    await editNote('# Updated')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })

    expect(window.workspace.write).toHaveBeenCalledWith(
      'note.md',
      '# Updated',
      '# Original',
      false
    )
    expect(files[0].content).toBe('# Updated')
    expect(container.querySelector('.save-status')?.textContent).toContain('Enregistré')

    await click(button('Test exporter PDF'))

    expect(window.workspace.exportDocument).toHaveBeenCalledWith(
      'pdf',
      '# Updated',
      '/workspace/note.md',
      []
    )
  })

  it('renames and moves the open document while keeping its content saved', async () => {
    await openNote()
    await editNote('# Rename and move')

    const noteEntry = button('note.md')
    await act(async () => {
      noteEntry.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: 20,
        clientY: 20
      }))
    })
    await click(button('Renommer'))

    const renameInput = container.querySelector<HTMLInputElement>('#rename-entry-name')
    expect(renameInput).not.toBeNull()
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(renameInput, 'renamed.md')
      renameInput?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(button('Renommer'))

    expect(window.workspace.write).toHaveBeenNthCalledWith(
      1,
      'note.md',
      '# Rename and move',
      '# Original',
      false
    )
    expect(window.workspace.rename).toHaveBeenCalledWith('note.md', 'renamed.md')
    expect(container.querySelector('.document-title-name')?.textContent).toBe('renamed.md')

    await editNote('# Final content')
    await click(button('Test déplacer'))
    await click(button('renamed.md'))
    await click(button('archive'))

    expect(window.workspace.write).toHaveBeenNthCalledWith(
      2,
      'renamed.md',
      '# Final content',
      '# Rename and move',
      false
    )
    expect(window.workspace.move).toHaveBeenCalledWith('renamed.md', 'archive')
    expect(container.querySelector('.document-title-name')?.textContent)
      .toBe('renamed.md')
    expect(files[0]).toEqual({
      path: 'archive/renamed.md',
      content: '# Final content'
    })
  })
})
