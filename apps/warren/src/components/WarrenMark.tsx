/** Warren mark — nested arcs / burrow (single ink, no gradient orb). */
export function WarrenMark({ className = 'brand-mark' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="40" height="40" rx="10" fill="#1F4B3F" />
      <path
        d="M10 26.5c0-7.5 4.2-12.5 10-12.5s10 5 10 12.5"
        stroke="#E4EEEA"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M14 26.5c0-4.8 2.5-8 6-8s6 3.2 6 8"
        stroke="#E4EEEA"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="26.5" r="2.2" fill="#E4EEEA" />
    </svg>
  )
}
