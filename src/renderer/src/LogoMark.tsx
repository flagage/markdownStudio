interface LogoMarkProps {
  className: string
}

export default function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Logo Plumelier"
    >
      <rect width="40" height="40" rx="11" fill="var(--brand-color)" />
      <path d="M8 4h15l9 9v23H8z" fill="#fff" />
      <path d="M23 4v9h9" fill="#e8ece5" />
      <path
        d="M12 30c1-10 7-19 17-22 0 10-5 18-15 21z"
        fill="#34483b"
      />
      <path
        d="M11 31c6-9 12-16 18-23"
        fill="none"
        stroke="#d4dfd1"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
    </svg>
  )
}
