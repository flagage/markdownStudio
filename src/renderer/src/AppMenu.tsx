import { useEffect, useRef, useState } from 'react'
import Icon, { type IconName } from './Icons'

interface AppMenuProps {
  hasWorkspace: boolean
  hasDocument: boolean
  moveMode: boolean
  onNewFile: () => void
  onNewFolder: () => void
  onOpenFile: () => void
  onOpenFolder: () => void
  onOpenRecent: (filePath: string) => void
  onTemplates: () => void
  onToggleMoveMode: () => void
  onPrint: () => void
  onExport: (format: 'pdf' | 'docx' | 'eml') => void
  onPublishWordPress: () => void
  onWordPressSettings: () => void
}

interface MenuItem {
  icon: IconName
  label: string
  shortcut?: string
  disabled?: boolean
  selected?: boolean
  action: () => void
}

export default function AppMenu(props: AppMenuProps) {
  const [open, setOpen] = useState(false)
  const [recentFiles, setRecentFiles] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void window.workspace.recentFiles().then((files) => {
      if (!cancelled) setRecentFiles(files)
    }).catch(() => {
      if (!cancelled) setRecentFiles([])
    })
    panelRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => {
      cancelled = true
      window.removeEventListener('pointerdown', closeOnOutsidePointer)
    }
  }, [open])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      containerRef.current?.querySelector<HTMLButtonElement>('.app-menu-button')?.focus()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []
    )
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'ArrowDown'
      ? items[(index + 1) % items.length]
      : items[(index - 1 + items.length) % items.length]
    next?.focus()
  }

  const fileItems: MenuItem[] = [
    { icon: 'filePlus', label: 'Nouveau fichier…', disabled: !props.hasWorkspace, action: props.onNewFile },
    { icon: 'folderPlus', label: 'Nouveau dossier…', disabled: !props.hasWorkspace, action: props.onNewFolder },
    { icon: 'fileOpen', label: 'Ouvrir un fichier…', shortcut: 'Ctrl O', action: props.onOpenFile },
    { icon: 'folderOpen', label: 'Ouvrir un dossier…', action: props.onOpenFolder },
    { icon: 'template', label: 'Modèles…', action: props.onTemplates },
    {
      icon: 'move',
      label: props.moveMode ? 'Terminer le déplacement' : 'Déplacer des éléments',
      disabled: !props.hasWorkspace,
      selected: props.moveMode,
      action: props.onToggleMoveMode
    }
  ]
  const documentItems: MenuItem[] = [
    { icon: 'printer', label: 'Imprimer…', shortcut: 'Ctrl P', disabled: !props.hasDocument, action: props.onPrint },
    { icon: 'filePdf', label: 'Exporter en PDF…', disabled: !props.hasDocument, action: () => props.onExport('pdf') },
    { icon: 'fileWord', label: 'Exporter en Word…', disabled: !props.hasDocument, action: () => props.onExport('docx') },
    { icon: 'mail', label: 'Exporter en e-mail…', disabled: !props.hasDocument, action: () => props.onExport('eml') },
    { icon: 'globe', label: 'Brouillon WordPress', disabled: !props.hasDocument, action: props.onPublishWordPress },
    { icon: 'settings', label: 'Réglages WordPress…', action: props.onWordPressSettings }
  ]

  function renderItems(items: MenuItem[]) {
    return items.map((item) => (
      <button
        key={item.label}
        type="button"
        role="menuitem"
        className={item.selected ? 'selected' : ''}
        disabled={item.disabled}
        onClick={() => run(item.action)}
      >
        <Icon name={item.icon} />
        <span className="app-menu-label">{item.label}</span>
        {item.shortcut && <kbd>{item.shortcut}</kbd>}
      </button>
    ))
  }

  return (
    <div className="app-menu" ref={containerRef}>
      <button
        type="button"
        className={`app-menu-button ${open ? 'open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="menu" />
        Menu
      </button>
      {open && (
        <div className="app-menu-panel" role="menu" aria-label="Menu de l’application" ref={panelRef} onKeyDown={moveFocus}>
          <div className="app-menu-columns">
            <div className="app-menu-section">
              <div className="app-menu-heading">Fichiers</div>
              {renderItems(fileItems)}
            </div>
            <div className="app-menu-section">
              <div className="app-menu-heading">Document actif</div>
              {renderItems(documentItems)}
            </div>
          </div>
          <div className="app-menu-recent">
            <div className="app-menu-heading">
              Fichiers récents
              {recentFiles.length > 0 && (
                <button
                  type="button"
                  className="app-menu-clear"
                  onClick={() => {
                    void window.workspace.clearRecentFiles().then(() => setRecentFiles([]))
                  }}
                >Effacer</button>
              )}
            </div>
            {recentFiles.length > 0 ? recentFiles.map((filePath) => {
              const separatorIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
              return (
                <button
                  key={filePath}
                  type="button"
                  role="menuitem"
                  title={filePath}
                  onClick={() => run(() => props.onOpenRecent(filePath))}
                >
                  <Icon name="clock" />
                  <span className="app-menu-label">{filePath.slice(separatorIndex + 1)}</span>
                  <span className="app-menu-path">{filePath.slice(0, separatorIndex)}</span>
                </button>
              )
            }) : <p className="app-menu-empty">Aucun fichier récent</p>}
          </div>
        </div>
      )}
    </div>
  )
}
