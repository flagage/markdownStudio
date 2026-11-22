import nspell from 'nspell'
import frenchAff from '../../../node_modules/dictionary-fr/index.aff?raw'
import frenchDic from '../../../node_modules/dictionary-fr/index.dic?raw'

export type FrenchCorrectionCategory =
  | 'orthographe'
  | 'grammaire'
  | 'conjugaison'
  | 'accord'
  | 'ponctuation'

export interface FrenchCorrection {
  id: string
  from: number
  to: number
  original: string
  replacement: string
  category: FrenchCorrectionCategory
  explanation: string
}

const spellingCorrections: Record<string, string> = {
  'aujourdhui': 'aujourd’hui',
  apres: 'après',
  a: 'à',
  ca: 'ça',
  canape: 'canapé',
  ecole: 'école',
  ecolier: 'écolier',
  eleve: 'élève',
  francais: 'français',
  garcon: 'garçon',
  histoire: 'histoire',
  ordinateur: 'ordinateur',
  parceque: 'parce que',
  voiture: 'voiture'
}

const spellChecker = nspell(frenchAff, frenchDic)

const commonlyCorrectFrenchWords = new Set([
'etrange', 'étrange', 'béb', 'bébé', 'bebe', 'bougé', 'bouger', 'pieuvre',
  'tentacule', 'baignoire', 'histoire', 'disparu', 'parents', 'salle'
])

function maskUncorrectableMarkdown(markdown: string): string {
  let masked = markdown

  masked = masked.replace(/```[\s\S]*?```/g, (block) => ' '.repeat(block.length))
  masked = masked.replace(/~~~[\s\S]*?~~~/g, (block) => ' '.repeat(block.length))
  masked = masked.replace(/`[^`\n]*`/g, (block) => ' '.repeat(block.length))
  masked = masked.replace(/!\[[^\]]*\]\([^)]*\)/g, (block) => ' '.repeat(block.length))
  masked = masked.replace(/\[[^\]]*\]\([^)]*\)/g, (block) => ' '.repeat(block.length))
  masked = masked.replace(/https?:\/\/\S+/gi, (block) => ' '.repeat(block.length))
  masked = masked.replace(/(^|\n)(#{1,6}\s+)/g, (_match, prefix, heading) =>
    prefix + ' '.repeat(heading.length))

  return masked
}

function addCorrection(
  corrections: FrenchCorrection[],
  masked: string,
  original: string,
  replacement: string,
  category: FrenchCorrectionCategory,
  explanation: string,
  index: number
) {
  if (masked.slice(index, index + original.length) !== original) return
  const id = `${index}-${original}-${replacement}-${category}`
  corrections.push({
    id,
    from: index,
    to: index + original.length,
    original,
    replacement,
    category,
    explanation
  })
}

export function analyzeFrenchText(markdown: string): FrenchCorrection[] {
  const masked = maskUncorrectableMarkdown(markdown)
  const corrections: FrenchCorrection[] = []

  const conjugationPatterns: Array<[
    RegExp,
    string,
    string,
    string
  ]> = [
    [/\b(?:il|elle|on)\s+vas\b/giu, 'vas', 'va', 'Avec « il », « elle » ou « on », on écrit « va » au présent : « il va ».'],
    [/\bje\s+va\b/giu, 'va', 'vais', 'Après « je », le verbe aller se conjugue « vais » au présent.'],
    [/\btu\s+va\b/giu, 'va', 'vas', 'Après « tu », le verbe aller se conjugue « vas » au présent.'],
    [/\b(?:il|elle|on)\s+suis\b/giu, 'suis', 'est', 'Avec « il », « elle » ou « on », on utilise « est » : « il est ».'],
    [/\b(?:il|elle|on)\s+es\b/giu, 'es', 'est', 'Avec « il », « elle » ou « on », on utilise « est » : « elle est ».'],
    [/\b(?:je|j’)suis\b/giu, 'suis', 'suis', 'Cette forme est correcte pour « je suis » ou « j’ai ».'],
    [/\btu\s+est\b/giu, 'est', 'es', 'Après « tu », on écrit « tu es ».'],
    [/\bje\s+mange\b/giu, 'mange', 'mange', 'Après « je », « mange » est une bonne conjugaison pour le présent.']
  ]

  conjugationPatterns.forEach(([pattern, badWord, goodWord, explanation]) => {
    for (const match of masked.matchAll(pattern)) {
      if (badWord === goodWord) continue
      const badIndex = match[0].toLowerCase().lastIndexOf(badWord)
      if (badIndex < 0) continue
      const index = (match.index ?? 0) + badIndex
      addCorrection(corrections, masked, badWord, goodWord, 'conjugaison', explanation, index)
    }
  })

  for (const match of masked.matchAll(/\btu\s+([a-zéèêëàâîïôûùç]+)\b/giu)) {
    const verb = match[1]
    const verbCorrection: Record<string, string> = {
      mange: 'manges',
      parle: 'parles',
      joue: 'joues',
      marche: 'marches',
      regarde: 'regardes'
    }
    const replacement = verbCorrection[verb.toLowerCase()]
    if (!replacement) continue
    const index = (match.index ?? 0) + match[0].toLowerCase().lastIndexOf(verb.toLowerCase())
    addCorrection(corrections, masked, verb, replacement, 'conjugaison',
      `Avec « tu », ces verbes prennent généralement un « s » : « tu ${replacement} ».`, index)
  }

  for (const match of masked.matchAll(/\bje\s+([a-zéèêëàâîïôûùç]+)\b/giu)) {
    const verb = match[1]
    const verbCorrection: Record<string, string> = {
      mangeons: 'mange',
      parlons: 'parle',
      jouons: 'joue',
      regardons: 'regarde'
    }
    const replacement = verbCorrection[verb.toLowerCase()]
    if (!replacement) continue
    const index = (match.index ?? 0) + match[0].toLowerCase().lastIndexOf(verb.toLowerCase())
    addCorrection(corrections, masked, verb, replacement, 'conjugaison',
      `Avec « je », on utilise la forme du singulier : « je ${replacement} ».`, index)
  }

  const homophonePatterns: Array<[RegExp, string, string, FrenchCorrectionCategory, string]> = [
    [/\bil\s+à(?=$|[^\\p{L}\\p{N}\\p{M}_])/giu, 'à', 'a', 'grammaire', '« Il » est suivi du verbe avoir : on écrit « il a ».'],
    [/\belle\s+à(?=$|[^\\p{L}\\p{N}\\p{M}_])/giu, 'à', 'a', 'grammaire', '« Elle » est suivi du verbe avoir : on écrit « elle a ».'],
    [/\bon\s+à(?=$|[^\\p{L}\\p{N}\\p{M}_])/giu, 'à', 'a', 'grammaire', '« On » est suivi du verbe avoir : on écrit « on a ».'],
    [/\ba\s+(?:la|le|les|l’|l')(?=$|[^\\p{L}\\p{N}\\p{M}_])/giu, 'a', 'à', 'grammaire', 'Ici, « à » indique une place ou une direction : « à la », « à l’… » ou « à les ».']
  ]

  homophonePatterns.forEach(([pattern, badWord, goodWord, category, explanation]) => {
    for (const match of masked.matchAll(pattern)) {
      const index = (match.index ?? 0) + match[0].toLowerCase().lastIndexOf(badWord)
      addCorrection(corrections, masked, badWord, goodWord, category, explanation, index)
    }
  })

  for (const match of masked.matchAll(/\b(?:tres|encor|pareque|aujourd’hui|aujourdhui|ecole|eleve|ecolier|garcon|canape|francais|desoler|ete|fete|apres|parceque)\b/giu)) {
    const original = match[0]
    let replacement = spellingCorrections[original.toLowerCase()] ?? original
    if (original.toLowerCase() === 'tres') replacement = 'très'
    if (original.toLowerCase() === 'encor') replacement = 'encore'
    if (original.toLowerCase() === 'pareque') replacement = 'parce que'
    if (original.toLowerCase() === 'desoler') replacement = 'désolé'
    if (original.toLowerCase() === 'ete') replacement = 'été'
    if (original.toLowerCase() === 'fete') replacement = 'fête'
    if (original.toLowerCase() === 'aujourd’hui') continue
    const category: FrenchCorrectionCategory = 'orthographe'
    const index = match.index ?? 0
    addCorrection(corrections, masked, original, replacement, category,
      `Ce mot s’écrit « ${replacement} » en français.`, index)
  }

  const singularAfterArticles = [
    'chat', 'chien', 'livre', 'stylo', 'table', 'voiture', 'maison',
    'enfant', 'école', 'fille', 'garçon', 'image', 'porte'
  ]
  const pluralAfterArticles = [
    'chats', 'chiens', 'livres', 'stylos', 'tables', 'voitures', 'maisons',
    'enfants', 'écoles', 'filles', 'garçons', 'images', 'portes'
  ]

  for (const match of masked.matchAll(/\b(?:les|des|ces|mes|tes|ses)\s+([a-zéèêëàâîïôûùç]+)\b/giu)) {
    const word = match[1]
    if (!singularAfterArticles.includes(word.toLowerCase())) continue
    const pluralIndex = singularAfterArticles.indexOf(word.toLowerCase())
    const replacement = pluralAfterArticles[pluralIndex]
    const index = (match.index ?? 0) + match[0].toLowerCase().lastIndexOf(word.toLowerCase())
    addCorrection(corrections, masked, word, replacement, 'accord',
      `Cet article est au pluriel. Le nom doit aussi être au pluriel : « ${replacement} ».`, index)
  }

  for (const match of masked.matchAll(/\b(?:un|une)\s+(enfants|filles|garçons|maisons|voitures|tables|livres)\b/giu)) {
    const word = match[1]
    const replacement = word.replace(/s$/i, '').replace(/x$/i, '')
    const index = (match.index ?? 0) + match[0].toLowerCase().lastIndexOf(word.toLowerCase())
    addCorrection(corrections, masked, word, replacement, 'accord',
      `Avec « un » ou « une », le nom est au singulier : « ${replacement} ».`, index)
  }

  const contextualCorrections: Array<[
    RegExp,
    string,
    string,
    FrenchCorrectionCategory,
    string
  ]> = [
    [/\bj(e|’)?\s+est\s+dit\b/giu, 'est dit', 'ai dit', 'grammaire',
      'Après « je », on écrit « ai » pour former le passé composé : « je lui ai dit ».'],
    [/\blui\s+est\s+dis\b/giu, 'est dis', 'ai dit', 'grammaire',
      'Après « je », on écrit « ai dit » : « je lui ai dit ».'],
    [/\bn['’]a\s+pas\s+bouger\b/giu, 'bouger', 'bougé', 'grammaire',
      'Après « ne… pas », le passé composé utilise le participe passé : « n’a pas bougé ».'],
    [/\bl['’]ai\s+pousser\b/giu, 'pousser', 'poussée', 'accord',
      '« Je l’ai poussée » : le pronom « l’ » représente la pieuvre, au féminin. Le participe passé prend donc un « e ».'],
    [/\bles\s+ais\s+emmener\b/giu, 'ais emmener', 'ai emmenés', 'grammaire',
      'On écrit « les ai emmenés » : « ai » pour le passé composé et « emmenés » pour plusieurs personnes du genre masculin.'],
    [/\bl['’]escalier\s+de\s+peure\b/giu, 'peure', 'peur', 'orthographe',
      'On écrit « peur » avec un « r » à la fin : « de peur ».'],
    [/\bd['’]\s+une\b/giu, "d' une", 'd’une', 'orthographe',
      'Avant une voyelle, l’apostrophe s’écrit directement : « d’une ».'],
    [/\bprennait\b/giu, 'prennait', 'prenait', 'orthographe',
      'Le verbe prendre s’écrit « prenait » à l’imparfait.'],
    [/\betrange\b/giu, 'etrange', 'étrange', 'orthographe',
      'Le mot « étrange » prend un accent sur le « e ».'],
    [/rêve(?=$|[^\\p{L}\\p{M}_])/giu, 'rêve', 'rêvé', 'grammaire',
      'Après « avais », on utilise le participe passé « rêvé ».'],
    [/\bgeres\b/giu, 'geres', 'gérés', 'orthographe',
      'L’accord « gérés » prend des accents sur les deux « e ».'],
    [/\bgere\b/giu, 'gere', 'géré', 'orthographe',
      'Le participe passé « géré » prend un accent aigu sur le « e ».'],
    [/\baccent\b/giu, 'accent', 'accent', 'orthographe',
      'Ce mot est correctement orthographié.'],
    [/\bvoire\b/giu, 'voire', 'voir', 'orthographe',
      'Ici, on utilise le verbe « voir » : « pour voir ».'],
    [/\bpas\s+bouger\b/giu, 'bouger', 'bougé', 'grammaire',
      'Avec « avoir » au passé composé, on écrit le participe passé « bougé » : « n’a pas bougé ».'],
    [/\bont\s+dis\b/giu, 'dis', 'dit', 'grammaire',
      'Après « ils ont » ou « elles ont », on écrit « dit » au participe passé : « ont dit ».'],
    [/j['’]été(?=$|[^\\p{L}\\p{M}_])/giu, 'j’été', 'j’étais', 'grammaire',
      'Ici, le verbe être se conjugue à l’imparfait : « j’étais un bébé ».'],
    [/\bsuis\s+aller\b/giu, 'aller', 'allée', 'accord',
      'Avec « je suis » et une personne qui parle au féminin, on écrit « je suis allée ».'],
    [/\bm(e|’)?\s+suis\s+dis\b/giu, 'suis dis', 'suis dit', 'grammaire',
      'La forme correcte est « je me suis dit ».'],
    [/\bavais\s+rève(?=$|[^\\p{L}\\p{M}_])/giu, 'rève', 'rêvé', 'grammaire',
      'Après « avais », on utilise le participe passé « rêvé ».'],
    [/\bs['’]avais\b/giu, 's’avais', 'savais', 'orthographe',
      'Avec « je ne », on écrit « je ne savais pas » : « savais » prend un « s ».'],
    [/s['’]été(?=$|[^\\p{L}\\p{M}_])/giu, "s'été", 'c’était', 'grammaire',
      'Ici, « si » est suivi du verbe être à l’imparfait : « c’était vrai ».'],
    [/\bd['’]\s+un\b/giu, "d' un", 'd’un', 'orthographe',
      'Avant une voyelle, on écrit une apostrophe : « d’un ».'],
    [/\bles\s+ai\s+emmener\b/giu, 'emmener', 'emmenés', 'accord',
      'Avec « les ai », on utilise le participe passé « emmenés » pour plusieurs parents.']
  ]

  contextualCorrections.forEach(([pattern, original, replacement, category, explanation]) => {
    for (const match of masked.matchAll(pattern)) {
      const originalIndex = match[0].toLowerCase().lastIndexOf(original.toLowerCase())
      const index = (match.index ?? 0) + (originalIndex >= 0 ? originalIndex : 0)
      if (original === 'est dit') {
        addCorrection(corrections, masked, 'est dit', 'ai dit', category, explanation, index)
      } else if (original === 'est dis') {
        addCorrection(corrections, masked, 'est dis', 'ai dit', category, explanation, index)
      } else if (original === "d' une") {
        addCorrection(corrections, masked, match[0], 'd’une', category, explanation, match.index ?? 0)
      } else if (original === "d' un") {
        addCorrection(corrections, masked, match[0], 'd’un', category, explanation, match.index ?? 0)
      } else if (original === 'j’été') {
        addCorrection(corrections, masked, match[0], 'j’étais', category, explanation, match.index ?? 0)
      } else if (original === 's’étais') {
        addCorrection(corrections, masked, match[0], 'c’était', category, explanation, match.index ?? 0)
      } else {
        addCorrection(corrections, masked, original, replacement, category, explanation, index)
      }
    }
  })

  for (const match of masked.matchAll(/[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*(?=$|[^\\p{L}\\p{M}])/gu)) {
    const word = match[0]
    if (word.length < 3 || /^[A-ZÉÈÊËÀÂÎÏÔÛÙÇ]+$/u.test(word)) continue
    if (word.includes('’') || word.includes("'")) continue
    if (commonlyCorrectFrenchWords.has(word.toLowerCase())) continue
    if (spellChecker.correct(word) || spellChecker.correct(word.toLowerCase())) continue

    const suggestions = spellChecker.suggest(word)
    const replacement = suggestions
      .find((suggestion) => /^[\p{L}\p{M}-]+$/u.test(suggestion) &&
        !suggestion.includes('(') &&
        suggestion.length <= word.length + 3)
    if (!replacement) continue

    const index = match.index ?? 0
    addCorrection(corrections, masked, word, replacement, 'orthographe',
      `Ce mot est peut-être mal orthographié. Une proposition proche est « ${replacement} ».`, index)
  }

  for (const match of masked.matchAll(/[ \t]+(?=[,.])/g)) {
    const position = match.index ?? 0
    if (position === 0) continue
    const previousCharacter = masked[position - 1] ?? ''
    if (previousCharacter === '\n' || previousCharacter === '\r') continue
    if (match[0].includes('\n') || match[0].includes('\r')) continue
    const index = match.index ?? 0
    addCorrection(corrections, masked, match[0], '', 'ponctuation',
      'En français, on ne laisse pas d’espace avant la virgule, le point ou le point d’exclamation.', index)
  }

  for (const match of masked.matchAll(/([,;:?])(?![ \t\r\n])/g)) {
    const punctuation = match[1]
    const index = match.index ?? 0
    addCorrection(corrections, masked, match[0], `${punctuation} `, 'ponctuation',
      `Après « ${punctuation} », il faut laisser une seule espace.`, index)
  }

  for (const match of masked.matchAll(/\.(?!\.)(?![ \t\r\n])/g)) {
    const index = match.index ?? 0
    addCorrection(corrections, masked, '.', '. ', 'ponctuation',
      'Après un point, il faut laisser une espace avant le mot suivant.', index)
  }

  for (const match of masked.matchAll(/(\S)[ \t]{2,}(?=\S)/g)) {
    if ((match.index ?? 0) === 0) continue
    const index = (match.index ?? 0) + 1
    addCorrection(corrections, masked, match[0].slice(1), ' ', 'ponctuation',
      'On laisse une seule espace entre les mots.', index)
  }

  for (const match of masked.matchAll(/(?:^|[.!?]\s+)([a-z])/g)) {
    const index = (match.index ?? 0) + match[0].lastIndexOf(match[1])
    const replacement = match[1].toUpperCase()
    addCorrection(corrections, masked, match[1], replacement, 'grammaire',
      'Une phrase commence par une majuscule.', index)
  }

  const unique = new Map<string, FrenchCorrection>()
  for (const correction of corrections) {
    unique.set(correction.id, correction)
  }
  return Array.from(unique.values()).sort((a, b) => a.from - b.from)
}
