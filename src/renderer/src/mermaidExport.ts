import mermaid from 'mermaid'
import { createExportMarked, isMermaidCodeBlock, type ExportDiagram } from '../../shared/exportDiagrams'
import { prepareXyChart } from './MermaidDiagram'

const exportPixelRatio = 2
const maximumCanvasSide = 8000
let exportDiagramCounter = 0

function findMermaidCodes(markdown: string): string[] {
  const codes = new Set<string>()
  void createExportMarked((token) => {
    if (isMermaidCodeBlock(token)) codes.add(token.text)
    return false
  }).parse(markdown)
  return [...codes]
}

async function renderDiagramImage(code: string): Promise<ExportDiagram> {
  const { svg } = await mermaid.render(
    `mermaid-export-${++exportDiagramCounter}`,
    prepareXyChart(code).chart
  )
  if (/[=,\s](?:NaN|Infinity)(?=[,\s"]|$)/.test(svg)) {
    throw new Error('Mermaid a produit un diagramme invalide.')
  }

  const svgElement = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
  const viewBox = (svgElement.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
  const width = viewBox[2] || Number.parseFloat(svgElement.getAttribute('width') ?? '')
  const height = viewBox[3] || Number.parseFloat(svgElement.getAttribute('height') ?? '')
  if (!(width > 0) || !(height > 0)) throw new Error('Les dimensions du diagramme sont invalides.')

  svgElement.setAttribute('width', String(width))
  svgElement.setAttribute('height', String(height))
  svgElement.removeAttribute('style')
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(svgElement)
  )}`
  await image.decode()

  const scale = Math.min(exportPixelRatio, maximumCanvasSide / width, maximumCanvasSide / height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Le diagramme ne peut pas être converti en image.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return { code, image: canvas.toDataURL('image/png'), width: Math.round(width) }
}

export async function renderMermaidDiagramsForExport(markdown: string): Promise<{
  diagrams: ExportDiagram[]
  failedCount: number
}> {
  const codes = findMermaidCodes(markdown)
  if (codes.length === 0) return { diagrams: [], failedCount: 0 }

  // Des libellés en texte SVG (sans HTML) permettent de convertir le diagramme en PNG :
  // un canvas qui dessine un SVG contenant du HTML ne peut plus être exporté.
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
    htmlLabels: false
  })
  const diagrams: ExportDiagram[] = []
  let failedCount = 0
  for (const code of codes) {
    try {
      diagrams.push(await renderDiagramImage(code))
    } catch {
      failedCount += 1
    }
  }
  return { diagrams, failedCount }
}
