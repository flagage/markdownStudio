import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import MarkdownEditor from './MarkdownEditor'

type Theme = 'light' | 'dark'

interface OpenDocument {
  path: string
  content: string
  savedContent: string
}

type NewEntryKind = 'file' | 'directory'

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
  const [error, setError] = useState<string | null>(null)
  const [moveMode, setMoveMode] = useState(false)
  const [draggedEntry, setDraggedEntry] = useState<WorkspaceEntry | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
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
    setCreateEntryError(null)
    setError(null)
  }

  function closeCreateEntry() {
    if (creatingEntry) return
    setNewEntryKind(null)
    setNewEntryName('')
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
      await window.workspace.create(directory, name, newEntryKind)
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
    </main>
  )
}
