import { get as getEmoji } from 'node-emoji'

const openingFencePattern = /^ {0,3}(`{3,}|~{3,})/

function replaceShortcodesOutsideInlineCode(line: string): string {
  const pattern = /(`+)[\s\S]*?\1|(?<![\\\w:]):([a-z0-9_+-]+):(?![\w:])/gi
  return line.replace(pattern, (match, _codeTicks: string | undefined, name: string | undefined) =>
    name ? getEmoji(name) ?? match : match
  )
}

export function convertEmojiShortcodes(markdown: string): string {
  let fence: { marker: '`' | '~'; length: number } | null = null

  return markdown.split('\n').map((line) => {
    const fenceMatch = line.match(openingFencePattern)
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

    return fence ? line : replaceShortcodesOutsideInlineCode(line)
  }).join('\n')
}

export function getEmojiShortcode(name: string): string | undefined {
  return getEmoji(name)
}
