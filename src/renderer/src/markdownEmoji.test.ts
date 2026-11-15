import { describe, expect, it } from 'vitest'
import { convertEmojiShortcodes, getEmojiShortcode } from './markdownEmoji'

describe('convertEmojiShortcodes', () => {
  it('converts known shortcodes in Markdown text', () => {
    expect(convertEmojiShortcodes('C’est amusant :joy: et :+1:'))
      .toBe('C’est amusant 😂 et 👍')
  })

  it('leaves unknown, escaped, and code shortcodes unchanged', () => {
    const markdown = [
      'Unknown :not_a_real_emoji: and escaped \\:joy:',
      'Inline `:joy:` and ```:heart:```',
      '```md',
      ':joy:',
      '~~~',
      'Still inside the code block :smile:',
      '```',
      'Outside :smile:'
    ].join('\n')

    expect(convertEmojiShortcodes(markdown)).toBe([
      'Unknown :not_a_real_emoji: and escaped \\:joy:',
      'Inline `:joy:` and ```:heart:```',
      '```md',
      ':joy:',
      '~~~',
      'Still inside the code block :smile:',
      '```',
      'Outside 😄'
    ].join('\n'))
  })

  it('supports tilde fences and closing fences longer than the opener', () => {
    const markdown = '~~~md\n:joy:\n~~~~\n:joy:'

    expect(convertEmojiShortcodes(markdown)).toBe('~~~md\n:joy:\n~~~~\n😂')
  })
})

describe('getEmojiShortcode', () => {
  it('returns the emoji for a known shortcode', () => {
    expect(getEmojiShortcode('joy')).toBe('😂')
  })

  it('returns undefined for an unknown shortcode', () => {
    expect(getEmojiShortcode('not_a_real_emoji')).toBeUndefined()
  })
})
