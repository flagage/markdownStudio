const iconPaths = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  filePlus: 'M7 3h7l5 5v13H7zM14 3v5h5M13 12v6M10 15h6',
  folderPlus: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10v6M9 13h6',
  fileOpen: 'M7 3h7l5 5v4M14 3v5h5M7 3v18h6M15 16h6M18 13l3 3-3 3',
  folderOpen: 'M3 17V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1M3 17l2.5-6h16L19 17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  parent: 'M10 9 5 14l5 5M5 14h9a5 5 0 0 0 5-5V4',
  template: 'M4 4h16v5H4zM4 13h7v7H4zM15 13h5v7h-5z',
  move: 'M12 3v18M3 12h18M12 3 9 6M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  printer: 'M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
  filePdf: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h1.5a1.5 1.5 0 0 1 0 3H10v-3zM10 16v2',
  fileWord: 'M7 3h7l5 5v13H7zM14 3v5h5M9.5 12l1.2 5 1.3-3.5 1.3 3.5 1.2-5',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1',
  help: 'M9.1 9a3 3 0 1 1 5.2 2c-1.1 1.1-2.3 1.5-2.3 3M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  split: 'M4 5h16v14H4zM12 5v14',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'
} as const

export type IconName = keyof typeof iconPaths

export default function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}
