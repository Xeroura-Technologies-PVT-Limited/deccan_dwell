/** Crisp vector lockup — matches client logo, no green box / raster noise */
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 168"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Deccan Dwell — Home away from home"
    >
      <g stroke="#c5a059" strokeLinecap="round" strokeLinejoin="round">
        {/* Large outlined D */}
        <path
          strokeWidth="3.5"
          d="M22 20h52c42 0 74 30 74 64s-32 64-74 64H22V20Z"
        />
        <path
          strokeWidth="1.5"
          d="M32 30h40c34 0 58 24 58 54s-24 54-58 54H32V30Z"
        />
      </g>

      <g
        fill="#c5a059"
        fontFamily="var(--font-nav), 'DM Sans', system-ui, sans-serif"
        fontWeight="500"
        letterSpacing="0.12em"
      >
        <text x="168" y="72" fontSize="36">
          ECCAN
        </text>
        <text x="168" y="122" fontSize="36">
          WELL
        </text>
      </g>

      {/* House + trees */}
      <g stroke="#c5a059" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* left tree */}
        <path d="M368 92c8-20 18-32 28-32 9 0 16 14 20 32" />
        <path d="M378 92v24M388 92v24M398 92v24" />
        {/* house body */}
        <path d="M404 58 448 30l44 28v70H404V58Z" />
        <path d="M404 58h88" />
        <path d="M430 128V86h28v42" />
        {/* upper wing */}
        <path d="M448 30 472 14l36 24v40H448V30Z" />
        {/* right tree */}
        <path d="M500 78c7-18 16-28 26-28 8 0 14 12 18 28" />
        <path d="M512 78v28M524 78v28" />
        {/* ground rule + diamond */}
        <path d="M360 132h168" strokeWidth="1.2" />
        <path
          d="M444 132 450 126 456 132 450 138Z"
          fill="#c5a059"
          stroke="none"
        />
      </g>

      <text
        x="444"
        y="156"
        textAnchor="middle"
        fill="#c5a059"
        fontFamily="var(--font-script), 'Great Vibes', cursive"
        fontSize="22"
      >
        Home away from home
      </text>
    </svg>
  );
}
