// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MermaidDiagram from './MermaidDiagram'

const { renderDiagram } = vi.hoisted(() => ({
  renderDiagram: vi.fn()
}))

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: renderDiagram
  }
}))

describe('MermaidDiagram', () => {
  let container: HTMLDivElement
  let root: Root | undefined

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    renderDiagram.mockImplementation(async (_id: string, chart: string) => {
      if (chart === 'invalid') throw new Error('Invalid Mermaid syntax')
      return { svg: '<svg><text>Valid diagram</text></svg>' }
    })
  })

  afterEach(() => {
    if (root) act(() => root?.unmount())
    container.remove()
    root = undefined
    renderDiagram.mockReset()
    vi.unstubAllGlobals()
  })

  it('clears a parse error after the Mermaid source is corrected', async () => {
    await act(async () => {
      root?.render(<MermaidDiagram chart="invalid" />)
    })

    expect(container.querySelector('.diagram-error')?.textContent).toContain('Invalid Mermaid syntax')
    expect(container.querySelector('.diagram-canvas')?.hasAttribute('hidden')).toBe(true)

    await act(async () => {
      root?.render(<MermaidDiagram chart="graph TD; A-->B" />)
    })

    expect(container.querySelector('.diagram-error')).toBeNull()
    expect(container.querySelector('.diagram-canvas')?.hasAttribute('hidden')).toBe(false)
    expect(container.querySelector('.diagram-output svg')).not.toBeNull()
  })
})
