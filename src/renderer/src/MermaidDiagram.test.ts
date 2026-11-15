import { describe, expect, it } from 'vitest'
import { prepareXyChart } from './MermaidDiagram'

describe('prepareXyChart', () => {
  it('trims categories and series to the shortest length and reports the skipped points', () => {
    const chart = [
      'xychart-beta',
      '  x-axis [Jan, Feb, Mar]',
      '  bar [10, 20]',
      '  line [1, 2, 3]'
    ].join('\n')

    expect(prepareXyChart(chart)).toEqual({
      chart: [
        'xychart-beta',
        '  x-axis [Jan,Feb]',
        '  bar [10,20]',
        '  line [1,2]'
      ].join('\n'),
      warning: 'Le graphique affiche les 2 premiers points, jusqu’à « Feb ». Certaines séries n’ont pas de valeur pour tous les mois de l’axe X.'
    })
  })

  it('preserves quoted categories that contain commas when counting points', () => {
    const chart = [
      'xychart-beta',
      '  x-axis ["Jan, 1", Feb, Mar]',
      '  bar [10, 20]'
    ].join('\n')

    expect(prepareXyChart(chart).chart).toContain('x-axis ["Jan, 1",Feb]')
  })

  it('leaves charts with complete series unchanged and without a warning', () => {
    const chart = [
      'xychart-beta',
      '  x-axis [Jan, Feb]',
      '  bar [10, 20]',
      '  line [1, 2]'
    ].join('\n')

    expect(prepareXyChart(chart)).toEqual({ chart, warning: null })
  })

  it('leaves non-xy charts unchanged', () => {
    const chart = 'flowchart LR\n  A --> B'

    expect(prepareXyChart(chart)).toEqual({ chart, warning: null })
  })
})
