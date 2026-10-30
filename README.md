# Markdown Studio

A TypeScript desktop Markdown editor with a file explorer, live editing,
preview, and Mermaid diagram rendering.

## Getting started

Requirement: Node.js 22.12 or later.

```sh
npm install
npm run dev
```

## Features

- Open a local folder and navigate its subfolders.
- Open a `.md` file directly from the File menu or by dragging it into the application.
- Open `.md` files from the desktop by associating them with Markdown Studio.
- Browse files and folders sorted alphabetically.
- Move files and folders by dragging and dropping, or by clicking “Move” and then the destination.
- Rename a file or folder from its context menu (right-click).
- Keep multiple notes open in tabs and view two documents side by side.
- Create folders and `.md` files.
- Create Markdown templates, manage them from the explorer, or turn an existing file into a template using its context menu (right-click). Templates are available in all workspaces and can be used when creating a file.
- Edit and save files with `Ctrl+S` or `Cmd+S`.
- Write directly in a formatted view, with a toolbar for headings, bold, italics, lists, quotes, and code blocks.
- Insert PNG, JPEG, GIF, WebP, or BMP images from the editor toolbar; images are embedded in the Markdown and displayed inline.
- Switch between visual editing and raw Markdown at any time.
- Insert one of the available Mermaid templates at the cursor from the context menu (right-click).
- Edit Mermaid diagrams in the document and switch their blocks between preview and code.
- Render Mermaid `xychart-beta` charts even when series have different lengths: rendering is limited to categories with a value in every series, and skipped points are reported.
- Work with images, Markdown tables, and task lists whose checkboxes appear on the same line.

## License

Markdown Studio is distributed under the MIT license. See [LICENSE](./LICENSE).
This permissive license is compatible with Mermaid, which is also distributed
under the MIT license. Third-party dependencies retain their own licenses,
which must be respected when distributing the application.

Copyright (c) 2026 Fred <fred@lagage.fr>

## Installers

Node.js 22.12 or later is required to build the packages.

- Linux x64: `npm run dist:linux` creates an AppImage and a `.deb` package in `release/`.
- Windows x64: `npm run dist:win` creates an NSIS `.exe` installer in `release/`. To build on Linux, use the GitHub Actions workflow below or a Windows environment.

The manual **Build installers** workflow (Actions → Build installers → Run workflow)
builds the Linux and Windows packages on their respective platforms and
publishes them as downloadable artifacts.

To install the Debian package: `sudo apt install ./release/markdown-studio-<version>-linux-amd64.deb`.
The AppImage requires FUSE 2. On Debian/Ubuntu, install `libfuse2` (or
`libfuse2t64` on versions that provide it), then run the AppImage without
`sudo`: `./release/markdown-studio-<version>-linux-x86_64.AppImage`.
If FUSE cannot be installed, the contents can be extracted with
`./release/markdown-studio-<version>-linux-x86_64.AppImage --appimage-extract`,
then launch the application from the `squashfs-root` directory.
On Windows, run the generated `.exe` file and follow the NSIS installer.
