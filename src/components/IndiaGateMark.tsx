/** Compact namaste mark for navbar. */
export function IndiaGateMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="#F7F1E6"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0,2)"
      >
        <path d="M32 6c-12 2-20 11-21 21-1 6 1 12 5 17 2 3 4 7 3 10" />
        <path d="M32 6c12 2 20 11 21 21 1 6-1 12-5 17-2 3-4 7-3 10" />
        <path d="M16 50c4 10 10 15 16 15s12-5 16-15" />
        <path d="M24 22c2-7 5-10 8-10s6 3 8 10c1 4 0 8-3 11-3 2-4 3-5 3s-2-1-5-3c-3-3-4-7-3-11z" />
        <path d="M27 28c2 1 3 1 5 0" />
        <path d="M35 28c2 1 3 1 5 0" />
        <circle cx="32" cy="25" r="1.2" fill="#F7F1E6" stroke="none" />
        <path d="M28 40c-2 4-1 8 1 11 1 2 2 3 3 3" />
        <path d="M36 40c2 4 1 8-1 11-1 2-2 3-3 3" />
        <path d="M29 43c2-2 5-2 7 0" />
      </g>
    </svg>
  )
}
