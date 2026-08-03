/** Vector white namaste (from Descargar-SVG logo blanco.html) — crisp at any zoom. */
export function IndiaGateNamaste({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 500"
      aria-hidden="true"
      overflow="visible"
    >
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Corona/Tocado */}
        <path d="M160 95 L180 65 L200 75 L200 50 L215 65 L230 50 L230 75 L250 65 L270 95" />
        <circle fill="#FFFFFF" stroke="none" cx="200" cy="50" r="3" />
        <circle fill="#FFFFFF" stroke="none" cx="215" cy="65" r="3" />
        <circle fill="#FFFFFF" stroke="none" cx="230" cy="50" r="3" />

        {/* Rostro */}
        <path d="M170 100 C160 115 158 140 160 160 C165 180 175 190 200 195 C225 190 235 180 240 160 C242 140 240 115 230 100 C220 90 210 85 200 85 C190 85 180 90 170 100 Z" />

        {/* Ojos cerrados */}
        <path strokeWidth={2} d="M178 135 Q188 142 198 135" />
        <path strokeWidth={2} d="M202 135 Q212 142 222 135" />

        {/* Bindi */}
        <circle fill="#FFFFFF" stroke="none" cx="200" cy="125" r="4" />
        <path strokeWidth={2} d="M200 118 L200 115" />

        {/* Nariz */}
        <path strokeWidth={2} d="M200 145 L198 155 L200 157" />

        {/* Boca */}
        <path strokeWidth={2} d="M192 168 Q200 172 208 168" />

        {/* Pendientes */}
        <path d="M158 155 L150 165 L152 175 L160 180" />
        <circle fill="#FFFFFF" stroke="none" cx="156" cy="182" r="4" />
        <path d="M242 155 L250 165 L248 175 L240 180" />
        <circle fill="#FFFFFF" stroke="none" cx="244" cy="182" r="4" />

        {/* Cuello */}
        <path d="M186 195 L190 215 L210 215 L214 195" />

        {/* Collar */}
        <path d="M180 210 Q200 225 220 210" />
        <circle fill="#FFFFFF" stroke="none" cx="200" cy="222" r="3" />

        {/* Brazos y manos en rezo */}
        <path d="M190 220 C170 240 160 280 165 310 C170 330 180 340 190 345" />
        <path d="M210 220 C230 240 240 280 235 310 C230 330 220 340 210 345" />

        {/* Manos unidas */}
        <path d="M190 345 C195 355 195 370 200 375 C205 370 205 355 210 345" />

        {/* Brazaletes */}
        <ellipse cx="167" cy="315" rx="8" ry="12" />
        <ellipse cx="233" cy="315" rx="8" ry="12" />
        <circle fill="#FFFFFF" stroke="none" cx="167" cy="310" r="2" />
        <circle fill="#FFFFFF" stroke="none" cx="167" cy="320" r="2" />
        <circle fill="#FFFFFF" stroke="none" cx="233" cy="310" r="2" />
        <circle fill="#FFFFFF" stroke="none" cx="233" cy="320" r="2" />

        {/* Cuerpo/Vestimenta */}
        <path d="M185 220 L182 450 M215 220 L218 450" />
        <path strokeWidth={2} d="M182 250 Q200 260 218 250" />
        <path strokeWidth={2} d="M182 300 Q200 310 218 300" />
        <path strokeWidth={2} d="M182 350 Q200 360 218 350" />
        <path strokeWidth={2} d="M182 400 Q200 410 218 400" />

        {/* Base flor de loto */}
        <path d="M160 450 Q180 440 200 445 Q220 440 240 450" />
        <path d="M170 450 Q185 460 200 455 Q215 460 230 450" />
      </g>
    </svg>
  )
}
