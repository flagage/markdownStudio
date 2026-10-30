import { useEffect, useMemo, useState } from 'react'
import CodeBlock from '@tiptap/extension-code-block'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { InputRule, mergeAttributes } from '@tiptap/core'
import type { NodeViewProps } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import Image, { inputRegex as imageInputRegex } from '@tiptap/extension-image'
import type { ImageOptions } from '@tiptap/extension-image'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import MermaidDiagram from './MermaidDiagram'
import { getMermaidSyntaxHelp, mermaidTemplates } from './mermaidTemplates'

function MermaidCodeBlockView({ node }: NodeViewProps) {
  const [editing, setEditing] = useState(false)
  const isMermaid = node.attrs.language === 'mermaid'
  const syntaxHelp = isMermaid ? getMermaidSyntaxHelp(node.textContent) : null
  const syntaxExample = syntaxHelp
    ? mermaidTemplates.find(({ id }) => id === syntaxHelp.templateId)?.code
    : null

  return (
    <NodeViewWrapper className={`code-block-node ${isMermaid ? 'mermaid-node' : ''}`}>
      {isMermaid && !editing && (
        <div className="mermaid-preview">
          <div className="mermaid-heading">
            <span>DIAGRAMME MERMAID</span>
            <button type="button" onClick={() => setEditing(true)}>Modifier le code</button>
          </div>
          <MermaidDiagram chart={node.textContent} />
        </div>
      )}
      {isMermaid && editing ? (
        <>
          <div className="mermaid-heading mermaid-edit-heading">
            <span>MODIFICATION DU DIAGRAMME</span>
            <button type="button" onClick={() => setEditing(false)}>Terminer</button>
          </div>
          <div className="mermaid-edit-layout">
            <section className="mermaid-code-pane">
              <div className="mermaid-pane-heading">Code Mermaid</div>
              <NodeViewContent className="code-block-content mermaid-code-content" />
            </section>
            <section className="mermaid-live-preview" aria-label="Aperçu Mermaid en direct">
              <div className="mermaid-pane-heading">Aperçu en direct</div>
              <MermaidDiagram chart={node.textContent} />
            </section>
          </div>
          <aside className="mermaid-syntax-help">
            <strong>Aide syntaxe — {syntaxHelp?.label ?? 'Mermaid'}</strong>
            <p>
              {syntaxHelp
                ? syntaxHelp.syntax.split('`').map((part, index) =>
                    index % 2 === 1 ? <code key={index}>{part}</code> : part
                  )
                : 'Commence par le mot-clé du type de diagramme, puis ajoute une instruction par ligne.'}
            </p>
            {syntaxHelp?.sections?.map((section, index) => (
              <details key={section.heading} open={index === 0}>
                <summary>{section.heading}</summary>
                <p>
                  {section.body.split('`').map((part, partIndex) =>
                    partIndex % 2 === 1 ? <code key={partIndex}>{part}</code> : part
                  )}
                </p>
                {section.example && <pre>{section.example.replaceAll('\\n', '\n')}</pre>}
              </details>
            ))}
            {syntaxExample && (
              <details>
                <summary>Voir un exemple complet pour ce type</summary>
                <pre>{syntaxExample}</pre>
              </details>
            )}
          </aside>
        </>
      ) : (
        <NodeViewContent className={`code-block-content ${isMermaid ? 'hidden-code' : ''}`} />
      )}
    </NodeViewWrapper>
  )
}

const MarkdownCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MermaidCodeBlockView)
  }
})

const MarkdownTaskItem = TaskItem.extend({
  addInputRules() {
    const taskListInputRule = new InputRule({
      find: /^\[([ xX])\]\s$/,
      handler: ({ state, range, match }) => {
        const $position = state.doc.resolve(range.to)
        let itemDepth = -1

        for (let depth = $position.depth; depth > 0; depth -= 1) {
          if (
            $position.node(depth).type.name === 'listItem' &&
            $position.node(depth - 1).type.name === 'bulletList'
          ) {
            itemDepth = depth
            break
          }
        }

        if (itemDepth < 0) return null

        const listPosition = $position.before(itemDepth - 1)
        const listNode = state.doc.nodeAt(listPosition)
        const taskListType = state.schema.nodes.taskList
        const taskItemType = state.schema.nodes.taskItem
        if (!listNode || !taskListType || !taskItemType) return null

        const itemPosition = $position.before(itemDepth)
        let targetItemIndex = -1
        let offset = 0
        for (let index = 0; index < listNode.childCount; index += 1) {
          const item = listNode.child(index)
          if (item.type.name !== 'listItem') return null
          if (listPosition + 1 + offset === itemPosition) targetItemIndex = index
          offset += item.nodeSize
        }
        if (targetItemIndex < 0) return null

        const tr = state.tr
        tr.delete(range.from, range.to)
        const updatedList = tr.doc.nodeAt(listPosition)
        if (!updatedList) return null

        const bulletListType = state.schema.nodes.bulletList
        if (!bulletListType) return null

        const previousItems = Array.from(
          { length: targetItemIndex },
          (_, index) => updatedList.child(index)
        )
        const nextItems = Array.from(
          { length: updatedList.childCount - targetItemIndex - 1 },
          (_, index) => updatedList.child(targetItemIndex + index + 1)
        )
        const targetItem = updatedList.child(targetItemIndex)
        const taskItem = taskItemType.create(
          { checked: match[1].toLowerCase() === 'x' },
          targetItem.content,
          targetItem.marks
        )
        const taskList = taskListType.create(updatedList.attrs, [taskItem], updatedList.marks)
        const replacementLists = []
        if (previousItems.length) {
          replacementLists.push(
            bulletListType.create(updatedList.attrs, previousItems, updatedList.marks)
          )
        }
        replacementLists.push(taskList)
        if (nextItems.length) {
          replacementLists.push(
            bulletListType.create(updatedList.attrs, nextItems, updatedList.marks)
          )
        }
        const precedingListSize = replacementLists[0] === taskList ? 0 : replacementLists[0].nodeSize
        const targetCursorPosition = listPosition + precedingListSize + 3
        tr.replaceWith(
          listPosition,
          listPosition + updatedList.nodeSize,
          Fragment.fromArray(replacementLists)
        )
        tr.setSelection(TextSelection.create(tr.doc, targetCursorPosition))
      }
    })

    return [taskListInputRule, ...(this.parent?.() ?? [])]
  }
})

const MarkdownImage = Image.extend<ImageOptions & { baseUrl: string }>({
  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      resize: false,
      ...this.parent?.(),
      baseUrl: ''
    }
  },
  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src
    const absoluteSrc = typeof src === 'string' &&
      !/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(src) &&
      this.options.baseUrl
      ? new URL(src, this.options.baseUrl).href
      : src
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { src: absoluteSrc })
    ]
  },
  addInputRules() {
    return [
      new InputRule({
        find: imageInputRegex,
        handler: ({ state, range, match }) => {
          const [, , alt, src, title] = match
          const image = this.type.create({ src, alt, title })
          const { tr } = state
          tr.insert(range.from - 1, image)
          tr.delete(tr.mapping.map(range.from), tr.mapping.map(range.to))
        }
      })
    ]
  }
})

function normalizeCodeFenceIndentation(markdown: string): string {
  return markdown.replace(/^ {1,3}(`{3,}|~{3,})([^\n]*)$/gm, '$1$2')
}

function normalizeAtxHeadingSpacing(markdown: string): string {
  let fence: { marker: '`' | '~'; length: number } | null = null

  return markdown.split('\n').map((line) => {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~'
      if (!fence) {
        fence = { marker, length: fenceMatch[1].length }
      } else if (
        marker === fence.marker &&
        fenceMatch[1].length >= fence.length &&
        /^ {0,3}(?:`{3,}|~{3,})[ \t]*$/.test(line)
      ) {
        fence = null
      }
      return line
    }

    if (!fence) {
      return line.replace(/^( {0,3})(#{1,6})(?!#)(\S.*)$/, '$1$2 $3')
    }
    return line
  }).join('\n')
}

export default function MarkdownEditor({
  value,
  onChange,
  documentPath,
  external,
  imageBaseUrl
}: {
  value: string
  onChange: (markdown: string) => void
  documentPath: string
  external: boolean
  imageBaseUrl: string
}) {
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    inTable: boolean
    hasSelection: boolean
  } | null>(null)
  const [contextMenuError, setContextMenuError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [mermaidPickerOpen, setMermaidPickerOpen] = useState(false)
  const [selectedMermaidTemplateId, setSelectedMermaidTemplateId] = useState('flowchart-v2')
  const [rawMarkdownMode, setRawMarkdownMode] = useState(false)
  const extensions = useMemo(
    () => [
      StarterKit.configure({ codeBlock: false, link: { markdownLinks: true } }),
      MarkdownCodeBlock,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      MarkdownTaskItem.configure({ nested: true, HTMLAttributes: { class: 'task-item' } }),
      MarkdownImage.configure({ baseUrl: imageBaseUrl }),
      Markdown
    ],
    [imageBaseUrl]
  )

  const editor = useEditor({
    extensions,
    content: normalizeCodeFenceIndentation(value),
    contentType: 'markdown',
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getMarkdown()),
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'true',
        'aria-label': 'Éditeur Markdown'
      }
    }
  }, [extensions])

  useEffect(() => {
    if (editor && !rawMarkdownMode && editor.getMarkdown() !== value) {
      editor.commands.setContent(normalizeCodeFenceIndentation(value), {
        contentType: 'markdown',
        emitUpdate: false
      })
    }
  }, [editor, rawMarkdownMode, value])

  useEffect(() => {
    if (!contextMenu && !mermaidPickerOpen) return
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.editor-context-menu')) {
        setContextMenu(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
        setMermaidPickerOpen(false)
      }
    }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [contextMenu, mermaidPickerOpen])

  if (!editor) return <div className="editor-loading">Préparation de l’éditeur…</div>

  function showContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    const position = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
    const clickedPosition = position?.pos
    const clickedResolvedPosition =
      clickedPosition === undefined ? null : editor.state.doc.resolve(clickedPosition)
    let clickedTablePosition: number | null = null
    if (clickedResolvedPosition) {
      for (let depth = clickedResolvedPosition.depth; depth > 0; depth -= 1) {
        if (clickedResolvedPosition.node(depth).type.name === 'table') {
          clickedTablePosition = clickedResolvedPosition.before(depth)
          break
        }
      }
    }

    const { selection } = editor.state
    const selectionTablePositions = [selection.$from, selection.$to].map(($position) => {
      for (let depth = $position.depth; depth > 0; depth -= 1) {
        if ($position.node(depth).type.name === 'table') return $position.before(depth)
      }
      return null
    })
    const selectionIsInClickedTable =
      clickedTablePosition !== null &&
      selectionTablePositions[0] === clickedTablePosition &&
      selectionTablePositions[1] === clickedTablePosition

    if (clickedPosition !== undefined && (selection.empty || (clickedTablePosition !== null && !selectionIsInClickedTable))) {
      editor.commands.setTextSelection(clickedPosition)
    }
    const inTable = clickedTablePosition !== null
    const hasSelection = !editor.state.selection.empty
    setContextMenuError(null)
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 280)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - (inTable ? 520 : 245))),
      inTable,
      hasSelection
    })
  }

  async function copySelection(cut = false) {
    try {
      const { selection } = editor.state
      const selectedText = selection.content().content.textBetween(
        0,
        selection.content().content.size,
        '\n\n'
      )
      await navigator.clipboard.writeText(selectedText)
      if (cut) editor.chain().focus().deleteSelection().run()
      setContextMenuError(null)
      setContextMenu(null)
    } catch (reason) {
      setContextMenuError(
        `Impossible de ${cut ? 'couper' : 'copier'} la sélection : ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        editor.view.focus()
        editor.view.pasteText(text)
      }
      setContextMenuError(null)
      setContextMenu(null)
    } catch (reason) {
      setContextMenuError(
        `Impossible de lire le presse-papiers : ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
    }
  }

  function runTableAction(action: () => boolean) {
    action()
    setContextMenu(null)
  }

  function insertMermaidDiagram() {
    const template = mermaidTemplates.find(({ id }) => id === selectedMermaidTemplateId)
    if (!template) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'codeBlock',
        attrs: { language: 'mermaid' },
        content: [{ type: 'text', text: template.code }]
      })
      .run()
    setContextMenu(null)
    setMermaidPickerOpen(false)
  }

  async function insertImageFromFile() {
    try {
      const image = await window.workspace.selectImage(documentPath, external)
      if (!image) return
      editor.chain().focus().setImage({ src: image.relativePath, alt: image.name }).run()
      setImageError(null)
    } catch (reason) {
      setImageError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  function toggleMarkdownMode() {
    if (!rawMarkdownMode) {
      setRawMarkdownMode(true)
      return
    }

    const markdown = normalizeAtxHeadingSpacing(value)
    if (markdown !== value) onChange(markdown)
    editor.commands.setContent(normalizeCodeFenceIndentation(markdown), {
      contentType: 'markdown',
      emitUpdate: false
    })
    setRawMarkdownMode(false)
  }

  return (
    <div className="wysiwyg-editor">
      <div className="format-toolbar" role="toolbar" aria-label="Mise en forme">
        {!rawMarkdownMode && (
          <>
            <button type="button" title="Titre" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
            <button type="button" title="Sous-titre" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
            <span className="toolbar-separator" />
            <button type="button" title="Gras" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><strong>G</strong></button>
            <button type="button" title="Italique" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
            <button type="button" title="Barré" className={editor.isActive('strike') ? 'active' : ''} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></button>
            <span className="toolbar-separator" />
            <button type="button" title="Liste à puces" onClick={() => editor.chain().focus().toggleBulletList().run()}>• Liste</button>
            <button type="button" title="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Liste</button>
            <button type="button" title="Citation" onClick={() => editor.chain().focus().toggleBlockquote().run()}>Citation</button>
            <button type="button" title="Bloc de code" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>&lt;/&gt;</button>
            <button type="button" title="Séparateur" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</button>
            <button type="button" title="Insérer une image" onClick={() => void insertImageFromFile()}>Image</button>
          </>
        )}
        <button
          type="button"
          className={`mode-toggle ${rawMarkdownMode ? 'active' : ''}`}
          title={rawMarkdownMode ? 'Revenir à l’édition visuelle' : 'Éditer le Markdown brut'}
          aria-pressed={rawMarkdownMode}
          onClick={toggleMarkdownMode}
        >
          {rawMarkdownMode ? 'Mode visuel' : 'Markdown brut'}
        </button>
      </div>
      {imageError && <div className="image-error" role="alert">{imageError}</div>}
      <div className={`writing-surface ${rawMarkdownMode ? 'raw-markdown-surface' : ''}`}>
        {rawMarkdownMode ? (
          <textarea
            className="raw-markdown-editor"
            aria-label="Markdown brut"
            spellCheck={false}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <div className="visual-editor-surface" onContextMenu={showContextMenu}>
            <EditorContent editor={editor} />
            {contextMenu && (
              <div
                className="editor-context-menu"
                role="menu"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                {contextMenu.inTable && (
                  <div className="context-menu-group">
                    <div className="context-menu-heading">Tableau</div>
                    <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => runTableAction(() => editor.chain().focus().addRowBefore().run())}>
                      Ajouter une ligne au-dessus
                    </button>
                    <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => runTableAction(() => editor.chain().focus().addRowAfter().run())}>
                      Ajouter une ligne en dessous
                    </button>
                    <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => runTableAction(() => editor.chain().focus().deleteRow().run())}>
                      Retirer la ligne
                    </button>
                    <div className="context-menu-divider" />
                    <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => runTableAction(() => editor.chain().focus().addColumnBefore().run())}>
                      Ajouter une colonne à gauche
                    </button>
                    <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => runTableAction(() => editor.chain().focus().addColumnAfter().run())}>
                      Ajouter une colonne à droite
                    </button>
                    <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => runTableAction(() => editor.chain().focus().deleteColumn().run())}>
                      Retirer la colonne
                    </button>
                    <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => runTableAction(() => editor.chain().focus().deleteTable().run())}>
                      Supprimer le tableau
                    </button>
                  </div>
                )}
                <div className="context-menu-group">
                  <div className="context-menu-heading">Presse-papiers</div>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!contextMenu.hasSelection}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void copySelection()}
                  >
                    Copier
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!contextMenu.hasSelection}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void copySelection(true)}
                  >
                    Couper
                  </button>
                  <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => void pasteFromClipboard()}>
                    Coller
                  </button>
                </div>
                <div className="context-menu-divider" />
                <div className="context-menu-group">
                  <div className="context-menu-heading">Insertion</div>
                  <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => runTableAction(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>
                    Insérer un tableau
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSelectedMermaidTemplateId('flowchart-v2')
                      setContextMenu(null)
                      setMermaidPickerOpen(true)
                    }}
                  >
                    <span className="context-menu-icon">◇</span>
                    Insérer un modèle Mermaid…
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setContextMenu(null)
                      void insertImageFromFile()
                    }}
                  >
                    Insérer une image…
                  </button>
                </div>
                {contextMenuError && <div className="context-menu-error" role="alert">{contextMenuError}</div>}
              </div>
            )}
            {mermaidPickerOpen && (
              <div className="mermaid-picker-backdrop">
                <section
                  className="mermaid-picker"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="mermaid-picker-title"
                >
                  <div className="mermaid-picker-header">
                    <div>
                      <h2 id="mermaid-picker-title">Insérer un diagramme Mermaid</h2>
                      <p>Choisis un type de diagramme pour insérer son exemple modifiable.</p>
                    </div>
                    <button
                      type="button"
                      className="mermaid-picker-close"
                      aria-label="Fermer"
                      onClick={() => setMermaidPickerOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <label className="mermaid-template-label" htmlFor="mermaid-template">
                    Modèle
                  </label>
                  <select
                    id="mermaid-template"
                    className="mermaid-template-select"
                    value={selectedMermaidTemplateId}
                    onChange={(event) => setSelectedMermaidTemplateId(event.target.value)}
                  >
                    {Array.from(new Set(mermaidTemplates.map(({ category }) => category))).map((category) => (
                      <optgroup key={category} label={category}>
                        {mermaidTemplates
                          .filter((template) => template.category === category)
                          .map((template) => (
                            <option key={template.id} value={template.id}>{template.label}</option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <pre className="mermaid-template-preview">
                    {mermaidTemplates.find(({ id }) => id === selectedMermaidTemplateId)?.code}
                  </pre>
                  <div className="mermaid-picker-actions">
                    <button type="button" onClick={() => setMermaidPickerOpen(false)}>Annuler</button>
                    <button type="button" className="primary" onClick={insertMermaidDiagram}>
                      Insérer le modèle
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
