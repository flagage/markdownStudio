import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import MarkdownEditor from './MarkdownEditor'

type Theme = 'light' | 'dark'

interface OpenDocument {
  path: string
  content: string
  savedContent: string
}

type NewEntryKind = 'file' | 'directory'

interface FileContextMenu {
  entry: WorkspaceEntry
  x: number
  y: number
}

interface RenameDraft {
  entry: WorkspaceEntry
  name: string
}

interface TemplateDraft {
  name: string
  content: string
}

function updateMovedPath(filePath: string, sourcePath: string, destinationPath: string): string {
  const pathParts = filePath.split(/[\\/]/)
  const sourceParts = sourcePath.split(/[\\/]/)
  if (sourceParts.length > pathParts.length ||
    !sourceParts.every((part, index) => pathParts[index] === part)) return filePath
  const remainingParts = pathParts.slice(sourceParts.length)
  const separator = destinationPath.includes('\\') ? '\\' : '/'
  return [destinationPath, ...remainingParts].filter(Boolean).join(separator)
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem('markdown-studio-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [directory, setDirectory] = useState('.')
  const [entries, setEntries] = useState<WorkspaceEntry[]>([])
  const [documents, setDocuments] = useState<OpenDocument[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [splitView, setSplitView] = useState(false)
  const [splitPaths, setSplitPaths] = useState<[string | null, string | null]>([null, null])
  const [newEntryKind, setNewEntryKind] = useState<NewEntryKind | null>(null)
  const [newEntryName, setNewEntryName] = useState('')
  const [creatingEntry, setCreatingEntry] = useState(false)
  const [createEntryError, setCreateEntryError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templates, setTemplates] = useState<UserTemplate[]>([])
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false)
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moveMode, setMoveMode] = useState(false)
  const [draggedEntry, setDraggedEntry] = useState<WorkspaceEntry | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [fileContextMenu, setFileContextMenu] = useState<FileContextMenu | null>(null)
  const [renameDraft, setRenameDraft] = useState<RenameDraft | null>(null)
  const [renamingEntry, setRenamingEntry] = useState(false)
  const [renameEntryError, setRenameEntryError] = useState<string | null>(null)
  const documentsRef = useRef(documents)
  const saveQueues = useRef(new Map<string, Promise<void>>())
  documentsRef.current = documents
  const activeDocument = documents.find((document) => document.path === activePath) ?? null
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('markdown-studio-theme', theme)
    window.dispatchEvent(new CustomEvent('markdown-studio-theme-change', { detail: theme }))
  }, [theme])

  const parentDirectory = useMemo(() => {
    if (directory === '.') return null
    const parent = directory.split(/[\\/]/).slice(0, -1).join('/')
    return parent || '.'
  }, [directory])

  async function loadDirectory(path: string) {
    try {
      if (path !== directory && !(await saveAllDocuments())) return
      const nextEntries = await window.workspace.list(path)
      await window.workspace.rememberDirectory(path)
      setEntries(nextEntries)
      setDirectory(path)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  useEffect(() => {
    let cancelled = false
    void window.workspace.restore().then(async (restored) => {
      if (!restored) return
      const restoredEntries = await window.workspace.list(restored.directory)
      if (cancelled) return
      setWorkspace(restored.workspace)
      setDirectory(restored.directory)
      setEntries(restoredEntries)
      setError(null)
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void window.workspace.listTemplates().then((loadedTemplates) => {
      if (!cancelled) setTemplates(loadedTemplates)
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function openWorkspace() {
    if (!(await saveAllDocuments())) return
    try {
      const selected = await window.workspace.select()
      if (selected) {
        if (selected.path === workspace?.path) return
        setWorkspace(selected)
        setDocuments([])
        setActivePath(null)
        setSplitPaths([null, null])
        setSplitView(false)
        await loadDirectory('.')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  async function openEntry(entry: WorkspaceEntry) {
    if (entry.kind === 'directory') {
      await loadDirectory(entry.path)
      return
    }
    if (!entry.name.toLowerCase().endsWith('.md')) return

    if (activePath && !(await saveFile(activePath))) return
    const existing = documents.find((document) => document.path === entry.path)
    if (existing) {
      if (splitView) {
        setSplitPaths([entry.path, splitPaths[1] === entry.path ? splitPaths[0] : splitPaths[1]])
      }
      setActivePath(entry.path)
      return
    }

    try {
      const text = await window.workspace.read(entry.path)
      const previousPath = activePath
      setDocuments((current) => [...current, { path: entry.path, content: text, savedContent: text }])
      setActivePath(entry.path)
      if (splitView) setSplitPaths([entry.path, previousPath])
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  function updateDocument(path: string, content: string) {
    setDocuments((current) =>
      current.map((document) => (document.path === path ? { ...document, content } : document))
    )
  }

  async function saveFile(path: string | null = activePath) {
    if (!path) return true
    const previousSave = saveQueues.current.get(path)
    const saveTask = (async () => {
      if (previousSave) await previousSave.catch(() => {})
      const document = documentsRef.current.find((item) => item.path === path)
      if (!document || document.content === document.savedContent) return
      const content = document.content
      await window.workspace.write(path, content)
      setDocuments((current) =>
        current.map((item) =>
          item.path === path ? { ...item, savedContent: content } : item
        )
      )
      setError(null)
    })()
    saveQueues.current.set(path, saveTask)
    try {
      await saveTask
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      return false
    } finally {
      if (saveQueues.current.get(path) === saveTask) saveQueues.current.delete(path)
    }
  }

  async function saveAllDocuments() {
    for (const document of documentsRef.current) {
      if (!(await saveFile(document.path))) return false
    }
    return true
  }

  async function activateDocument(path: string) {
    if (path === activePath) return true
    if (activePath && !(await saveFile(activePath))) return false
    setActivePath(path)
    return true
  }

  async function closeDocument(path: string) {
    const document = documents.find((item) => item.path === path)
    if (!document) return
    if (!(await saveAllDocuments())) return

    const remaining = documents.filter((item) => item.path !== path)
    const nextActive = activePath === path
      ? remaining[Math.max(0, documents.findIndex((item) => item.path === path) - 1)]?.path ?? null
      : activePath
    setDocuments(remaining)
    setActivePath(nextActive)
    setSplitPaths(([left, right]) => {
      let nextLeft = left === path ? nextActive : left
      let nextRight = right === path ? null : right
      if (!remaining.some((item) => item.path === nextLeft)) nextLeft = remaining[0]?.path ?? null
      if (!remaining.some((item) => item.path === nextRight) || nextRight === nextLeft) {
        nextRight = remaining.find((item) => item.path !== nextLeft)?.path ?? null
      }
      return [nextLeft, nextRight]
    })
  }

  function toggleSplitView() {
    if (splitView) {
      setSplitView(false)
      return
    }
    if (documents.length < 2) {
      setError('Ouvre au moins deux fichiers Markdown pour les afficher côte à côte.')
      return
    }
    const other = documents.find((document) => document.path !== activePath)
    setSplitPaths([activePath, other?.path ?? null])
    setSplitView(true)
    setError(null)
  }

  async function selectPaneDocument(index: 0 | 1, path: string) {
    if (activePath && !(await saveFile(activePath))) return
    setSplitPaths((current) => {
      const next: [string | null, string | null] = [...current]
      if (next[1 - index] === path) next[1 - index] = next[index]
      next[index] = path
      return next
    })
    setActivePath(path)
  }

  function openCreateEntry(kind: NewEntryKind) {
    setNewEntryKind(kind)
    setNewEntryName('')
    setSelectedTemplateId('')
    setCreateEntryError(null)
    setError(null)
  }

  function closeCreateEntry() {
    if (creatingEntry) return
    setNewEntryKind(null)
    setNewEntryName('')
    setSelectedTemplateId('')
    setCreateEntryError(null)
  }

  async function moveEntry(entry: WorkspaceEntry, destinationDirectory: string) {
    if (entry.path === destinationDirectory || !(await saveAllDocuments())) return
    try {
      const newPath = await window.workspace.move(entry.path, destinationDirectory)
      setDocuments((current) => current.map((document) => ({
        ...document,
        path: updateMovedPath(document.path, entry.path, newPath)
      })))
      setActivePath((current) => current ? updateMovedPath(current, entry.path, newPath) : null)
      setSplitPaths((current) => current.map((currentPath) =>
        currentPath ? updateMovedPath(currentPath, entry.path, newPath) : null
      ) as [string | null, string | null])
      const nextEntries = await window.workspace.list(directory)
      await window.workspace.rememberDirectory(directory)
      setEntries(nextEntries)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setDraggedEntry(null)
      setDropTarget(null)
      setMoveMode(false)
    }
  }

  function showFileContextMenu(event: React.MouseEvent<HTMLButtonElement>, entry: WorkspaceEntry) {
    if (moveMode) return
    event.preventDefault()
    setFileContextMenu({
      entry,
      x: Math.min(event.clientX, window.innerWidth - 268),
      y: Math.min(event.clientY, window.innerHeight - 156)
    })
  }

  async function duplicateEntry(entry: WorkspaceEntry) {
    setFileContextMenu(null)
    if (!(await saveAllDocuments())) return
    try {
      await window.workspace.duplicate(entry.path)
      const nextEntries = await window.workspace.list(directory)
      setEntries(nextEntries)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  function openRenameEntry(entry: WorkspaceEntry) {
    setFileContextMenu(null)
    setRenameDraft({ entry, name: entry.name })
    setRenameEntryError(null)
  }

  async function renameEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!renameDraft || renamingEntry) return
    const newName = renameDraft.name.trim()
    if (!newName) {
      setRenameEntryError('Saisis un nom avant de continuer.')
      return
    }

    setRenamingEntry(true)
    setRenameEntryError(null)
    try {
      if (!(await saveAllDocuments())) return
      const newPath = await window.workspace.rename(renameDraft.entry.path, newName)
      setDocuments((current) => current.map((document) => ({
        ...document,
        path: updateMovedPath(document.path, renameDraft.entry.path, newPath)
      })))
      setActivePath((current) =>
        current ? updateMovedPath(current, renameDraft.entry.path, newPath) : null
      )
      setSplitPaths((current) => current.map((currentPath) =>
        currentPath ? updateMovedPath(currentPath, renameDraft.entry.path, newPath) : null
      ) as [string | null, string | null])
      setRenameDraft(null)
      const nextEntries = await window.workspace.list(directory)
      setEntries(nextEntries)
      setError(null)
    } catch (reason) {
      setRenameEntryError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setRenamingEntry(false)
    }
  }

  async function createTemplateFromFile(entry: WorkspaceEntry) {
    setFileContextMenu(null)
    if (!(await saveAllDocuments())) return
    try {
      const content = await window.workspace.read(entry.path)
      const name = entry.name.replace(/\.md$/i, '')
      setTemplateDraft({ name, content })
      setTemplateError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  function openTemplateManager() {
    setTemplateManagerOpen(true)
    setTemplateError(null)
  }

  function openNewTemplate() {
    setTemplateDraft({ name: '', content: '' })
    setTemplateError(null)
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!templateDraft || savingTemplate) return
    setSavingTemplate(true)
    setTemplateError(null)
    try {
      const savedTemplates = await window.workspace.createTemplate(
        templateDraft.name.trim(),
        templateDraft.content
      )
      setTemplates(savedTemplates)
      setTemplateDraft(null)
      setTemplateManagerOpen(true)
    } catch (reason) {
      setTemplateError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSavingTemplate(false)
    }
  }

  async function deleteTemplate(template: UserTemplate) {
    setTemplateError(null)
    try {
      const remainingTemplates = await window.workspace.deleteTemplate(template.id)
      setTemplates(remainingTemplates)
      if (selectedTemplateId === template.id) setSelectedTemplateId('')
    } catch (reason) {
      setTemplateError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  useEffect(() => {
    if (!fileContextMenu) return
    const onPointerDown = () => setFileContextMenu(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFileContextMenu(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [fileContextMenu])

  useEffect(() => {
    if (!renameDraft) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !renamingEntry) {
        setRenameDraft(null)
        setRenameEntryError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [renameDraft, renamingEntry])

  function clickEntry(entry: WorkspaceEntry) {
    if (!moveMode) {
      void openEntry(entry)
      return
    }
    if (!draggedEntry || draggedEntry.path === entry.path || entry.kind !== 'directory') {
      setDraggedEntry(entry)
      return
    }
    void moveEntry(draggedEntry, entry.path)
  }

  function handleDrop(event: React.DragEvent, destinationDirectory: string) {
    event.preventDefault()
    if (draggedEntry) void moveEntry(draggedEntry, destinationDirectory)
    setDropTarget(null)
  }

  async function createEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newEntryKind || creatingEntry) return
    const name = newEntryName.trim()
    if (!name) {
      setCreateEntryError('Saisis un nom avant de continuer.')
      return
    }

    setCreatingEntry(true)
    setCreateEntryError(null)
    try {
      const templateContent = newEntryKind === 'file'
        ? templates.find((template) => template.id === selectedTemplateId)?.content ?? ''
        : ''
      await window.workspace.create(directory, name, newEntryKind, templateContent)
      await loadDirectory(directory)
      setNewEntryKind(null)
      setNewEntryName('')
    } catch (reason) {
      setCreateEntryError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setCreatingEntry(false)
    }
  }

  useEffect(() => {
    if (!newEntryKind) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCreateEntry()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [newEntryKind, creatingEntry])

  useEffect(() => {
    if (!templateManagerOpen && !templateDraft) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || savingTemplate) return
      if (templateDraft) setTemplateDraft(null)
      else setTemplateManagerOpen(false)
      setTemplateError(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [templateManagerOpen, templateDraft, savingTemplate])

  useEffect(() => {
    const timers = documents
      .filter((document) => document.content !== document.savedContent)
      .map((document) => window.setTimeout(() => void saveFile(document.path), 700))
    return () => timers.forEach(window.clearTimeout)
  }, [documents])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveFile()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function renderEditorPane(path: string | null, index?: 0 | 1) {
    const document = documents.find((item) => item.path === path)
    return (
      <section
        className={`document-pane ${activePath === path ? 'focused-pane' : ''}`}
        key={index ?? 'single'}
        onFocusCapture={() => path && void activateDocument(path)}
      >
        {splitView && (
          <div className="pane-header">
            <select
              aria-label={`Fichier du panneau ${index === 0 ? 'gauche' : 'droit'}`}
              value={document?.path ?? ''}
              onChange={(event) => {
                if (index !== undefined) void selectPaneDocument(index, event.target.value)
              }}
            >
              {!document && <option value="">Choisir un fichier…</option>}
              {documents.map((item) => (
                <option key={item.path} value={item.path}>{item.path.split(/[\\/]/).at(-1)}</option>
              ))}
            </select>
            {document?.content !== document?.savedContent && <span className="pane-dirty">Modifié</span>}
          </div>
        )}
        {document ? (
          <MarkdownEditor
            value={document.content}
            onChange={(content) => updateDocument(document.path, content)}
          />
        ) : (
          <div className="pane-empty">Choisis un fichier ouvert pour ce panneau.</div>
        )}
      </section>
    )
  }

  const renderedPanePaths: [string | null, string | null] = [
    splitPaths[0] ?? activePath,
    splitPaths[1]
  ]

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">M</span> Markdown Studio</div>
        <div className="document-title">
          {activeDocument ? activeDocument.path.split(/[\\/]/).at(-1) : 'Aucun document ouvert'}
          {activeDocument?.content !== activeDocument?.savedContent && <span className="unsaved"> • non enregistré</span>}
        </div>
        <div className="toolbar">
          <div className="toolbar-group" role="group" aria-label="Espace de travail">
            <button onClick={() => void openWorkspace()} title="Ouvrir un dossier">
              <span aria-hidden="true">▰</span> Dossier
            </button>
            {documents.length > 0 && (
              <button
                className={splitView ? 'selected' : ''}
                aria-pressed={splitView}
                onClick={toggleSplitView}
                title="Afficher deux documents côte à côte"
              >
                <span aria-hidden="true">▥</span> {splitView ? 'Vue unique' : 'Côte à côte'}
              </button>
            )}
          </div>
          <button
            className="primary"
            onClick={() => void saveFile()}
            disabled={!activeDocument || activeDocument.content === activeDocument.savedContent}
          >
            <span aria-hidden="true">↓</span> Enregistrer <kbd>Ctrl S</kbd>
          </button>
          <button
            className="theme-toggle"
            onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            aria-label={`Activer le mode ${theme === 'dark' ? 'clair' : 'sombre'}`}
            aria-pressed={theme === 'dark'}
            title={`Activer le mode ${theme === 'dark' ? 'clair' : 'sombre'}`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark' ? 'Clair' : 'Sombre'}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <span>EXPLORATEUR</span>
            <button className="icon-button" onClick={openTemplateManager}>Modèles</button>
          </div>
          {workspace ? (
            <>
              <div
                className={`root-name ${dropTarget === '.' ? 'drop-target' : ''}`}
                title={workspace.path}
                onDragOver={(event) => {
                  if (draggedEntry) {
                    event.preventDefault()
                    setDropTarget('.')
                  }
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(event) => handleDrop(event, '.')}
                onClick={() => {
                  if (moveMode && draggedEntry) void moveEntry(draggedEntry, '.')
                }}
              >▾ &nbsp;{workspace.name}</div>
              <div className="file-actions">
                <button onClick={() => openCreateEntry('file')}>+ Fichier</button>
                <button onClick={() => openCreateEntry('directory')}>+ Dossier</button>
                <button
                  className={moveMode ? 'selected' : ''}
                  aria-pressed={moveMode}
                  onClick={() => {
                    setMoveMode((current) => !current)
                    setDraggedEntry(null)
                  }}
                >{moveMode ? 'Annuler' : 'Déplacer'}</button>
              </div>
              {moveMode && (
                <p className="move-help">
                  {draggedEntry
                    ? `« ${draggedEntry.name} » : clique sur un dossier de destination.`
                    : 'Clique sur le fichier ou dossier à déplacer.'}
                </p>
              )}
              <div className="file-list">
                {parentDirectory && (
                  <button
                    className={`file-entry directory-entry ${dropTarget === parentDirectory ? 'drop-target' : ''}`}
                    onClick={() => {
                      if (moveMode && draggedEntry) void moveEntry(draggedEntry, parentDirectory)
                      else void loadDirectory(parentDirectory)
                    }}
                    onDragOver={(event) => {
                      if (draggedEntry) {
                        event.preventDefault()
                        setDropTarget(parentDirectory)
                      }
                    }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(event) => handleDrop(event, parentDirectory)}
                  >
                    <span>↰</span> ..
                  </button>
                )}
                {entries.map((entry) => (
                  <button
                    className={`file-entry ${entry.kind === 'directory' ? 'directory-entry' : ''} ${
                      !moveMode && activePath === entry.path ? 'selected' : ''
                    } ${moveMode && draggedEntry?.path === entry.path ? 'move-source' : ''} ${
                      dropTarget === entry.path ? 'drop-target' : ''
                    }`}
                    key={entry.path}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', entry.path)
                      setDraggedEntry(entry)
                    }}
                    onDragEnd={() => {
                      setDraggedEntry(null)
                      setDropTarget(null)
                    }}
                    onDragOver={(event) => {
                      if (draggedEntry && entry.kind === 'directory') {
                        event.preventDefault()
                        setDropTarget(entry.path)
                      }
                    }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(event) => {
                      if (entry.kind === 'directory') handleDrop(event, entry.path)
                    }}
                    onClick={() => clickEntry(entry)}
                    onContextMenu={(event) => showFileContextMenu(event, entry)}
                    title={entry.path}
                  >
                    <span>{entry.kind === 'directory' ? '▸' : '▤'}</span>
                    {entry.name}
                  </button>
                ))}
                {entries.length === 0 && <p className="empty-folder">Dossier vide</p>}
              </div>
            </>
          ) : (
            <div className="welcome-sidebar">
              <p>Ouvre un dossier pour parcourir tes notes Markdown.</p>
              <button className="primary" onClick={() => void openWorkspace()}>Choisir un dossier</button>
            </div>
          )}
        </aside>

        <section className={`editor-area ${splitView ? 'split-editor-area' : ''}`}>
          {documents.length > 0 ? (
            <div className="documents-workspace">
              <div className="document-tabs" role="tablist" aria-label="Fichiers ouverts">
                {documents.map((document) => {
                  const name = document.path.split(/[\\/]/).at(-1) ?? document.path
                  const modified = document.content !== document.savedContent
                  return (
                    <div className={`document-tab ${activePath === document.path ? 'active' : ''}`} key={document.path}>
                      <button
                        role="tab"
                        aria-selected={activePath === document.path}
                        title={document.path}
                        onClick={() => void (async () => {
                          if (!(await activateDocument(document.path)) || !splitView) return
                          setSplitPaths([document.path, splitPaths[1] === document.path ? splitPaths[0] : splitPaths[1]])
                        })()}
                      >
                        {name}{modified && <span className="tab-dirty">●</span>}
                      </button>
                      <button className="tab-close" title={`Fermer ${name}`} aria-label={`Fermer ${name}`} onClick={() => void closeDocument(document.path)}>×</button>
                    </div>
                  )
                })}
              </div>
              <div className={`document-panes ${splitView ? 'two-document-panes' : ''}`}>
                {splitView
                  ? renderedPanePaths.map((path, index) => renderEditorPane(path, index as 0 | 1))
                  : renderEditorPane(activePath)}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">M</div>
              <h1>Ton espace d’écriture</h1>
              <p>Ouvre un dossier ou crée une note Markdown pour commencer.</p>
              {!workspace && <button className="primary" onClick={() => void openWorkspace()}>Ouvrir un dossier</button>}
              <p className="feature-hint">Markdown · aperçu en direct · diagrammes Mermaid</p>
            </div>
          )}
          {error && <div className="error-banner" role="alert">{error}</div>}
        </section>
      </div>
      {fileContextMenu && (
        <div
          className="file-context-menu"
          role="menu"
          style={{ left: fileContextMenu.x, top: fileContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button role="menuitem" onClick={() => openRenameEntry(fileContextMenu.entry)}>
            <span aria-hidden="true">✎</span> Renommer
          </button>
          {fileContextMenu.entry.kind === 'file' && (
            <>
              <button
                role="menuitem"
                onClick={() => void duplicateEntry(fileContextMenu.entry)}
              >
                <span aria-hidden="true">▢</span> Dupliquer
              </button>
              {fileContextMenu.entry.name.toLowerCase().endsWith('.md') && (
                <button
                  role="menuitem"
                  onClick={() => void createTemplateFromFile(fileContextMenu.entry)}
                >
                  <span aria-hidden="true">◇</span> Créer un modèle depuis ce fichier
                </button>
              )}
            </>
          )}
        </div>
      )}
      <footer className="statusbar">
        <span>{workspace?.name ?? 'Aucun espace ouvert'}</span>
        <span>
          {activeDocument
            ? `${activeDocument.content.length} caractères${activeDocument.content !== activeDocument.savedContent ? ' · Modifié' : ''}`
            : 'Markdown'}
          {splitView && ' · Vue côte à côte'}
        </span>
        <a href="mailto:fred@lagage.fr" title="Markdown Studio — Licence MIT">
          © 2026 Fred · MIT
        </a>
      </footer>
      {newEntryKind && (
        <div
          className="create-entry-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateEntry()
          }}
        >
          <form
            className="create-entry-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-entry-title"
            onSubmit={(event) => void createEntry(event)}
          >
            <h2 id="create-entry-title">
              {newEntryKind === 'file' ? 'Créer un fichier Markdown' : 'Créer un dossier'}
            </h2>
            <label htmlFor="create-entry-name">
              {newEntryKind === 'file' ? 'Nom du fichier' : 'Nom du dossier'}
            </label>
            <input
              id="create-entry-name"
              autoFocus
              value={newEntryName}
              onChange={(event) => setNewEntryName(event.target.value)}
              placeholder={newEntryKind === 'file' ? 'ex. notes.md' : 'ex. projets'}
              aria-describedby={createEntryError ? 'create-entry-error' : undefined}
              aria-invalid={Boolean(createEntryError)}
              disabled={creatingEntry}
            />
            {newEntryKind === 'file' && templates.length > 0 && (
              <>
                <label htmlFor="create-entry-template">Partir d’un modèle</label>
                <select
                  id="create-entry-template"
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  disabled={creatingEntry}
                >
                  <option value="">Aucun modèle (fichier vide)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </>
            )}
            {newEntryKind === 'file' && (
              <p className="create-entry-hint">L’extension .md sera ajoutée si elle est absente.</p>
            )}
            {createEntryError && (
              <p className="create-entry-error" id="create-entry-error" role="alert">
                {createEntryError}
              </p>
            )}
            <div className="create-entry-actions">
              <button type="button" onClick={closeCreateEntry} disabled={creatingEntry}>
                Annuler
              </button>
              <button className="primary" type="submit" disabled={creatingEntry}>
                {creatingEntry ? 'Création…' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}
      {templateManagerOpen && (
        <div
          className="create-entry-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTemplateManagerOpen(false)
          }}
        >
          <section
            className="create-entry-dialog template-manager-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-manager-title"
          >
            <h2 id="template-manager-title">Modèles Markdown</h2>
            <p className="create-entry-hint">
              Ces modèles sont disponibles dans tous tes espaces de travail.
            </p>
            {templates.length > 0 ? (
              <ul className="template-list">
                {templates.map((template) => (
                  <li key={template.id}>
                    <span>{template.name}</span>
                    <button
                      type="button"
                      aria-label={`Supprimer le modèle ${template.name}`}
                      onClick={() => void deleteTemplate(template)}
                    >Supprimer</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-folder">Aucun modèle créé pour le moment.</p>
            )}
            {templateError && <p className="create-entry-error" role="alert">{templateError}</p>}
            <div className="create-entry-actions">
              <button type="button" onClick={() => setTemplateManagerOpen(false)}>Fermer</button>
              <button className="primary" type="button" onClick={openNewTemplate}>Nouveau modèle</button>
            </div>
          </section>
        </div>
      )}
      {templateDraft && (
        <div
          className="create-entry-backdrop template-editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingTemplate) setTemplateDraft(null)
          }}
        >
          <form
            className="create-entry-dialog template-editor-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-editor-title"
            onSubmit={(event) => void saveTemplate(event)}
          >
            <h2 id="template-editor-title">Créer un modèle Markdown</h2>
            <label htmlFor="template-name">Nom du modèle</label>
            <input
              id="template-name"
              autoFocus
              value={templateDraft.name}
              onChange={(event) => setTemplateDraft((current) =>
                current ? { ...current, name: event.target.value } : current
              )}
              placeholder="ex. Compte rendu"
              disabled={savingTemplate}
              required
            />
            <label htmlFor="template-content">Contenu Markdown</label>
            <textarea
              id="template-content"
              className="template-content-input"
              value={templateDraft.content}
              onChange={(event) => setTemplateDraft((current) =>
                current ? { ...current, content: event.target.value } : current
              )}
              disabled={savingTemplate}
            />
            {templateError && <p className="create-entry-error" role="alert">{templateError}</p>}
            <div className="create-entry-actions">
              <button type="button" onClick={() => setTemplateDraft(null)} disabled={savingTemplate}>
                Annuler
              </button>
              <button className="primary" type="submit" disabled={savingTemplate}>
                {savingTemplate ? 'Enregistrement…' : 'Enregistrer le modèle'}
              </button>
            </div>
          </form>
        </div>
      )}
      {renameDraft && (
        <div
          className="create-entry-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !renamingEntry) setRenameDraft(null)
          }}
        >
          <form
            className="create-entry-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-entry-title"
            onSubmit={(event) => void renameEntry(event)}
          >
            <h2 id="rename-entry-title">
              Renommer {renameDraft.entry.kind === 'directory' ? 'le dossier' : 'le fichier'}
            </h2>
            <label htmlFor="rename-entry-name">Nouveau nom</label>
            <input
              id="rename-entry-name"
              autoFocus
              value={renameDraft.name}
              onChange={(event) => setRenameDraft((current) =>
                current ? { ...current, name: event.target.value } : current
              )}
              aria-describedby={renameEntryError ? 'rename-entry-error' : undefined}
              aria-invalid={Boolean(renameEntryError)}
              disabled={renamingEntry}
            />
            {renameEntryError && (
              <p className="create-entry-error" id="rename-entry-error" role="alert">
                {renameEntryError}
              </p>
            )}
            <div className="create-entry-actions">
              <button
                type="button"
                onClick={() => setRenameDraft(null)}
                disabled={renamingEntry}
              >Annuler</button>
              <button className="primary" type="submit" disabled={renamingEntry}>
                {renamingEntry ? 'Renommage…' : 'Renommer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
