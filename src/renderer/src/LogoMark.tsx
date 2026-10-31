interface LogoMarkProps {
  className: string
}

export default function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Logo Markdown Studio"
    >
      <rect width="40" height="40" rx="11" fill="var(--brand-color)" />
      <path d="M11 7h12l7 7v19H11z" fill="#fff" />
      <path d="M23 7v7h7" fill="#e8ece5" />
      <path
        d="M14.5 20h3l2.5 3.2 2.5-3.2h3v10h-3v-5l-2.5 3-2.5-3v5h-3z"
        fill="#34483b"
      />
    </svg>
  )
}
