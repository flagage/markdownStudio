import { describe, expect, it } from 'vitest'
import { createExportMarked, isMermaidCodeBlock } from './exportDiagrams'

describe('isMermaidCodeBlock', () => {
  it('recognizes Mermaid language names without case sensitivity', () => {
    expect(isMermaidCodeBlock({
      type: 'code',
      raw: '```MERMAID\nflowchart LR\n```',
      lang: 'MERMAID',
      text: 'flowchart LR'
    })).toBe(true)
  })

  it('does not mistake another language or an empty language for Mermaid', () => {
    expect(isMermaidCodeBlock({
      type: 'code',
      raw: '```mermaid-js\nflowchart LR\n```',
      lang: 'mermaid-js',
      text: 'flowchart LR'
    })).toBe(false)
    expect(isMermaidCodeBlock({
      type: 'code',
      raw: '```\nflowchart LR\n```',
      lang: '',
      text: 'flowchart LR'
    })).toBe(false)
  })
})

describe('createExportMarked', () => {
  it('visits Mermaid code blocks but ignores other code and inline code', () => {
    const diagrams: string[] = []
    const markdown = [
      'Inline ` ```mermaid fake ``` `',
      '```js',
      'const ignored = true',
      '```',
      '```Mermaid',
      'flowchart LR',
      '  A --> B',
      '```'
    ].join('\n')

    createExportMarked((token) => {
      if (!isMermaidCodeBlock(token)) return false
      diagrams.push(token.text)
      return false
    }).parse(markdown)

    expect(diagrams).toEqual(['flowchart LR\n  A --> B'])
  })

  it('finds Mermaid code blocks inside Markdown columns', () => {
    const diagrams: string[] = []
    const markdown = [
      '::: columns',
      '::: column',
      '```mermaid',
      'flowchart LR',
      '  A --> B',
      '```',
      '::: column',
      'Text',
      ':::'
    ].join('\n')

    createExportMarked((token) => {
      if (isMermaidCodeBlock(token)) diagrams.push(token.text)
      return false
    }).parse(markdown)

    expect(diagrams).toEqual(['flowchart LR\n  A --> B'])
  })
})
