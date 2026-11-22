import { describe, expect, it } from 'vitest'
import { analyzeFrenchText } from './frenchWritingAssistant'

describe('analyse française locale', () => {
  it('corrige une conjugaison évidente avec une explication', () => {
    const corrections = analyzeFrenchText('Il vas à l’école.')
    expect(corrections).toContainEqual(expect.objectContaining({
      original: 'vas',
      replacement: 'va',
      category: 'conjugaison'
    }))
  })

  it('distingue les homophones il a et la direction à', () => {
    expect(analyzeFrenchText('Il à mangé.')).toContainEqual(expect.objectContaining({
      original: 'à',
      replacement: 'a'
    }))
    expect(analyzeFrenchText('Je vais a la piscine.')).toContainEqual(expect.objectContaining({
      original: 'a',
      replacement: 'à'
    }))
  })

  it('ignore les blocs de code', () => {
    expect(analyzeFrenchText('```md\nIl vas\n```')).not.toContainEqual(
      expect.objectContaining({ original: 'vas' })
    )
  })

  it('corrige certains accords simples', () => {
    expect(analyzeFrenchText('Les fille arrivent.')).toContainEqual(expect.objectContaining({
      original: 'fille',
      replacement: 'filles',
      category: 'accord'
    }))
  })

  it('analyse les erreurs fréquentes du texte Eugenie', () => {
    const text = `une pieuvre dans ma baignoire qui prennait sa douche à ma place .
Je lui est dis que je devais la prendre
pas bouger d' une tentacule
je l'ai pousser
j'ai pris  l'escalier de peure pour voire mes parents.
je  les ais emmener,dans la salle de bain`
    const corrections = analyzeFrenchText(text)

    expect(corrections).toContainEqual(expect.objectContaining({
      original: 'prennait',
      replacement: 'prenait'
    }))
    expect(corrections).toContainEqual(expect.objectContaining({
      original: 'est dis',
      replacement: 'ai dit'
    }))
    expect(corrections).toContainEqual(expect.objectContaining({
      original: 'pousser',
      replacement: 'poussée'
    }))
    expect(corrections).toContainEqual(expect.objectContaining({
      original: 'peure',
      replacement: 'peur'
    }))
    expect(corrections).toContainEqual(expect.objectContaining({
      original: 'voire',
      replacement: 'voir'
    }))
  })

  it('repère les espaces multiples, les virgules mal placées et les participes du texte Eugenie', () => {
    const corrections = analyzeFrenchText(`# histoire  etrange     Dans ma salle de bain

Je lui est dis que je devais la prendre  mais elle
pas bouger d' une tentacule,  alors je l'ai pousser
Ils ne m'ont pas cru  ,alors je  les ais emmener,dans la salle de bain`)
    expect(corrections).toContainEqual(expect.objectContaining({ category: 'orthographe', original: 'etrange' }))
    expect(corrections.some((correction) => correction.category === 'ponctuation')).toBe(true)
  })

  it('normalise les espaces autour de la ponctuation et les apostrophes', () => {
    const corrections = analyzeFrenchText(`Bonjour  tout le monde ,il fait beau.
Il mange d' une pomme`)
    expect(corrections).toContainEqual(expect.objectContaining({
      category: 'ponctuation',
      replacement: ''
    }))
    expect(corrections).toContainEqual(expect.objectContaining({
      original: ',',
      replacement: ', ',
      category: 'ponctuation'
    }))
    expect(corrections).toContainEqual(expect.objectContaining({
      original: "d' une",
      replacement: 'd’une'
    }))
  })

  it('propose les accents courants', () => {
    expect(analyzeFrenchText('Le travail est geres avec soin.')).toContainEqual(
      expect.objectContaining({ original: 'geres', replacement: 'gérés', category: 'orthographe' })
    )
  })

  it('ne souligne pas étrange bébé ou bougé quand ils sont corrects', () => {
    const corrections = analyzeFrenchText('Une histoire étrange. Mon bébé a bougé.')
    expect(corrections.some((correction) =>
      ['étrange', 'bebe', 'bébé', 'bougé'].includes(correction.original)
    )).toBe(false)
  })

  it('ne signale pas les espaces légitimes du texte Eugenie', () => {
    const corrections = analyzeFrenchText(`# histoire étrange

# Dans ma salle de bain

une pieuvre dans ma baignoire qui prenait sa douche à ma place.
Je lui ai dit que je devais la prendre mais elle, la pieuvre, n'a
pas bougé d’un tentacule, alors je l'ai poussée. Mais je n'y arrivais pas
elle a voulu m'attraper j'ai pris l'escalier de peur pour voir mes parents.
La pieuvre avait disparu!!!
Mes parents ont dit que j’étais un bébé. Alors je suis allée dans ma chambre`)

    expect(corrections.some((correction) =>
      correction.category === 'ponctuation' &&
      ['disparu', 'bébé', 'place', 'pa'].some((word) => correction.original.includes(word))
    )).toBe(false)

    expect(corrections.some((correction) =>
      correction.category === 'ponctuation' &&
      (correction.original === ' ' || correction.original === '  ')
    )).toBe(false)
  })

  it('détecte les fautes restantes du texte Eugenie', () => {
    const corrections = analyzeFrenchText(`Mes parents ont dis que j'été un bébé.
Je suis aller dans ma chambre.
Je me suis dis que j'avais rêve.
Je ne s'avais pas si s'été vrai ou faux.
Pas bouger d' un tentacule.
Ils les ai emmener`)
    expect(corrections).toContainEqual(expect.objectContaining({ original: 'dis', replacement: 'dit' }))
    expect(corrections).toContainEqual(expect.objectContaining({ original: "j'été", replacement: 'j’étais' }))
    expect(corrections).toContainEqual(expect.objectContaining({ original: 'aller', replacement: 'allée' }))
    expect(corrections).toContainEqual(expect.objectContaining({ original: 'rêve', replacement: 'rêvé' }))
    expect(corrections).toContainEqual(expect.objectContaining({ original: "d' un", replacement: 'd’un' }))
  })
})
