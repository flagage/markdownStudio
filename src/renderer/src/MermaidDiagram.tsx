import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { getMermaidSyntaxHelp } from './mermaidTemplates'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict'
})

let diagramCounter = 0

function splitChartValues(values: string): string[] {
  return values.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^,]+/g)?.map((value) => value.trim()) ?? []
}

export function prepareXyChart(chart: string): { chart: string; warning: string | null } {
  if (!/^\s*xychart-beta\b/im.test(chart)) return { chart, warning: null }

  const axisMatch = chart.match(/^(\s*x-axis\s+\[)([^\]]*)(\])/im)
  if (!axisMatch) return { chart, warning: null }

  const categories = splitChartValues(axisMatch[2])
  const seriesMatches = [...chart.matchAll(/^(\s*(?:bar|line)\s+\[)([^\]]*)(\])/gim)]
  if (categories.length === 0 || seriesMatches.length === 0) return { chart, warning: null }

  const seriesLengths = seriesMatches.map(([, , values]) => splitChartValues(values).length)
  const pointCount = Math.min(categories.length, ...seriesLengths)
  if (seriesLengths.every((length) => length === categories.length)) return { chart, warning: null }

  const normalizedChart = chart
    .replace(axisMatch[0], `${axisMatch[1]}${categories.slice(0, pointCount).join(',')}${axisMatch[3]}`)
    .replace(/^(\s*(?:bar|line)\s+\[)([^\]]*)(\])/gim, (match, prefix: string, values: string, suffix: string) => {
      const points = splitChartValues(values)
      return `${prefix}${points.slice(0, pointCount).join(',')}${suffix}`
    })

  return {
    chart: normalizedChart,
    warning: `Le graphique affiche les ${pointCount} premiers points, jusqu’à « ${categories[pointCount - 1] ?? ''} ». Certaines séries n’ont pas de valeur pour tous les mois de l’axe X.`
  }
}

export default function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [theme, setTheme] = useState<'default' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default'
  )
  const diagramType = getMermaidSyntaxHelp(chart)?.templateId
  const [zoom, setZoom] = useState(() => diagramType === 'gantt' ? 1.2 : 1)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setZoom(diagramType === 'gantt' ? 1.2 : 1)
  }, [diagramType])

  useEffect(() => {
    if (!expanded) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [expanded])

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const selectedTheme = (event as CustomEvent<'light' | 'dark'>).detail
      setTheme(selectedTheme === 'dark' ? 'dark' : 'default')
    }
    window.addEventListener('markdown-studio-theme-change', onThemeChange)
    return () => window.removeEventListener('markdown-studio-theme-change', onThemeChange)
  }, [])

  useEffect(() => {
    let active = true
    const render = async () => {
      const id = `mermaid-${++diagramCounter}`
      const prepared = prepareXyChart(chart)
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme,
          securityLevel: 'strict'
        })
        const { svg } = await mermaid.render(id, prepared.chart)
        if (active && containerRef.current) {
          if (/[=,\s](?:NaN|Infinity)(?=[,\s"]|$)/.test(svg)) {
            containerRef.current.innerHTML = ''
            setError('Mermaid a produit un diagramme invalide. Vérifie que les données de chaque série correspondent à celles de l’axe X.')
            setWarning(null)
            return
          }
          containerRef.current.innerHTML = svg
          setError(null)
          setWarning(prepared.warning)
        }
      } catch (reason) {
        if (active) {
          if (containerRef.current) containerRef.current.innerHTML = ''
          setError(reason instanceof Error ? reason.message : String(reason))
          setWarning(null)
        }
      }
    }
    void render()
    return () => {
      active = false
    }
  }, [chart, theme])

  return (
    <div className={`diagram ${diagramType === 'gantt' ? 'diagram-gantt' : ''} ${expanded ? 'diagram-expanded' : ''}`}>
      <div className="diagram-toolbar" role="toolbar" aria-label="Affichage du diagramme">
        <button type="button" onClick={() => setZoom((current) => Math.max(0.5, current - 0.1))} aria-label="Réduire le diagramme" title="Réduire">−</button>
        <span>{Math.round(zoom * 100)} %</span>
        <button type="button" onClick={() => setZoom((current) => Math.min(2, current + 0.1))} aria-label="Agrandir le diagramme" title="Agrandir">+</button>
        <button type="button" onClick={() => setZoom(1)} title="Ajuster à la largeur">Ajuster</button>
        <button type="button" className="diagram-expand-button" onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Réduire' : 'Plein écran'}
        </button>
      </div>
      <div className="diagram-viewport">
        {error ? (
          <pre className="diagram-error">Erreur Mermaid : {error}</pre>
        ) : (
          <>
            <div className="diagram-canvas" style={{ width: `${zoom * 100}%` }}>
              <div ref={containerRef} className="diagram-output" />
            </div>
            {warning && <p className="diagram-warning">{warning}</p>}
          </>
        )}
      </div>
    </div>
  )
}
