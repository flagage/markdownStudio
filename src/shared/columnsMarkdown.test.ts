import { Marked } from 'marked'
import { describe, expect, it } from 'vitest'
import { markedColumnsExtension } from './columnsMarkdown'

function renderMarkdown(markdown: string): string {
  return new Marked(markedColumnsExtension).parse(markdown) as string
}

describe('markedColumnsExtension', () => {
  it('renders two columns and parses Markdown inside each column', () => {
    const html = renderMarkdown([
      '::: columns',
      '::: column',
      '**Décisions**',
      '- Première',
      '::: column',
      'Deuxième',
      ':::'
    ].join('\n'))

    expect(html).toContain('<table class="markdown-columns">')
    expect(html).toContain('<td class="markdown-column"><p><strong>Décisions</strong></p>')
    expect(html).toContain('<li>Première</li>')
    expect(html).toContain('<td class="markdown-column"><p>Deuxième</p>')
    expect(html.match(/class="markdown-column"/g)).toHaveLength(2)
  })

  it('does not treat column markers inside fenced code as structural markers', () => {
    const html = renderMarkdown([
      '::: columns',
      '::: column',
      '```md',
      '::: column',
      '```',
      'Texte gauche',
      '::: column',
      'Texte droite',
      ':::'
    ].join('\n'))

    expect(html.match(/class="markdown-column"/g)).toHaveLength(2)
    expect(html).toContain('<code class="language-md">::: column\n</code>')
    expect(html).toContain('Texte gauche')
    expect(html).toContain('Texte droite')
  })

  it('does not render malformed blocks as a two-column table', () => {
    const html = renderMarkdown([
      '::: columns',
      '::: column',
      'Un seul bloc',
      ':::'
    ].join('\n'))

    expect(html).not.toContain('markdown-columns')
    expect(html).toContain('Un seul bloc')
  })
})
