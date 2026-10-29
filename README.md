# Markdown Studio

Editeur Markdown de bureau en TypeScript avec explorateur de fichiers, édition,
aperçu en direct et rendu des blocs Mermaid.

## Démarrer

Prérequis : Node.js 22.12 ou plus récent.

```sh
npm install
npm run dev
```

## Fonctions du socle

- Ouvrir un dossier local et naviguer dans ses sous-dossiers.
- Parcourir les fichiers et dossiers triés par ordre alphabétique.
- Déplacer les fichiers et dossiers par glisser-déposer ou en cliquant sur « Déplacer », puis sur la destination.
- Garder plusieurs notes ouvertes dans des onglets et afficher deux documents côte à côte.
- Créer des dossiers et des fichiers `.md`.
- Modifier et enregistrer un fichier avec `Ctrl+S` ou `Cmd+S`.
- Écrire directement dans une vue mise en forme, avec une barre d’outils pour les titres,
  le gras, l’italique, les listes, les citations et les blocs de code.
- Basculer à tout moment entre l’édition visuelle et le Markdown brut.
- Insérer l’un des modèles Mermaid disponibles à l’endroit du curseur depuis le menu contextuel (clic droit).
- Éditer les diagrammes Mermaid dans le document et basculer leur bloc entre aperçu et code.
- Afficher les graphiques Mermaid `xychart-beta` même si les séries ont des longueurs différentes :
  le rendu se limite aux catégories ayant une valeur dans chaque série et signale les points ignorés.
- Gérer les images, tables Markdown et listes de tâches affichées avec leur case à cocher sur la même ligne.

## Licence

Markdown Studio est distribué sous licence MIT. Voir [LICENSE](./LICENSE).
Cette licence permissive est compatible avec Mermaid, également distribué sous
licence MIT. Les dépendances tierces conservent leurs propres licences, qui
doivent être respectées lors de la distribution.

Copyright (c) 2026 Fred <fred@lagage.fr>

## Installeurs

Node.js 22.12 ou ultérieur est requis pour créer les paquets.

- Linux x64 : `npm run dist:linux` produit un AppImage et un paquet `.deb` dans `release/`.
- Windows x64 : `npm run dist:win` produit un installeur NSIS `.exe` dans `release/`. Pour construire depuis Linux, utilisez le workflow GitHub Actions ci-dessous ou un environnement Windows.

Le workflow manuel **Build installers** (Actions → Build installers → Run workflow)
construit les paquets Linux et Windows sur leurs plateformes respectives et les
publie comme artefacts téléchargeables.

Pour installer le paquet Debian : `sudo apt install ./release/markdown-studio-<version>-linux-amd64.deb`.
L’AppImage nécessite FUSE 2. Sur Debian/Ubuntu, installez `libfuse2` (ou
`libfuse2t64` sur les versions qui fournissent ce paquet), puis lancez-le sans
`sudo` : `./release/markdown-studio-<version>-linux-x86_64.AppImage`.
Si FUSE ne peut pas être installé, le contenu peut être extrait avec
`./release/markdown-studio-<version>-linux-x86_64.AppImage --appimage-extract`,
puis l’application lancée depuis le répertoire `squashfs-root`.
Sous Windows, lancez le fichier `.exe` généré et suivez l’assistant NSIS.
