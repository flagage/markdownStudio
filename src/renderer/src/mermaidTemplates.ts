export interface MermaidTemplate {
  id: string
  label: string
  category: string
  code: string
}

export interface MermaidSyntaxHelp {
  label: string
  syntax: string
  sections?: {
    heading: string
    body: string
    example?: string
  }[]
}

const syntaxHelp: Record<string, MermaidSyntaxHelp> = {
  'flowchart-v2': {
    label: 'Organigramme',
    syntax: 'Déclare le sens avec `flowchart TD` ou `flowchart LR`. Crée des nœuds, puis relie-les avec des flèches et des libellés.',
    sections: [
      {
        heading: 'Direction et nœuds',
        body: '`flowchart` commence le diagramme. Directions : `TB`/`TD` (haut vers bas), `BT`, `LR` (gauche à droite) et `RL`. Chaque nœud a un identifiant unique suivi de son libellé et de sa forme.',
        example: 'flowchart TD\\n  start[Départ] --> decision{Continuer ?}\\n  decision -->|oui| done([Terminé])\\n  decision -->|non| retry[/Réessayer/]'
      },
      {
        heading: 'Formes de nœuds',
        body: 'Formes courantes : `A[rectangle]`, `A(angles arrondis)`, `A([stade])`, `A[[sous-programme]]`, `A[(base de données)]`, `A((cercle))`, `A{décision}`, `A{{hexagone}}`, `A[/parallélogramme/]` et `A>forme asymétrique]`. Les libellés contenant de la ponctuation peuvent être entourés de guillemets.',
        example: 'flowchart LR\\n  A["Texte avec (parenthèses)"] --> B[(Stockage)]'
      },
      {
        heading: 'Liens, libellés et embranchements',
        body: 'Liens : `-->` flèche, `---` trait, `-.->` pointillé, `==>` épais, `--o` cercle et `--x` croix. Ajoute un libellé avec `-->|texte|` ou `-- texte -->`. Chaîne plusieurs liens sur une même ligne ; plusieurs flèches peuvent partir d’un nœud.',
        example: 'flowchart TD\\n  A -->|oui| B\\n  A -.-> C\\n  B ==> D\\n  C --x D'
      },
      {
        heading: 'Sous-graphes et présentation',
        body: '`subgraph identifiant[Titre] ... end` regroupe des nœuds. `classDef nom ...` définit un style, `class A,B nom` l’applique ; `style A ...` cible directement un nœud. Les commentaires commencent par `%%`.',
        example: 'flowchart LR\\n  subgraph api[API]\\n    A[Route] --> B[Service]\\n  end\\n  classDef important fill:#efe,stroke:#484\\n  class B important'
      }
    ]
  },
  'flowchart-elk': {
    label: 'Organigramme (ELK)',
    syntax: 'Commence par `flowchart-elk` suivi du sens (`TD`, `LR`, etc.). La syntaxe des nœuds et des liens est celle des organigrammes Mermaid.',
    sections: [
      {
        heading: 'Déclaration et direction',
        body: '`flowchart-elk` choisit le moteur de disposition ELK ; indique ensuite `TB`/`TD`, `BT`, `LR` ou `RL`. Les identifiants de nœud sont uniques et peuvent être réutilisés pour créer plusieurs liens.',
        example: 'flowchart-elk LR\\n  start[Départ] --> parse[Analyser]\\n  parse --> valid{Valide ?}\\n  valid -->|oui| save[Enregistrer]'
      },
      {
        heading: 'Nœuds et liens',
        body: 'Utilise les formes flowchart telles que `A[rectangle]`, `A{décision}`, `A((cercle))` et les connecteurs `-->`, `-.->`, `==>` ou `--x`. Les libellés de lien s’écrivent `-->|texte|`.',
        example: 'flowchart-elk TD\\n  A[Entrée] -->|succès| B((Fin))\\n  A -.->|erreur| C[Diagnostic]'
      },
      {
        heading: 'Groupes et classes',
        body: 'Un `subgraph id[Titre] ... end` rassemble des étapes. `classDef` définit une classe CSS et `class` l’associe à un ou plusieurs nœuds, comme dans un flowchart standard.',
        example: 'flowchart-elk LR\\n  subgraph traitement[Traitement]\\n    A[Étape 1] --> B[Étape 2]\\n  end\\n  classDef etape fill:#eef,stroke:#55a\\n  class A,B etape'
      }
    ]
  },
  sequence: {
    label: 'Diagramme de séquence',
    syntax: 'Déclare des participants et décris les messages dans l’ordre chronologique. Les blocs `loop`, `alt` et `opt` représentent les scénarios conditionnels.',
    sections: [
      {
        heading: 'Participants et ordre',
        body: '`participant id as Libellé` ou `actor id as Libellé` déclare un participant. Leur ordre d’apparition détermine leur ordre horizontal ; les déclarations explicites permettent de le fixer. `autonumber` numérote les messages.',
        example: 'sequenceDiagram\\n  autonumber\\n  actor C as Client\\n  participant A as Application\\n  participant DB as Base'
      },
      {
        heading: 'Messages et activation',
        body: 'Flèches usuelles : `->>` (ligne pleine, pointe pleine), `-->>` (pointillée), `-)` et `--)` (asynchrones). Le texte suit `A->>B: message`. `activate B`, `deactivate B` ou les suffixes `++`/`--` affichent une activation.',
        example: 'sequenceDiagram\\n  C->>A: Envoyer une demande\\n  activate A\\n  A-->>DB: Lire\\n  DB-->>A: Résultat\\n  A-->>C: Réponse\\n  deactivate A'
      },
      {
        heading: 'Notes et blocs de contrôle',
        body: '`Note left of A`, `Note right of B` ou `Note over A,B` ajoute une note. Blocs : `loop ... end`, `alt ... else ... end`, `opt ... end`, `par ... and ... end`, `critical ... option ... end` et `break ... end`. `rect ... end` met une zone en évidence.',
        example: 'sequenceDiagram\\n  A->>B: Requête\\n  alt valide\\n    B-->>A: OK\\n  else invalide\\n    B-->>A: Erreur\\n  end\\n  Note over A,B: Fin du scénario'
      }
    ]
  },
  stateDiagram: {
    label: 'Diagramme d’état',
    syntax: 'Décris les états et les transitions sous la forme `ÉtatA --> ÉtatB: événement`. `[*]` marque le début ou la fin.',
    sections: [
      {
        heading: 'États et transitions',
        body: '`stateDiagram-v2` démarre le diagramme. Nomme les états avec des identifiants simples ; le texte après `:` décrit l’événement ou la garde. `[*]` est le pseudo-état initial ou final.',
        example: 'stateDiagram-v2\\n  [*] --> Inactif\\n  Inactif --> Actif: démarrer\\n  Actif --> Inactif: arrêter\\n  Actif --> [*]: terminer'
      },
      {
        heading: 'États composés et choix',
        body: 'Un état composé contient un sous-diagramme entre accolades : `state Nom { ... }`. `state id <<choice>>` crée un choix ; les transitions sortantes peuvent porter des gardes. `<<fork>>` et `<<join>>` représentent une synchronisation parallèle.',
        example: 'stateDiagram-v2\\n  state Travail {\\n    [*] --> Brouillon\\n    Brouillon --> Relecture\\n  }\\n  Relecture --> Travail: corrections'
      },
      {
        heading: 'Notes et organisation',
        body: '`note right of État` ou `note left of État` ajoute une note, terminée par `end note`. `direction LR` change l’orientation du diagramme. Les transitions peuvent être écrites sur plusieurs lignes pour rester lisibles.',
        example: 'stateDiagram-v2\\n  direction LR\\n  EnAttente --> Traité: validation\\n  note right of Traité\\n    Courriel envoyé\\n  end note'
      }
    ]
  },
  journey: {
    label: 'Parcours utilisateur',
    syntax: 'Ajoute un `title`, puis des `section`. Chaque action suit `Action: score: acteur(s)` avec un score de 1 à 5.',
    sections: [
      {
        heading: 'Titre et étapes',
        body: '`title texte` donne un titre. `section Nom` ouvre une étape du parcours ; les actions indentées qui suivent lui appartiennent. Les sections structurent le parcours de gauche à droite.',
        example: 'journey\\n  title Réserver un trajet\\n  section Recherche\\n    Trouver un trajet: 5: Client\\n    Comparer les offres: 4: Client'
      },
      {
        heading: 'Actions, score et acteurs',
        body: 'Chaque action se note `Description: score: acteur1, acteur2`. Le score d’expérience est un entier de 1 (mauvaise expérience) à 5 (excellente). Les noms d’acteurs sont des libellés, pas des identifiants de nœud.',
        example: 'journey\\n  section Réservation\\n    Confirmer le choix: 3: Client, Service\\n    Recevoir le billet: 5: Client'
      },
      {
        heading: 'Bonnes pratiques',
        body: 'Garde une action par ligne et utilise des noms d’acteurs cohérents entre les sections. Les actions sans acteur ou avec un score hors de 1 à 5 ne décrivent pas correctement l’échelle attendue.'
      }
    ]
  },
  gantt: {
    label: 'Diagramme de Gantt',
    syntax: 'Commence par `gantt`. Une ligne de tâche suit `Nom de tâche : métadonnées`. Les tâches sont séquentielles par défaut ; `after` permet de définir les dépendances.',
    sections: [
      {
        heading: 'Directives du diagramme',
        body: '`title texte` ajoute un titre (facultatif). `dateFormat FORMAT` définit le format des dates d’entrée (par défaut `YYYY-MM-DD`). `axisFormat FORMAT` choisit le format affiché sur l’axe, par exemple `%d/%m`. `tickInterval 1day`, `1week` ou `1month` règle les graduations ; `weekday monday` choisit le jour de début des ticks hebdomadaires.',
        example: 'title Plan du projet\\ndateFormat YYYY-MM-DD\\naxisFormat %d/%m\\ntickInterval 1week\\nweekday monday'
      },
      {
        heading: 'Sections et statuts',
        body: '`section Nom` ouvre une section (le nom est obligatoire). Les tags de tâche `active`, `done`, `crit` et `milestone` marquent respectivement une tâche en cours, terminée, critique ou un jalon ponctuel. Les tags se placent juste après les deux-points et avant les autres métadonnées.',
        example: 'section Milestones\\nLancement :milestone, launch, 2026-03-02, 0d\\nsection Réalisation\\nDéveloppement :crit, active, dev, 2026-03-02, 5d\\nTests :after dev, 3d'
      },
      {
        heading: 'Dates, dépendances et durées',
        body: 'Après les tags, les métadonnées peuvent contenir un ID facultatif, une date de début ou `after ID` (plusieurs IDs sont possibles), puis une date de fin ou une durée. `until ID` termine une tâche au début d’une autre tâche. Un seul élément peut aussi être une durée ou une date de fin ; sans date, une tâche commence à la fin de la précédente. Un ID rend la tâche référencable.',
        example: 'A :a, 2026-03-02, 5d\\nB :b, after a, 3d\\nC :c, 2026-03-10, 5d\\nSuivi :after a, until c'
      },
      {
        heading: 'Durées',
        body: 'Suffixes pris en charge : `ms` millisecondes, `s` secondes, `m` minutes, `h` heures, `d` jours, `w` semaines, `M` mois et `y` années. Les nombres décimaux sont acceptés, par exemple `1.5d`.'
      },
      {
        heading: 'Exclusions et week-ends',
        body: '`excludes` retire du calcul les dates, jours ou périodes indiqués. Tu peux répéter la directive. `excludes weekends` exclut les week-ends ; `excludes saturday` ou `sunday` exclut un jour donné. `weekend friday` définit un week-end vendredi-samedi ; `weekend saturday` (défaut) définit samedi-dimanche. Les jours exclus prolongent la durée des tâches concernées.',
        example: 'excludes weekends\\nexcludes 2026-05-01 2026-05-08\\nweekend saturday'
      },
      {
        heading: 'Jalons et marqueurs',
        body: 'Le tag `milestone` transforme une tâche en événement ponctuel, positionné au milieu de la durée déclarée. `vert date : libellé` dessine un marqueur vertical sans ajouter de ligne de tâche. `todayMarker off` masque la ligne du jour ; `todayMarker stroke:#f00,stroke-width:2px` la personnalise.',
        example: 'section Milestones\\nLancement :milestone, launch, 2026-03-02, 0d\\nvert 2026-03-02 : Mise en production\\ntodayMarker off'
      },
      {
        heading: 'Commentaires',
        body: 'Une ligne commençant par `%%` est ignorée par Mermaid et peut documenter le planning.',
        example: '%% Les dates seront confirmées en comité'
      }
    ]
  },
  timeline: {
    label: 'Frise chronologique',
    syntax: 'Déclare un `title`, puis des périodes et leurs événements. L’indentation rattache les événements à une période.',
    sections: [
      {
        heading: 'Titre et périodes',
        body: '`timeline` démarre la frise. `title texte` ajoute un titre. Une ligne `Période : événement` crée une période avec un premier événement ; la période peut être une année, une date ou un libellé.',
        example: 'timeline\\n  title Histoire du projet\\n  2024 : Première idée\\n  2025 : Prototype'
      },
      {
        heading: 'Plusieurs événements et sections',
        body: 'Pour rattacher d’autres événements à la période courante, écris `: événement` sur une ligne indentée. `section Nom` sépare la frise en groupes. Les événements sont affichés dans l’ordre où ils sont déclarés.',
        example: 'timeline\\n  section Conception\\n    2024 : Première idée\\n    2025 : Prototype\\n         : Tests utilisateurs\\n  section Livraison\\n    2026 : Lancement'
      }
    ]
  },
  gitGraph: {
    label: 'Historique Git',
    syntax: 'Décris les opérations Git dans l’ordre avec `commit`, `branch`, `checkout` et `merge`. Chaque commande modifie la branche active.',
    sections: [
      {
        heading: 'Commits et branches',
        body: '`gitGraph` ouvre l’historique. `commit` crée un commit sur la branche courante ; `id: "..."` et `tag: "..."` ajoutent un identifiant et une étiquette. `branch nom` crée une branche, `checkout nom` la rend active.',
        example: 'gitGraph\\n  commit id: "Initialisation" tag: "v1"\\n  branch feature\\n  checkout feature\\n  commit id: "Fonctionnalité"'
      },
      {
        heading: 'Fusion et sélection',
        body: '`merge nom` fusionne la branche indiquée dans la branche active ; `cherry-pick id: "..."` reprend un commit précis. Une commande doit référencer une branche ou un commit déjà créé.',
        example: 'gitGraph\\n  commit id: "base"\\n  branch feature\\n  commit id: "feature-1"\\n  checkout main\\n  commit id: "correctif"\\n  merge feature'
      },
      {
        heading: 'Style de commit',
        body: '`commit type: HIGHLIGHT` met un commit en évidence. `tag: "nom"` ajoute un tag à un commit. Les messages et tags contenant des espaces doivent être entre guillemets.',
        example: 'gitGraph\\n  commit id: "release" type: HIGHLIGHT tag: "v2.0"'
      }
    ]
  },
  eventmodeling: {
    label: 'Modélisation événementielle',
    syntax: 'Déclare les éléments avec `tf numéro type identifiant`. Les types indiquent une interface (`ui`), une commande (`cmd`) ou un événement (`evt`).',
    sections: [
      {
        heading: 'Éléments du modèle',
        body: '`eventmodeling` commence le diagramme. Chaque `tf` identifie une étape avec un numéro unique, un type et un nom d’entité ou d’événement. Les numéros aident à conserver l’ordre de lecture.',
        example: 'eventmodeling\\n\\ntf 01 ui CartUI\\ntf 02 cmd AddItem\\ntf 03 evt ItemAdded'
      },
      {
        heading: 'Types usuels',
        body: '`ui` représente une interface utilisateur, `cmd` une commande demandant un changement et `evt` un événement décrivant un fait. Réutilise les mêmes identifiants pour garder les éléments du modèle cohérents.'
      }
    ]
  },
  swimlane: {
    label: 'Couloirs de processus',
    syntax: 'Commence par `swimlane-beta` et une direction, puis déclare un `subgraph` par couloir. Le contenu utilise les nœuds et les liens flowchart.',
    sections: [
      {
        heading: 'Direction et couloirs',
        body: '`swimlane-beta LR` dispose les couloirs de gauche à droite ; utilise les directions flowchart (`TB`/`TD`, `BT`, `LR`, `RL`). Chaque `subgraph id[Titre] ... end` représente un acteur ou une responsabilité.',
        example: 'swimlane-beta LR\\n  subgraph client[Client]\\n    A[Passer commande]\\n  end\\n  subgraph boutique[Boutique]\\n    B[Préparer commande]\\n  end'
      },
      {
        heading: 'Étapes et liens entre couloirs',
        body: 'Dans chaque couloir, crée des nœuds flowchart (`A[Étape]`, `B{Choix}`) et relie-les avec `-->`, `-.->` ou un lien étiqueté. Les liens peuvent traverser les couloirs.',
        example: 'swimlane-beta LR\\n  subgraph client[Client]\\n    A[Commander]\\n  end\\n  subgraph livraison[Livraison]\\n    B[Expédier]\\n  end\\n  A -->|commande| B'
      }
    ]
  },
  agentflow: {
    label: 'Flux d’agents IA',
    syntax: 'Commence par `agentflow-beta`, puis déclare les nœuds et leurs relations. Les flèches distinguent le flux, les références et les erreurs.',
    sections: [
      {
        heading: 'Nœuds et flux',
        body: '`agentflow-beta` accepte une direction (`TB`, `TD`, `BT`, `LR` ou `RL`). Déclare un nœud comme en flowchart avec `id[Libellé]`. Les alias de forme `task`, `tool`, `input`, `decision`, `refdoc` et `action` donnent une intention visuelle ; les formes flowchart classiques restent disponibles.',
        example: 'agentflow-beta LR\\n  question[Question] --> assistant[Assistant]\\n  assistant --> search[Recherche]\\n  search --> assistant\\n  assistant --> answer[Réponse]'
      },
      {
        heading: 'Relations et conteneurs',
        body: '`-->` indique le flux de contrôle ou de données ; `-.-` une référence sans transfert de contrôle ; `--x` un chemin d’échec. `flow nom ... end` regroupe et imbrique les nœuds. `global ... end` garde un nœud partagé au niveau supérieur.',
        example: 'agentflow-beta LR\\n  flow recherche\\n    question[Question] --> agent[Agent]\\n    agent -.- memory[Mémoire]\\n    agent --x failure[Échec]\\n    agent --> tool[Recherche]\\n  end'
      },
      {
        heading: 'Métadonnées',
        body: '`@{ ... }` ajoute des métadonnées à un nœud, un lien ou un conteneur. Clés interprétées : `shape`, `label`, `labelType`, `view: collapsed`, `algorithm`, `curve`, `animate` et `animation`. D’autres clés peuvent porter des informations métier.',
        example: 'agentflow-beta\\n  researcher@{ shape: task, model: "modèle", instruction: "Chercher des sources" }\\n  tool@{ shape: tool, params: "query :: String", returns: "Résultat" }\\n  researcher --> tool'
      }
    ]
  },
  classDiagram: {
    label: 'Diagramme de classes',
    syntax: 'Déclare des classes et leurs membres avec `class Nom { ... }`, puis ajoute les relations et multiplicités.',
    sections: [
      {
        heading: 'Classes, attributs et méthodes',
        body: '`class Nom { ... }` déclare une classe. Les membres peuvent avoir une visibilité `+` publique, `-` privée, `#` protégée ou `~` paquet. Une méthode se note avec des parenthèses ; tu peux ajouter types et paramètres.',
        example: 'classDiagram\\n  class Utilisateur {\\n    +String nom\\n    -String motDePasse\\n    +seConnecter() bool\\n  }'
      },
      {
        heading: 'Relations et multiplicités',
        body: 'Relations courantes : `<|--` héritage, `*--` composition, `o--` agrégation, `-->` association, `..>` dépendance et `..|>` réalisation. Ajoute un libellé avec `: texte` et des multiplicités entre guillemets.',
        example: 'classDiagram\\n  Utilisateur "1" --> "*" Commande : passe\\n  Commande *-- LigneCommande\\n  Service ..> Depot : utilise'
      },
      {
        heading: 'Interfaces, annotations et notes',
        body: '`<<interface>>`, `<<abstract>>` ou `<<enumeration>>` annotent une classe. `note for Nom "texte"` ajoute une note. `direction LR` change l’orientation ; `namespace Nom { ... }` regroupe des classes.',
        example: 'classDiagram\\n  class Paiement\\n  <<interface>> Paiement\\n  class CarteBancaire\\n  Paiement <|.. CarteBancaire\\n  note for Paiement "Contrat de paiement"'
      }
    ]
  },
  er: {
    label: 'Entité-association',
    syntax: 'Déclare les relations avec cardinalités et libellés, puis décris les attributs des entités.',
    sections: [
      {
        heading: 'Entités et attributs',
        body: '`erDiagram` commence le diagramme. `ENTITÉ { ... }` liste ses attributs, chacun sous la forme `type nom`. Les marqueurs `PK`, `FK` et `UK` identifient les clés primaire, étrangère et unique ; `nom` après `type` peut ajouter une description.',
        example: 'erDiagram\\n  CLIENT {\\n    int id PK\\n    string nom\\n    string email UK\\n  }'
      },
      {
        heading: 'Relations et cardinalités',
        body: 'Une relation s’écrit `A cardinalité B : libellé`. Chaque extrémité combine la possibilité d’absence (`o` ou `|`) et le nombre (`|` pour un, `{` pour plusieurs). Exemples : `||--o{` un-à-zéro-ou-plusieurs, `||--||` un-à-un, `}|--|{` plusieurs-à-plusieurs.',
        example: 'erDiagram\\n  CLIENT ||--o{ COMMANDE : passe\\n  COMMANDE ||--|{ LIGNE : contient\\n  PRODUIT ||--o{ LIGNE : concerne'
      },
      {
        heading: 'Noms et commentaires',
        body: 'Utilise des identifiants d’entité cohérents et explicites. Le libellé placé après `:` décrit le rôle de la relation. Les noms d’attributs composés et les descriptions peuvent être cités selon la grammaire ER.'
      }
    ]
  },
  architecture: {
    label: 'Architecture',
    syntax: 'Déclare des `service id(icone)[Nom]`, puis relie-les avec les côtés (`serviceA:R --> L:serviceB`).',
    sections: [
      {
        heading: 'Groupes, services et jonctions',
        body: '`architecture-beta` démarre le diagramme. `group id(cloud)[Nom]` crée un groupe ; `service id(server)[Nom]` crée un service. Les icônes proviennent des packs d’icônes Mermaid. `junction id` ajoute un point de jonction.',
        example: 'architecture-beta\\n  group cloud(cloud)[Cloud]\\n  service api(server)[API] in cloud\\n  service db(database)[Base] in cloud\\n  junction j'
      },
      {
        heading: 'Connexions et côtés',
        body: 'Connecte des services avec `source:COTE --> COTE:cible`; côtés valides : `L`, `R`, `T`, `B`. `-->` indique un lien orienté et `--` un lien sans flèche. Les groupes peuvent contenir des services avec `in groupe`.',
        example: 'architecture-beta\\n  service client(internet)[Client]\\n  service api(server)[API]\\n  service db(database)[Base]\\n  client:R --> L:api\\n  api:B --> T:db'
      },
      {
        heading: 'Icônes et disposition',
        body: 'La forme entre parenthèses est un nom d’icône du pack chargé (`cloud`, `server`, `database`, etc.). Garde des identifiants uniques pour pouvoir les référencer dans les connexions. Les groupes servent à organiser les composants par zone ou environnement.'
      }
    ]
  },
  c4: {
    label: 'Architecture C4',
    syntax: 'Choisis un niveau C4 (`C4Context`, `C4Container`, `C4Component` ou `C4Dynamic`), déclare les éléments et relie-les avec `Rel`.',
    sections: [
      {
        heading: 'Niveau et éléments',
        body: 'Le premier mot-clé fixe le niveau : `C4Context`, `C4Container`, `C4Component`, `C4Dynamic` ou `C4Deployment`. Éléments courants : `Person`, `Person_Ext`, `System`, `System_Ext`, `Container`, `ContainerDb`, `Component` et leurs variantes externes.',
        example: 'C4Context\\n  title Contexte du système\\n  Person(client, "Client", "Utilise le service")\\n  System(app, "Application", "Gère les commandes")\\n  System_Ext(pay, "Paiement", "Fournisseur externe")'
      },
      {
        heading: 'Frontières et relations',
        body: '`System_Boundary(id, "Nom") { ... }`, `Container_Boundary` et `Enterprise_Boundary` regroupent les éléments. `Rel(source, cible, "Libellé", "Technologie")` crée une relation ; `BiRel` est bidirectionnel et `Rel_U`, `Rel_D`, `Rel_L`, `Rel_R` imposent une direction.',
        example: 'C4Context\\n  Person(client, "Client")\\n  System(app, "Application")\\n  Rel(client, app, "Passe commande", "HTTPS")'
      },
      {
        heading: 'Présentation et notes',
        body: '`UpdateElementStyle` et `UpdateRelStyle` personnalisent des éléments et relations. `UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")` règle la disposition ; `title` ajoute un titre. Utilise des identifiants uniques entre les déclarations et relations.'
      }
    ]
  },
  block: {
    label: 'Diagramme en blocs',
    syntax: 'Commence par `block-beta`, répartis les blocs avec `columns N`, puis déclare les blocs, espaces et connexions.',
    sections: [
      {
        heading: 'Colonnes, blocs et espaces',
        body: '`block-beta` démarre le diagramme. `columns N` fixe le nombre de colonnes. Un bloc peut être nommé simplement (`A`) ou avec un libellé (`A["Client"]`). `space` réserve une cellule ; `A:2` ou `space:2` étend l’élément sur plusieurs colonnes.',
        example: 'block-beta\\n  columns 3\\n  client["Client"] space api["API"]\\n  client --> api'
      },
      {
        heading: 'Formes et connexions',
        body: 'Le libellé peut utiliser une forme, par exemple `A(("Début"))` ou `db[("Base")]`. Les liens utilisent les connecteurs Mermaid (`-->`, `---`, `-.->`) et peuvent relier les blocs par leurs identifiants.',
        example: 'block-beta\\n  columns 2\\n  client["Client"] api["API"]\\n  db[("Base de données")]\\n  client --> api\\n  api --> db'
      },
      {
        heading: 'Groupes de blocs',
        body: 'Un bloc nommé peut contenir un groupe avec `block:identifiant` suivi de ses éléments, puis `end`. Les groupes permettent de représenter les frontières d’un système tout en conservant une disposition en colonnes.',
        example: 'block-beta\\n  columns 2\\n  block:backend\\n    api["API"]\\n    db[("Base")]\\n  end\\n  api --> db'
      }
    ]
  },
  packet: {
    label: 'Diagramme de paquet réseau',
    syntax: 'Commence par `packet-beta`. Chaque ligne déclare une plage de bits et son libellé, par exemple `0-15: "Port source"`.',
    sections: [
      {
        heading: 'Champs et plages de bits',
        body: 'Une ligne `début-fin: "Nom du champ"` représente un champ sur une plage inclusive. Les positions commencent à 0 et chaque ligne ajoute un champ à la structure du paquet.',
        example: 'packet-beta\\n  0-15: "Port source"\\n  16-31: "Port destination"\\n  32-63: "Numéro de séquence"'
      },
      {
        heading: 'Déclaration par largeur',
        body: 'Mermaid 11.7+ accepte `+N: "Champ"` pour allouer N bits après le champ précédent ; les plages explicites et les largeurs relatives peuvent être mélangées. Les champs sont toujours déclarés du bit bas vers le bit haut.',
        example: 'packet-beta\\n  +1: "Drapeau"\\n  +7: "Réservé"\\n  +8: "Longueur"\\n  16-31: "Port"'
      },
      {
        heading: 'Ordre et configuration',
        body: 'La configuration `packet: { bitOrder: "descending" }` inverse l’affichage des bits sur chaque ligne (Mermaid 12+), sans changer les plages déclarées. `bitsPerRow` règle la largeur d’une ligne dans la configuration du diagramme.'
      }
    ]
  },
  treeView: {
    label: 'Arborescence',
    syntax: 'Commence par `treeView-beta`. L’indentation exprime la hiérarchie ; termine les dossiers par `/`.',
    sections: [
      {
        heading: 'Racine et nœuds enfants',
        body: 'Après `treeView-beta`, écris le nœud racine puis indente chaque enfant sous son parent. Chaque niveau d’indentation crée un niveau hiérarchique ; garde une indentation régulière.',
        example: 'treeView-beta\\n  projet/\\n    src/\\n      App.tsx\\n      styles.css\\n    docs/\\n      guide.md'
      },
      {
        heading: 'Dossiers et feuilles',
        body: 'Ajoute `/` au nom d’un dossier pour le distinguer d’un fichier ou d’une feuille. Les libellés sont affichés tels qu’écrits ; utilise des noms explicites et des identifiants de fichier uniques.'
      }
    ]
  },
  kanban: {
    label: 'Tableau Kanban',
    syntax: 'Commence par `kanban`. Déclare les colonnes avec `id[Nom]`, puis indente les tâches `id[Description]` sous leur colonne.',
    sections: [
      {
        heading: 'Colonnes et tâches',
        body: 'Chaque colonne a un identifiant unique suivi de son titre entre crochets : `todo[À faire]`. Les tâches sont indentées sous la colonne et utilisent la même syntaxe `id[Description]`.',
        example: 'kanban\\n  todo[À faire]\\n    spec[Écrire les spécifications]\\n  doing[En cours]\\n    impl[Développer]\\n  done[Terminé]\\n    review[Valider]'
      },
      {
        heading: 'Métadonnées des tâches',
        body: 'Ajoute des métadonnées après la tâche avec `@{ ... }`. Clés disponibles : `assigned`, `ticket` et `priority` (`Very High`, `High`, `Low`, `Very Low`).',
        example: 'kanban\\n  doing[En cours]\\n    impl[Développer]@{ assigned: "Fred", ticket: "42", priority: "High" }'
      },
      {
        heading: 'Liens vers un outil de suivi',
        body: 'La configuration Mermaid `kanban.ticketBaseUrl` peut contenir une URL avec `#TICKET#`. Le numéro fourni par la métadonnée `ticket` remplace ce marqueur pour créer un lien vers l’issue.'
      }
    ]
  },
  usecase: {
    label: 'Cas d’utilisation',
    syntax: 'Commence par `usecase-beta`. Déclare les acteurs avec `actor`, les cas avec `(Nom)`, puis relie-les.',
    sections: [
      {
        heading: 'Acteurs et cas',
        body: '`actor Identifiant as Libellé` déclare un acteur. Un cas d’utilisation se représente par `(Libellé)` ; relie acteur et cas avec `-->`.',
        example: 'usecase-beta\\n  actor Client\\n  actor Admin\\n  Client --> (Créer un compte)\\n  Client --> (Passer commande)'
      },
      {
        heading: 'Relations et orientation',
        body: 'Relie les acteurs aux cas avec `-->`. Les cas peuvent être reliés par une dépendance `..>` et un libellé tel que `<<include>>` ou `<<extend>>`. `direction TD`, `TB`, `BT`, `LR` ou `RL` choisit l’orientation du diagramme.',
        example: 'usecase-beta\\n  direction LR\\n  actor Client\\n  Client --> (Passer commande)\\n  (Passer commande) ..> (Payer) : <<include>>'
      }
    ]
  },
  info: {
    label: 'Informations',
    syntax: 'Le diagramme `info` affiche les informations de version Mermaid fournies par le moteur.',
    sections: [
      {
        heading: 'Syntaxe',
        body: 'Le type `info` ne demande aucune déclaration supplémentaire : le mot-clé seul constitue le diagramme. Il sert à vérifier que Mermaid est chargé et à afficher sa version.',
        example: 'info'
      }
    ]
  },
  pie: {
    label: 'Diagramme circulaire',
    syntax: 'Ajoute un `title`, puis une valeur par ligne sous la forme `"Catégorie" : nombre`. `showData` affiche les valeurs.',
    sections: [
      {
        heading: 'Titre et secteurs',
        body: '`pie` démarre le diagramme. `title texte` ajoute un titre facultatif. Chaque secteur est une ligne `"Libellé" : valeur` ; les valeurs sont numériques et déterminent la taille relative des parts.',
        example: 'pie\\n  title Budget\\n  "Développement" : 45\\n  "Conception" : 25\\n  "Tests" : 20'
      },
      {
        heading: 'Afficher les nombres et options',
        body: '`showData` placé après `pie` affiche les valeurs en plus des libellés. Les libellés contenant des espaces ou de la ponctuation doivent être entre guillemets. La somme des valeurs n’a pas besoin d’être égale à 100.',
        example: 'pie showData\\n  title Répartition\\n  "Équipe A" : 12\\n  "Équipe B" : 8'
      }
    ]
  },
  quadrantChart: {
    label: 'Diagramme de quadrant',
    syntax: 'Déclare les axes `x-axis` et `y-axis`, nomme les quadrants, puis place des points avec `Nom: [x, y]` (coordonnées de 0 à 1).',
    sections: [
      {
        heading: 'Titre, axes et quadrants',
        body: '`quadrantChart` commence le diagramme. `title` ajoute un titre. `x-axis gauche --> droite` et `y-axis bas --> haut` nomment les extrémités. Les quadrants sont `quadrant-1` (haut droit), `quadrant-2` (haut gauche), `quadrant-3` (bas gauche) et `quadrant-4` (bas droit).',
        example: 'quadrantChart\\n  title Priorités\\n  x-axis Effort faible --> Effort élevé\\n  y-axis Impact faible --> Impact élevé\\n  quadrant-1 À planifier\\n  quadrant-2 Priorité\\n  quadrant-3 Secondaire\\n  quadrant-4 À déléguer'
      },
      {
        heading: 'Points et coordonnées',
        body: 'Un point se note `Libellé: [x, y]`. Les deux coordonnées sont des nombres compris entre 0 et 1 : x mesure la position horizontale et y la verticale. Garde des coordonnées dans cet intervalle pour placer les points à l’intérieur du graphique.',
        example: 'quadrantChart\\n  Fonction A: [0.8, 0.8]\\n  Fonction B: [0.3, 0.6]\\n  Fonction C: [0.2, 0.2]'
      }
    ]
  },
  sankey: {
    label: 'Diagramme de Sankey',
    syntax: 'Après `sankey-beta`, décris chaque flux sur une ligne CSV : `source,cible,valeur`.',
    sections: [
      {
        heading: 'Format des flux',
        body: 'Chaque ligne contient exactement trois champs séparés par des virgules : source, cible et valeur numérique positive. Les noms de source et de cible deviennent des nœuds ; réutilise la même orthographe pour relier les flux.',
        example: 'sankey-beta\\n  Revenu,Logement,40\\n  Revenu,Épargne,30\\n  Revenu,Loisirs,20\\n  Épargne,Investissement,15'
      },
      {
        heading: 'Libellés et cohérence',
        body: 'Le premier mot-clé est `sankey-beta`. Les lignes ne sont pas un tableau Markdown : n’ajoute pas d’en-tête CSV ni de commentaire final. Les valeurs représentent les quantités relatives et contrôlent l’épaisseur des liens.'
      }
    ]
  },
  xychart: {
    label: 'Graphique XY',
    syntax: 'Déclare les axes `x-axis` et `y-axis`, puis ajoute des séries `bar [valeurs]` et/ou `line [valeurs]`.',
    sections: [
      {
        heading: 'Axes',
        body: '`xychart-beta` ouvre le graphique. `x-axis [A, B, C]` définit les catégories ; `x-axis Début --> Fin` définit une échelle continue. `y-axis "Nom" min --> max` configure le domaine vertical.',
        example: 'xychart-beta\\n  title "Ventes mensuelles"\\n  x-axis [Jan, Fév, Mar, Avr]\\n  y-axis "Ventes" 0 --> 100'
      },
      {
        heading: 'Séries et données',
        body: '`bar [nombres]` ajoute des barres ; `line [nombres]` ajoute une courbe. Chaque série doit fournir une valeur par catégorie de l’axe X. Tu peux déclarer plusieurs séries.',
        example: 'xychart-beta\\n  x-axis [Jan, Fév, Mar]\\n  y-axis "Ventes" 0 --> 100\\n  bar [35, 55, 45]\\n  line [25, 45, 60]'
      },
      {
        heading: 'Options de présentation',
        body: '`title "Texte"` ajoute un titre. `x-axis` et `y-axis` peuvent recevoir des libellés entre guillemets ; les bornes min et max du y doivent encadrer les données.'
      }
    ]
  },
  radar: {
    label: 'Diagramme radar',
    syntax: 'Déclare les axes avec `axis`, puis une courbe par ligne avec `curve id{valeurs}`.',
    sections: [
      {
        heading: 'Titre et axes',
        body: '`radar-beta` démarre le diagramme. `title` est facultatif. `axis` définit un ou plusieurs axes, séparés par des virgules ; chaque axe peut recevoir un identifiant et un libellé avec `id["Libellé"]`.',
        example: 'radar-beta\\n  title Comparaison\\n  axis qualité, coût, vitesse, support'
      },
      {
        heading: 'Courbes et valeurs',
        body: '`curve id{v1,v2,...}` crée une série. Les valeurs suivent l’ordre des axes ; tu peux leur donner un libellé (`id["Nom"]`) ou préciser les valeurs par identifiant d’axe (`axe: valeur`). Le nombre de valeurs doit correspondre aux axes.',
        example: 'radar-beta\\n  axis qualité, coût, vitesse\\n  curve produitA["Produit A"]{80,60,70}\\n  curve produitB{65,85,75}'
      },
      {
        heading: 'Échelle et légende',
        body: '`min` et `max` définissent l’échelle. `showLegend true|false` affiche ou masque la légende ; `graticule circle|polygon` choisit le quadrillage et `ticks N` son nombre de graduations.',
        example: 'radar-beta\\n  axis qualité, coût, vitesse\\n  curve produit{80,60,70}\\n  min 0\\n  max 100\\n  showLegend true\\n  graticule polygon\\n  ticks 5'
      }
    ]
  },
  treemap: {
    label: 'Treemap',
    syntax: 'Commence par `treemap-beta`. L’indentation crée la hiérarchie ; les feuilles portent une valeur numérique après `:`.',
    sections: [
      {
        heading: 'Branches et feuilles',
        body: 'Les noms sont entre guillemets. Un nœud parent s’écrit `"Section"` ; un nœud feuille `"Élément": valeur`. Indente les enfants sous leur parent pour former l’arborescence. Les valeurs doivent être positives.',
        example: 'treemap-beta\\n"Développement"\\n  "Interface": 30\\n  "Serveur"\\n    "API": 12\\n    "Base": 8\\n"Design"\\n  "Recherche": 15'
      },
      {
        heading: 'Style et valeurs',
        body: 'Le suffixe `:::classe` associe une classe de style à un nœud ; `classDef` peut définir des styles partagés. La configuration `showValues` affiche les valeurs et `valueFormat` contrôle leur format d’affichage.',
        example: 'treemap-beta\\n"Budget":::groupe\\n  "Produit": 30:::important\\n  "Support": 10\\n\\nclassDef important fill:#efe,stroke:#484'
      },
      {
        heading: 'Interprétation',
        body: 'La surface des rectangles est proportionnelle à leur valeur. Utilise une hiérarchie cohérente et des valeurs positives ; les données négatives et les valeurs très petites sont difficiles à représenter.'
      }
    ]
  },
  venn: {
    label: 'Diagramme de Venn',
    syntax: 'Déclare les ensembles avec `set`, puis les intersections avec `union`. Les identifiants utilisés dans une union doivent déjà être déclarés.',
    sections: [
      {
        heading: 'Ensembles et libellés',
        body: '`venn-beta` démarre le diagramme. `set id["Libellé"]:taille` définit un ensemble ; l’identifiant peut être un mot ou une chaîne entre guillemets. Le libellé est facultatif.',
        example: 'venn-beta\\nset A["Musique"]:10\\nset B["Lecture"]:8'
      },
      {
        heading: 'Intersections',
        body: '`union A,B:taille` définit la taille de l’intersection. Trois identifiants ou plus sont acceptés ; Mermaid affiche aussi les recouvrements deux à deux impliqués. Les ensembles cités doivent être déclarés auparavant.',
        example: 'venn-beta\\nset A["Musique"]:10\\nset B["Lecture"]:8\\nset C["Voyage"]:6\\nunion A,B:3\\nunion A,B,C:1'
      },
      {
        heading: 'Annotations et style',
        body: '`text "Libellé"` place du texte dans le dernier ensemble ou union déclaré ; une ligne indentée lui rattache le texte. `style id fill:#...,color:#...,stroke:#...` personnalise remplissage, texte et contour.',
        example: 'venn-beta\\nset A["Musique"]:10\\n  text Favoris\\nset B["Lecture"]:8\\nunion A,B:3\\n  text Loisirs partagés'
      }
    ]
  },
  requirement: {
    label: 'Diagramme d’exigences',
    syntax: 'Déclare les exigences et éléments dans des blocs, puis relie-les avec une relation typée.',
    sections: [
      {
        heading: 'Exigences',
        body: '`requirement Nom { ... }` déclare une exigence. Types disponibles : `requirement`, `functionalRequirement`, `interfaceRequirement`, `performanceRequirement`, `physicalRequirement` et `designConstraint`. Champs : `id`, `text`, `risk` (`low`, `medium`, `high`) et `verifymethod` (`analysis`, `inspection`, `test`, `demonstration`).',
        example: 'requirementDiagram\\n  requirement auth {\\n    id: 1\\n    text: L’utilisateur peut se connecter.\\n    risk: low\\n    verifymethod: test\\n  }'
      },
      {
        heading: 'Éléments et relations',
        body: '`element Nom { type: ... docref: ... }` décrit un élément et peut pointer vers une documentation. Les relations suivent `source - type -> cible` ou `cible <- type - source`. Types : `contains`, `copies`, `derives`, `satisfies`, `verifies`, `refines` et `traces`.',
        example: 'requirementDiagram\\n  requirement auth {\\n    id: 1\\n    text: Connexion sécurisée\\n    risk: medium\\n    verifymethod: test\\n  }\\n  element login {\\n    type: function\\n  }\\n  login - satisfies -> auth'
      },
      {
        heading: 'Orientation et style',
        body: '`direction TB`, `BT`, `LR` ou `RL` règle l’orientation. `style id ...`, `classDef nom ...` et `class id nom` personnalisent les éléments ; `:::nom` applique une classe directement dans une déclaration. Les identifiants de relation doivent référencer des éléments déclarés.'
      }
    ]
  },
  ishikawa: {
    label: 'Diagramme d’Ishikawa',
    syntax: 'La première ligne nomme l’effet étudié. Ajoute les causes et sous-causes sur des lignes indentées.',
    sections: [
      {
        heading: 'Effet et causes principales',
        body: '`ishikawa-beta` démarre le diagramme ; le texte de la ligne suivante devient l’effet (la tête du poisson). Les lignes de premier niveau définissent les familles de causes.',
        example: 'ishikawa-beta\\nRetard de livraison\\n  Méthodes\\n  Matériel\\n  Personnel\\n  Environnement'
      },
      {
        heading: 'Sous-causes et structure',
        body: 'Indente une cause sous sa catégorie pour en faire une sous-cause ; des niveaux supplémentaires permettent de détailler les causes racines. Garde une indentation régulière et formule chaque nœud comme un facteur concis.',
        example: 'ishikawa-beta\\nRetard de livraison\\n  Méthodes\\n    Processus imprécis\\n      Absence de contrôle\\n  Matériel\\n    Outils obsolètes'
      }
    ]
  },
  cynefin: {
    label: 'Diagramme Cynefin',
    syntax: 'Commence par `cynefin-beta`, ajoute les domaines et leurs éléments, puis des relations entre domaines.',
    sections: [
      {
        heading: 'Domaines et éléments',
        body: 'Les domaines principaux sont `clear`, `complicated`, `complex`, `chaotic` et `confusion`. Ajoute les libellés d’éléments entre guillemets sous le domaine correspondant ; `title` ajoute un titre.',
        example: 'cynefin-beta\\ntitle Choisir une approche\\n\\ncomplex\\n"Expérimenter"\\n\\ncomplicated\\n"Consulter un expert"\\n\\nclear\\n"Suivre le processus"'
      },
      {
        heading: 'Relations et transitions',
        body: 'Relie les domaines avec `source --> cible : "libellé"`. Une relation nommée peut décrire le changement de contexte ou l’apprentissage qui justifie le passage d’un domaine à un autre.',
        example: 'cynefin-beta\\ncomplex\\n"Expérimenter"\\ncomplicated\\n"Modéliser"\\ncomplex --> complicated : "Motif identifié"'
      }
    ]
  },
  wardley: {
    label: 'Carte Wardley',
    syntax: 'Commence par `wardley-beta`, place les composants avec des coordonnées `[visibilité, évolution]` entre 0 et 1, puis relie leurs dépendances.',
    sections: [
      {
        heading: 'Titre, ancre et composants',
        body: '`title` ajoute le titre et `size [largeur, hauteur]` règle le canevas. `anchor Nom [visibilité, évolution]` place l’utilisateur ; `component Nom [visibilité, évolution]` place les composants. La visibilité est l’axe vertical et l’évolution l’axe horizontal ; les deux valeurs vont de 0 à 1.',
        example: 'wardley-beta\\ntitle Service de commande\\nanchor Client [0.95, 0.1]\\ncomponent Site [0.7, 0.3]\\ncomponent API [0.5, 0.5]\\ncomponent Cloud [0.2, 0.8]'
      },
      {
        heading: 'Dépendances et évolution',
        body: '`A -> B` ou `A --> B` relie des composants. `-.->` dessine une dépendance pointillée ; `+>` et `+<` représentent un flux orienté, `+<>` un flux bidirectionnel. `evolve Nom valeur` fait évoluer un composant.',
        example: 'wardley-beta\\nanchor Client [0.95, 0.1]\\ncomponent Site [0.7, 0.3]\\ncomponent API [0.5, 0.5]\\ncomponent Cloud [0.2, 0.8]\\nClient -> Site\\nSite -> API\\nAPI -> Cloud'
      },
      {
        heading: 'Décorations et annotations',
        body: 'Les composants acceptent des décorateurs comme `(build)`, `(buy)`, `(outsource)`, `(market)` et `(inertia)`. `label [x, y]` décale un libellé. `note "Texte" [visibilité, évolution]` pose une note ; `annotation numéro,[x,y] "Texte"` ajoute une annotation numérotée. `pipeline` et les déclarations de stages personnalisent les étapes d’évolution.',
        example: 'wardley-beta\\ncomponent API [0.5, 0.5] (build)\\ncomponent Cloud [0.2, 0.8] (buy)\\nAPI -> Cloud\\nnote "À externaliser" [0.3, 0.5]\\nannotation 1,[0.5,0.5] "Décision"'
      }
    ]
  },
  railroad: {
    label: 'Grammaire Railroad',
    syntax: 'Déclare une règle avec `nom = expression ;` et compose-la avec les constructeurs de grammaire.',
    sections: [
      {
        heading: 'Règles et terminaux',
        body: 'Une règle prend la forme `nom = expression ;`. `terminal("texte")` affiche un symbole terminal ; `nonTerminal("nom")` référence une règle définie ailleurs.',
        example: 'railroad-beta\\nexpression = sequence(terminal("nombre"), zeroOrMore(sequence(terminal("+"), terminal("nombre"))));'
      },
      {
        heading: 'Composer les expressions',
        body: '`sequence(a, b)` impose l’ordre ; `choice(a, b)` représente une alternative ; `optional(a)` rend un élément facultatif ; `zeroOrMore(a)` représente zéro ou plusieurs répétitions ; `oneOrMore(a)` une ou plusieurs.',
        example: 'railroad-beta\\nexpression = sequence(terminal("nombre"), optional(sequence(terminal("."), terminal("fraction"))));'
      }
    ]
  },
  railroadEbnf: {
    label: 'Grammaire EBNF',
    syntax: 'Déclare les règles sous la forme `nom = expression ;`. Les terminaux sont entre guillemets ; `{ ... }` indique une répétition.',
    sections: [
      {
        heading: 'Règles et terminaux',
        body: 'Chaque règle commence par un nom, suivi de `=` et se termine par `;`. Un terminal est écrit entre guillemets ; un autre nom référence une règle. `|` sépare les alternatives.',
        example: 'railroad-ebnf-beta\\n  expression = term, { "+", term } ;\\n  term = "nombre" ;'
      },
      {
        heading: 'Répétitions et options',
        body: '`{ ... }` signifie zéro ou plusieurs répétitions ; `[ ... ]` signifie un élément facultatif. La virgule exprime une séquence. Les parenthèses peuvent grouper une expression avant de lui appliquer une répétition.',
        example: 'railroad-ebnf-beta\\n  liste = élément, { ",", élément } ;\\n  nombre = chiffre, { chiffre }, [ ".", chiffre, { chiffre } ] ;\\n  chiffre = "0" | "1" | "2" ;'
      }
    ]
  },
  railroadAbnf: {
    label: 'Grammaire ABNF',
    syntax: 'Déclare les règles sous la forme `nom = expression ;`. ABNF utilise des opérateurs de répétition et des terminaux entre guillemets.',
    sections: [
      {
        heading: 'Règles et références',
        body: 'Une règle s’écrit `nom = expression ;`. Les noms sans guillemets référencent d’autres règles ; les terminaux textuels sont entre guillemets. Les règles peuvent être combinées en séquence.',
        example: 'railroad-abnf-beta\\nexpression = 1*DIGIT ;\\nDIGIT = "0" / "1" / "2" ;'
      },
      {
        heading: 'Choix et répétitions',
        body: '`/` représente un choix. `*élément` autorise zéro ou plusieurs répétitions ; `1*élément` en exige au moins une ; `3*5élément` borne leur nombre. Les parenthèses regroupent les expressions.',
        example: 'railroad-abnf-beta\\nnumber = 1*DIGIT [ "." 1*DIGIT ] ;\\nDIGIT = "0" / "1" / "2" / "3" / "4" / "5" / "6" / "7" / "8" / "9" ;'
      }
    ]
  },
  railroadPeg: {
    label: 'Grammaire PEG',
    syntax: 'Déclare les règles sous la forme `nom <- expression ;`. `/` exprime un choix ordonné ; `*`, `+` et `?` expriment les répétitions.',
    sections: [
      {
        heading: 'Règles et choix',
        body: 'Chaque règle prend la forme `nom <- expression ;`. Les chaînes entre guillemets sont des terminaux. L’opérateur `/` choisit la première alternative qui correspond (choix ordonné).',
        example: 'railroad-peg-beta\\nexpression <- number ("+" number)* ;\\nnumber <- [0-9]+ ;'
      },
      {
        heading: 'Répétitions et prédicats',
        body: '`*` signifie zéro ou plusieurs répétitions, `+` une ou plusieurs et `?` un élément facultatif. `.` accepte un caractère quelconque ; `!` et `&` sont les prédicats négatif et positif en PEG.',
        example: 'railroad-peg-beta\\nnumber <- [0-9]+ ("." [0-9]+)? ;\\nidentifier <- [a-zA-Z_] [a-zA-Z0-9_]* ;'
      }
    ]
  },
  mindmap: {
    label: 'Carte mentale',
    syntax: 'Commence par `mindmap`, puis écris les idées sur des lignes indentées : chaque niveau devient une branche de l’idée parente.',
    sections: [
      {
        heading: 'Racine et hiérarchie',
        body: 'Après `mindmap`, la première idée est la racine. Indente les idées filles sous leur parent ; chaque niveau d’indentation crée une branche supplémentaire.',
        example: 'mindmap\\n  Projet\\n    Recherche\\n      Besoins\\n      Utilisateurs\\n    Réalisation\\n      Développement\\n      Tests'
      },
      {
        heading: 'Formes et libellés',
        body: 'Les nœuds peuvent utiliser des formes : `((racine))` pour un cercle, `(rond)` pour des angles arrondis, `)nuage(` pour une forme nuage, `))hexagone((` et `)forme(` pour des formes spéciales. Les libellés entre crochets ou guillemets permettent des identifiants textuels explicites.',
        example: 'mindmap\\n  ((Projet))\\n    (Idée)\\n    ))Décision((\\n    )Nuage('
      },
      {
        heading: 'Lisibilité',
        body: 'Utilise une indentation cohérente et garde les libellés concis. Un nœud par ligne facilite le déplacement des idées et la lecture de la structure.'
      }
    ]
  }
}

export const mermaidTemplates: MermaidTemplate[] = [
  {
    id: 'flowchart-v2',
    label: 'Organigramme',
    category: 'Flux et processus',
    code: 'flowchart TD\n  A[Départ] --> B{Décision}\n  B -->|Oui| C[Terminé]\n  B -->|Non| D[Réessayer]\n  D --> B'
  },
  {
    id: 'flowchart-elk',
    label: 'Organigramme (ELK)',
    category: 'Flux et processus',
    code: 'flowchart-elk LR\n  A[Start] --> B[Step 1]\n  A --> C[Step 2]\n  B --> D[End]\n  C --> D'
  },
  {
    id: 'sequence',
    label: 'Diagramme de séquence',
    category: 'Flux et processus',
    code: 'sequenceDiagram\n  Alice->>Bob: Bonjour !\n  Bob-->>Alice: Salut !'
  },
  {
    id: 'stateDiagram',
    label: 'Diagramme d’état',
    category: 'Flux et processus',
    code: 'stateDiagram-v2\n  [*] --> Inactif\n  Inactif --> Actif: démarrer\n  Actif --> Inactif: arrêter\n  Actif --> [*]: terminer'
  },
  {
    id: 'journey',
    label: 'Parcours utilisateur',
    category: 'Flux et processus',
    code: 'journey\n  title Parcours de réservation\n  section Recherche\n    Trouver un trajet: 5: Client\n    Comparer les offres: 4: Client\n  section Réservation\n    Confirmer le choix: 3: Client, Service\n    Recevoir le billet: 5: Service'
  },
  {
    id: 'gantt',
    label: 'Diagramme de Gantt',
    category: 'Flux et processus',
    code: 'gantt\n  title Projet\n  dateFormat YYYY-MM-DD\n  section Préparation\n    Cadrage :a1, 2026-01-01, 3d\n    Maquette :a2, after a1, 4d\n  section Réalisation\n    Développement :b1, after a2, 6d\n    Livraison :b2, after b1, 2d'
  },
  {
    id: 'timeline',
    label: 'Frise chronologique',
    category: 'Flux et processus',
    code: 'timeline\n  title Histoire du projet\n  2024 : Première idée\n  2025 : Prototype\n       : Tests utilisateurs\n  2026 : Lancement'
  },
  {
    id: 'gitGraph',
    label: 'Historique Git',
    category: 'Flux et processus',
    code: 'gitGraph\n  commit id: "Initialisation"\n  branch feature\n  commit id: "Nouvelle fonctionnalité"\n  checkout main\n  commit id: "Correctif"\n  merge feature'
  },
  {
    id: 'eventmodeling',
    label: 'Modélisation événementielle',
    category: 'Flux et processus',
    code: 'eventmodeling\n\ntf 01 ui CartUI\ntf 02 cmd AddItem\ntf 03 evt ItemAdded'
  },
  {
    id: 'swimlane',
    label: 'Couloirs de processus',
    category: 'Flux et processus',
    code: 'swimlane-beta LR\n  subgraph client[Client]\n    A[Passer commande]\n  end\n  subgraph boutique[Boutique]\n    B[Preparer commande]\n  end\n  subgraph livraison[Livraison]\n    C[Livrer]\n  end\n  A --> B --> C'
  },
  {
    id: 'agentflow',
    label: 'Flux d’agents IA',
    category: 'Flux et processus',
    code: 'agentflow-beta LR\n  question[Question] --> assistant[Assistant]\n  assistant --> search[Recherche]\n  search --> assistant\n  assistant --> answer[Reponse]'
  },
  {
    id: 'classDiagram',
    label: 'Diagramme de classes',
    category: 'Architecture et données',
    code: 'classDiagram\n  class Utilisateur {\n    +String nom\n    +seConnecter()\n  }\n  class Commande {\n    +Date date\n    +confirmer()\n  }\n  Utilisateur "1" --> "*" Commande'
  },
  {
    id: 'er',
    label: 'Entité-association',
    category: 'Architecture et données',
    code: 'erDiagram\n  CLIENT ||--o{ COMMANDE : passe\n  COMMANDE ||--|{ LIGNE : contient\n  CLIENT {\n    int id\n    string nom\n  }\n  COMMANDE {\n    int id\n    date date\n  }'
  },
  {
    id: 'architecture',
    label: 'Architecture',
    category: 'Architecture et données',
    code: 'architecture-beta\n  service web(server)[Site web]\n  service api(server)[API]\n  service db(database)[Base de données]\n  web:R --> L:api\n  api:R --> L:db'
  },
  {
    id: 'c4',
    label: 'Architecture C4',
    category: 'Architecture et données',
    code: 'C4Context\n  title Contexte du système\n  Person(client, "Client", "Utilise le service")\n  System(app, "Application", "Gère les commandes")\n  System_Ext(pay, "Paiement", "Fournisseur externe")\n  Rel(client, app, "Passe commande")\n  Rel(app, pay, "Paie via")'
  },
  {
    id: 'block',
    label: 'Diagramme en blocs',
    category: 'Architecture et données',
    code: 'block-beta\n  columns 3\n  client["Client"] space api["API"]\n  client --> api\n  api --> db[("Base de données")]'
  },
  {
    id: 'packet',
    label: 'Diagramme de paquet réseau',
    category: 'Architecture et données',
    code: 'packet-beta\n  0-15: "Port source"\n  16-31: "Port destination"\n  32-63: "Numéro de séquence"\n  64-95: "Données"'
  },
  {
    id: 'treeView',
    label: 'Arborescence',
    category: 'Architecture et données',
    code: 'treeView-beta\n  projet/\n    src/\n      App.tsx\n      styles.css\n    docs/\n      guide.md'
  },
  {
    id: 'kanban',
    label: 'Tableau Kanban',
    category: 'Architecture et données',
    code: 'kanban\n  todo[Backlog]\n    needs[Definir les besoins]\n  doing[En cours]\n    mockup[Creer la maquette]\n  done[Termine]\n    setup[Initialiser le projet]'
  },
  {
    id: 'usecase',
    label: 'Cas d’utilisation',
    category: 'Architecture et données',
    code: 'usecase-beta\n  actor Client\n  actor Admin\n  Client --> (Creer un compte)\n  Client --> (Passer commande)\n  Admin --> (Gerer le catalogue)'
  },
  {
    id: 'info',
    label: 'Informations',
    category: 'Architecture et données',
    code: 'info'
  },
  {
    id: 'pie',
    label: 'Diagramme circulaire',
    category: 'Graphiques',
    code: 'pie showData\n  title Répartition du budget\n  "Développement" : 45\n  "Conception" : 25\n  "Tests" : 20\n  "Autre" : 10'
  },
  {
    id: 'quadrantChart',
    label: 'Diagramme de quadrant',
    category: 'Graphiques',
    code: 'quadrantChart\n  title Priorités du projet\n  x-axis Effort faible --> Effort élevé\n  y-axis Impact faible --> Impact élevé\n  quadrant-1 À planifier\n  quadrant-2 Priorité\n  quadrant-3 Secondaire\n  quadrant-4 À déléguer\n  Fonction A: [0.8, 0.8]\n  Fonction B: [0.3, 0.6]'
  },
  {
    id: 'sankey',
    label: 'Diagramme de Sankey',
    category: 'Graphiques',
    code: 'sankey-beta\n  Revenu,Logement,40\n  Revenu,Épargne,30\n  Revenu,Loisirs,20\n  Revenu,Autre,10'
  },
  {
    id: 'xychart',
    label: 'Graphique XY',
    category: 'Graphiques',
    code: 'xychart-beta\n  title "Ventes mensuelles"\n  x-axis [Jan, Fév, Mar, Avr]\n  y-axis "Ventes" 0 --> 100\n  bar [35, 55, 45, 80]\n  line [25, 45, 60, 75]'
  },
  {
    id: 'radar',
    label: 'Diagramme radar',
    category: 'Graphiques',
    code: 'radar-beta\n  title Product comparison\n  axis quality, cost, speed, support\n  curve productA{80,60,70,90}\n  curve productB{65,85,75,60}'
  },
  {
    id: 'treemap',
    label: 'Treemap',
    category: 'Graphiques',
    code: 'treemap-beta\n"Development"\n    "Frontend": 30\n    "Backend": 20\n"Design"\n    "Research": 15\n    "Prototype": 10'
  },
  {
    id: 'venn',
    label: 'Diagramme de Venn',
    category: 'Graphiques',
    code: 'venn-beta\nset A["Music"]:10\nset B["Reading"]:8\nunion A,B:3'
  },
  {
    id: 'requirement',
    label: 'Diagramme d’exigences',
    category: 'Analyse',
    code: 'requirementDiagram\n  requirement auth {\n    id: 1\n    text: The user can sign in.\n    risk: low\n    verifymethod: test\n  }\n  element login {\n    type: function\n  }\n  login - satisfies -> auth'
  },
  {
    id: 'ishikawa',
    label: 'Diagramme d’Ishikawa',
    category: 'Analyse',
    code: 'ishikawa-beta\nLate delivery\n  Methods\n    Unclear process\n  Equipment\n    Outdated tools\n  People\n    Training'
  },
  {
    id: 'cynefin',
    label: 'Diagramme Cynefin',
    category: 'Analyse',
    code: 'cynefin-beta\ntitle Choosing an approach\n\ncomplex\n"Experiment with options"\n\ncomplicated\n"Ask an expert"\n\nclear\n"Follow a known process"\n\nchaotic\n"Take immediate action"\n\nconfusion\n"Assess the situation"\n\ncomplex --> complicated : "Pattern identified"'
  },
  {
    id: 'wardley',
    label: 'Carte Wardley',
    category: 'Analyse',
    code: 'wardley-beta\ntitle Online ordering service\nanchor Customer [0.95, 0.1]\ncomponent Website [0.7, 0.3]\ncomponent API [0.5, 0.5]\ncomponent Cloud [0.2, 0.8]\nCustomer -> Website\nWebsite -> API\nAPI -> Cloud'
  },
  {
    id: 'railroad',
    label: 'Grammaire Railroad',
    category: 'Grammaires',
    code: 'railroad-beta\nexpression = sequence(terminal("number"), zeroOrMore(sequence(terminal("+"), terminal("number"))));'
  },
  {
    id: 'railroadEbnf',
    label: 'Grammaire EBNF',
    category: 'Grammaires',
    code: 'railroad-ebnf-beta\n  expression = term, { "+", term } ;\n  term = "number" ;'
  },
  {
    id: 'railroadAbnf',
    label: 'Grammaire ABNF',
    category: 'Grammaires',
    code: 'railroad-abnf-beta\nexpression = 1*DIGIT ;'
  },
  {
    id: 'railroadPeg',
    label: 'Grammaire PEG',
    category: 'Grammaires',
    code: 'railroad-peg-beta\nexpression <- "number" ;'
  },
  {
    id: 'mindmap',
    label: 'Carte mentale',
    category: 'Flux et processus',
    code: 'mindmap\n  Projet\n    Recherche\n      Besoins\n      Utilisateurs\n    Conception\n      Maquette\n    Réalisation\n      Développement\n      Tests'
  }
]

export function getMermaidSyntaxHelp(chart: string): (MermaidSyntaxHelp & { templateId: string }) | null {
  const lines = chart.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const template = mermaidTemplates.find(({ code }) => {
    const keyword = code.split(/\r?\n/, 1)[0].trim().split(/\s+/, 1)[0]
    const keywordPattern = new RegExp(`^${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'i')
    return lines.some((line) => keywordPattern.test(line))
  })

  if (!template) return null
  const help = syntaxHelp[template.id]
  return help ? { ...help, templateId: template.id } : null
}
