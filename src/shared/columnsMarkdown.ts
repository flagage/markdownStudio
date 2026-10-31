import type { MarkdownToken, MarkdownTokenizer } from '@tiptap/core'
import type { MarkedExtension, Tokens } from 'marked'
import { marked } from 'marked'

interface MarkdownColumnsToken extends MarkdownToken {
  type: 'markdownColumns'
  raw: string
  columns: string[]
  columnTokens: MarkdownToken[][]
}

interface MarkedColumnsToken extends Tokens.Generic {
  type: 'markdownColumns'
  columns: string[]
}

function isMarkdownColumnsToken(
  token: Tokens.Generic
): token is MarkedColumnsToken {
  return token.type === 'markdownColumns' &&
    'columns' in token &&
    Array.isArray(token.columns)
}

function tokenizeColumnsSource(source: string): MarkedColumnsToken | undefined {
  const lines = source.match(/[^\n]*(?:\n|$)/g) ?? []
  let offset = 0
  let fence: { marker: '`' | '~'; length: number } | null = null
  const columnMarkers: Array<{ start: number; end: number }> = []
  let closingOffset = -1
  let closingEnd = -1

  if (!/^ {0,3}::: columns[ \t]*\r?\n/.test(lines[0] ?? '')) return undefined

  for (const line of lines) {
    if (!line) continue
    const lineContent = line.replace(/\r?\n$/, '')
    const fenceMatch = lineContent.match(/^ {0,3}(`{3,}|~{3,})/)
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.marker &&
        fenceMatch[1].length >= fence.length &&
        /^ {0,3}(?:`{3,}|~{3,})[ \t]*$/.test(lineContent)) {
        fence = null
      }
      offset += line.length
      continue
    }
    if (fenceMatch) {
      fence = { marker: fenceMatch[1][0] as '`' | '~', length: fenceMatch[1].length }
      offset += line.length
      continue
    }
    if (/^ {0,3}::: column[ \t]*$/.test(lineContent)) {
      columnMarkers.push({ start: offset, end: offset + line.length })
    } else if (/^ {0,3}:::[ \t]*$/.test(lineContent)) {
      closingOffset = offset
      closingEnd = offset + line.length
      break
    }
    offset += line.length
  }

  if (closingOffset < 0 || columnMarkers.length !== 2) return undefined

  const columns = columnMarkers.map((marker, index) => {
    const end = columnMarkers[index + 1]?.start ?? closingOffset
    return source.slice(marker.end, end)
      .replace(/^(?:[ \t]*\r?\n)+/, '')
      .replace(/(?:\r?\n[ \t]*)+$/, '')
  })
  return {
    type: 'markdownColumns',
    raw: source.slice(0, closingEnd),
    columns
  }
}

export const markdownColumnsTokenizer: MarkdownTokenizer = {
  name: 'markdownColumns',
  level: 'block',
  start: '::: columns',
  tokenize: (source, _tokens, lexer) => {
    const token = tokenizeColumnsSource(source)
    return token
      ? {
          ...token,
          columnTokens: token.columns.map((column) => lexer.blockTokens(column))
        }
      : undefined
  }
}

export const markedColumnsExtension: MarkedExtension = {
  extensions: [{
    name: 'markdownColumns',
    level: 'block',
    start: (source) => source.indexOf('::: columns'),
    tokenizer: (source) => tokenizeColumnsSource(source),
    renderer(token) {
      if (!isMarkdownColumnsToken(token)) return false
      const columns = token.columns.map((column) =>
        `<td class="markdown-column">${this.parser.parse(marked.lexer(column))}</td>`
      ).join('')
      return `<table class="markdown-columns"><tbody><tr>${columns}</tr></tbody></table>`
    }
  }]
}
