import { Marked, type Tokens } from 'marked'
import { markedColumnsExtension } from './columnsMarkdown'

export interface ExportDiagram {
  code: string
  image: string
  width: number
}

export function isMermaidCodeBlock(token: Tokens.Code): boolean {
  return token.lang?.match(/^\S*/)?.[0].toLowerCase() === 'mermaid'
}

// Le renderer et le process principal doivent découper le Markdown de la même façon
// pour que le code d’un diagramme rendu corresponde au bloc remplacé à l’export.
export function createExportMarked(renderCode: (token: Tokens.Code) => string | false): Marked {
  return new Marked(markedColumnsExtension, {
    gfm: true,
    renderer: {
      code: renderCode
    }
  })
}
