import { useEffect } from 'react'

const syntaxGroups = [
  {
    title: 'Syntaxe de base',
    entries: [
      { name: 'Titres', markdown: '# Titre 1\n## Titre 2\n### Titre 3\n#### Titre 4\n##### Titre 5\n###### Titre 6', supported: true, preview: <><h1>Titre 1</h1><h2>Titre 2</h2><h3>Titre 3</h3><h4>Titre 4</h4><h5>Titre 5</h5><h6>Titre 6</h6></> },
      { name: 'Gras', markdown: '**texte en gras**', supported: true, preview: <strong>texte en gras</strong> },
      { name: 'Italique', markdown: '*texte en italique*', supported: true, preview: <em>texte en italique</em> },
      { name: 'Citation', markdown: '> Une citation', supported: true, preview: <blockquote>Une citation</blockquote> },
      { name: 'Liste numérotée', markdown: '1. Premier élément\n2. Deuxième élément', supported: true, preview: <ol><li>Premier élément</li><li>Deuxième élément</li></ol> },
      { name: 'Liste à puces', markdown: '- Un élément\n- Un autre élément', supported: true, preview: <ul><li>Un élément</li><li>Un autre élément</li></ul> },
      { name: 'Code en ligne', markdown: '`code`', supported: true, preview: <code>code</code> },
      { name: 'Séparateur horizontal', markdown: '---', supported: true, preview: <hr /> },
      { name: 'Lien', markdown: '[Markdown Guide](https://www.markdownguide.org/)', supported: true, preview: <a href="https://www.markdownguide.org/">Markdown Guide</a> },
      { name: 'Image', markdown: '![Texte alternatif](image.png)', supported: true, preview: <span className="markdown-help-image">Image — Texte alternatif</span> }
    ]
  },
  {
    title: 'Syntaxe étendue',
    entries: [
      { name: 'Tableau', markdown: '| Nom | Valeur |\n| --- | --- |\n| Exemple | 42 |', supported: true, preview: <table><thead><tr><th>Nom</th><th>Valeur</th></tr></thead><tbody><tr><td>Exemple</td><td>42</td></tr></tbody></table> },
      { name: 'Bloc de code', markdown: '```js\nconsole.log(\"Bonjour\")\n```', supported: true, preview: <pre><code>console.log(\"Bonjour\")</code></pre> },
      { name: 'Note de bas de page', markdown: 'Une phrase avec une note.[^1]\\n\\n[^1]: Le texte de la note.', supported: false },
      { name: 'Identifiant de titre', markdown: '### Mon titre {#mon-id}', supported: false },
      { name: 'Liste de définitions', markdown: 'Terme\\n: Sa définition', supported: false },
      { name: 'Texte barré', markdown: '~~texte barré~~', supported: true, preview: <del>texte barré</del> },
      { name: 'Liste de tâches', markdown: '- [x] Tâche terminée\\n- [ ] Tâche à faire', supported: true, preview: <ul className="markdown-help-tasks"><li><input type="checkbox" checked readOnly /> Tâche terminée</li><li><input type="checkbox" readOnly /> Tâche à faire</li></ul> },
      { name: 'Emoji', markdown: 'C’est amusant ! :joy:', supported: true, preview: <>C’est amusant ! 😂</> },
      { name: 'Surlignage', markdown: 'Texte ==important==', supported: false },
      { name: 'Indice', markdown: 'H~2~O', supported: false },
      { name: 'Exposant', markdown: 'X^2^', supported: false }
    ]
  },
  {
    title: 'Markdown Studio',
    entries: [
      { name: 'Deux colonnes', markdown: '::: columns\\n::: column\\nTexte de gauche\\n::: column\\nTexte de droite\\n:::', supported: true, preview: <div className="markdown-help-columns"><span>Texte de gauche</span><span>Texte de droite</span></div> },
      { name: 'Diagramme Mermaid', markdown: '```mermaid\\nflowchart LR\\n  A --> B\\n```', supported: true, preview: <span>Diagramme Mermaid modifiable</span> }
    ]
  }
]

export default function MarkdownHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="markdown-help-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section
        className="markdown-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="markdown-help-title"
      >
        <header className="markdown-help-header">
          <div>
            <h2 id="markdown-help-title">Aide Markdown</h2>
            <p>Syntaxes reconnues par l’éditeur visuel et exemples de rendu.</p>
          </div>
          <button type="button" className="markdown-help-close" aria-label="Fermer" onClick={onClose}>×</button>
        </header>
        <p className="markdown-help-note">
          Les syntaxes « non prises en charge » restent visibles en mode Markdown brut,
          mais ne sont pas interprétées dans l’éditeur visuel.
        </p>
        {syntaxGroups.map((group) => (
          <section className="markdown-help-group" key={group.title}>
            <h3>{group.title}</h3>
            <div className="markdown-help-list">
              {group.entries.map((entry) => (
                <article className="markdown-help-entry" key={entry.name}>
                  <div className="markdown-help-entry-heading">
                    <h4>{entry.name}</h4>
                    <span className={entry.supported ? 'supported' : 'unsupported'}>
                      {entry.supported ? 'Pris en charge' : 'Non pris en charge'}
                    </span>
                  </div>
                  <pre><code>{entry.markdown.replaceAll('\\n', '\n')}</code></pre>
                  <div className="markdown-help-result" aria-label="Exemple de rendu">
                    {entry.preview ?? <span>Cette syntaxe ne sera pas rendue dans l’aperçu visuel.</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        <footer className="markdown-help-footer">
          <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer">
            Consulter la fiche complète sur Markdown Guide ↗
          </a>
        </footer>
      </section>
    </div>
  )
}
