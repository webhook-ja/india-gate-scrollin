/** Crisp vector wordmark — true SVG, no raster pixelation. */
export function IndiaGateLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 680 820"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="India Gate — Tres Hermanos Boadilla"
    >
      {/* Black outline pass */}
      <g
        fill="none"
        stroke="#000"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      >
        <path d="M340 70c-70 10-122 62-130 128-5 36 6 74 28 102 14 18 22 40 20 62" />
        <path d="M340 70c70 10 122 62 130 128 5 36-6 74-28 102-14 18-22 40-20 62" />
        <path d="M238 350c22 78 58 118 102 118s80-40 102-118" />
        <path d="M286 175c10-40 32-62 54-62s44 22 54 62c5 26-2 52-20 68-16 14-26 20-34 20s-18-6-34-20c-18-16-25-42-20-68z" />
        <path d="M314 300c-10 22-8 50 4 70 7 12 14 17 22 17" />
        <path d="M366 300c10 22 8 50-4 70-7 12-14 17-22 17" />
        <path d="M244 390c36 48 82 70 96 70" />
        <path d="M436 390c-36 48-82 70-96 70" />
      </g>

      {/* Ivory line art */}
      <g
        fill="none"
        stroke="#F7F1E6"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M340 70c-70 10-122 62-130 128-5 36 6 74 28 102 14 18 22 40 20 62" />
        <path d="M340 70c70 10 122 62 130 128 5 36-6 74-28 102-14 18-22 40-20 62" />
        <path d="M238 350c22 78 58 118 102 118s80-40 102-118" />
        <path d="M286 175c10-40 32-62 54-62s44 22 54 62c5 26-2 52-20 68-16 14-26 20-34 20s-18-6-34-20c-18-16-25-42-20-68z" />
        <path d="M304 208c10 7 18 7 28 0" />
        <path d="M348 208c10 7 18 7 28 0" />
        <circle cx="340" cy="194" r="4.5" fill="#F7F1E6" stroke="none" />
        <path d="M340 214v16" />
        <path d="M326 240c9 9 19 9 28 0" />
        <path d="M286 228c-12 10-14 26-4 38" />
        <circle cx="280" cy="272" r="5.5" fill="#F7F1E6" stroke="none" />
        <path d="M394 228c12 10 14 26 4 38" />
        <circle cx="400" cy="272" r="5.5" fill="#F7F1E6" stroke="none" />
        <path d="M314 300c-10 22-8 50 4 70 7 12 14 17 22 17" />
        <path d="M366 300c10 22 8 50-4 70-7 12-14 17-22 17" />
        <path d="M318 316c12-10 32-10 44 0" />
        <path d="M322 338c10-8 24-8 34 0" />
        <path d="M326 358c8-6 20-6 28 0" />
        <path d="M296 352c18 5 28 5 42-2" />
        <path d="M294 366c20 5 32 5 46-2" />
        <path d="M342 350c18 5 30 5 44-2" />
        <path d="M340 364c20 5 34 5 48-2" />
        <path d="M244 390c36 48 82 70 96 70" />
        <path d="M436 390c-36 48-82 70-96 70" />
      </g>

      {/* Flag brushes with black edge */}
      <path
        d="M78 500c88-36 188-44 302-20 88 18 168 8 258-16 48-12 86-8 108 6-42 30-116 46-214 40-108-8-218 12-304 26-52 8-92 2-150-14z"
        fill="#E8751C"
        stroke="#000"
        strokeWidth="3"
      />
      <path
        d="M82 585c94-30 196-38 312-18 92 18 176 6 262-16 42-10 80-6 102 8-44 28-120 44-218 38-112-8-222 14-308 24-54 6-94-2-150-16z"
        fill="#138808"
        stroke="#000"
        strokeWidth="3"
      />

      {/* Ashoka Chakra */}
      <g transform="translate(340 550)">
        <circle r="34" fill="none" stroke="#000" strokeWidth="8" />
        <circle r="32" fill="none" stroke="#0047A0" strokeWidth="5" />
        <circle r="8" fill="#0047A0" stroke="#000" strokeWidth="2" />
        <g stroke="#0047A0" strokeWidth="2.3">
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i * Math.PI * 2) / 24
            return (
              <line key={i} x1={0} y1={0} x2={Math.cos(a) * 24} y2={Math.sin(a) * 24} />
            )
          })}
        </g>
      </g>

      {/* Wordmark with black halo via paint-order */}
      <text
        x="200"
        y="568"
        textAnchor="middle"
        fill="#F7F1E6"
        stroke="#000"
        strokeWidth="6"
        paintOrder="stroke fill"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="70"
        fontStyle="italic"
        fontWeight="700"
      >
        India
      </text>
      <text
        x="480"
        y="568"
        textAnchor="middle"
        fill="#F7F1E6"
        stroke="#000"
        strokeWidth="6"
        paintOrder="stroke fill"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="70"
        fontStyle="italic"
        fontWeight="700"
      >
        Gate
      </text>
      <text
        x="340"
        y="680"
        textAnchor="middle"
        fill="#F7F1E6"
        stroke="#000"
        strokeWidth="4"
        paintOrder="stroke fill"
        fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="23"
        fontWeight="600"
        letterSpacing="6.5"
      >
        TRES HERMANOS BOADILLA
      </text>
    </svg>
  )
}
