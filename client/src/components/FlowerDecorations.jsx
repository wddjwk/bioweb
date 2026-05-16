export default function FlowerDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Top-right: Vine with small flowers, confined to right side */}
      <svg className="absolute top-0 right-0 w-[500px] h-64 opacity-[0.30]" viewBox="0 0 500 260" preserveAspectRatio="xMaxYMin meet">
        <defs>
          {/* Pink-edge gradient for flower petals */}
          <radialGradient id="petalGrad" cx="50%" cy="40%" r="60%" fx="50%" fy="30%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="55%" stopColor="#fff5f5" />
            <stop offset="80%" stopColor="#fce4ec" />
            <stop offset="100%" stopColor="#f8bbd0" />
          </radialGradient>
          {/* Slightly deeper pink gradient for the main camellia */}
          <radialGradient id="camelliaGrad" cx="50%" cy="35%" r="65%" fx="50%" fy="25%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="45%" stopColor="#fff0f3" />
            <stop offset="75%" stopColor="#fce4ec" />
            <stop offset="100%" stopColor="#f48fb1" />
          </radialGradient>
          {/* Even lighter pink for inner petals */}
          <radialGradient id="innerPetalGrad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="60%" stopColor="#fff5f7" />
            <stop offset="100%" stopColor="#f8bbd0" />
          </radialGradient>
        </defs>

        {/* Main woody vine — lightened */}
        <path 
          d="M500,35 C470,28 440,40 410,32 
             Q380,24 350,35 C320,44 290,30 260,38
             Q230,45 200,36 C170,28 140,42 110,35
             Q80,28 50,38" 
          fill="none" 
          stroke="#9aba9e" 
          strokeWidth="3" 
          opacity="0.55"
        />
        {/* Secondary vine — softened */}
        <path 
          d="M490,50 C460,58 430,46 400,54
             Q370,62 340,50 C310,40 280,56 250,48
             Q220,42 190,52 C160,60 130,46 100,54" 
          fill="none" 
          stroke="#a8e6b8" 
          strokeWidth="2" 
          opacity="0.38"
        />
        {/* Thin tendril curling down */}
        <path 
          d="M420,40 C415,55 420,70 410,85 Q405,95 410,105" 
          fill="none" 
          stroke="#b5ddb0" 
          strokeWidth="1.2" 
          opacity="0.35"
        />
        <path 
          d="M300,42 C295,58 300,75 290,90 Q285,100 290,112" 
          fill="none" 
          stroke="#b5ddb0" 
          strokeWidth="1" 
          opacity="0.3"
        />
        <path 
          d="M180,40 C175,52 178,65 172,78" 
          fill="none" 
          stroke="#c5e8c0" 
          strokeWidth="0.8" 
          opacity="0.25"
        />

        {/* Main camellia at right end — pink-edged petals */}
        <g transform="translate(470,40)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <ellipse
              key={`o-${i}`}
              cx="0" cy="-24"
              rx="11" ry="26"
              fill="url(#camelliaGrad)"
              stroke="#e8a0b4"
              strokeWidth="0.6"
              transform={`rotate(${angle})`}
              opacity={0.92 - i * 0.02}
            />
          ))}
          {[22, 67, 112, 157, 202, 247, 292, 337].map((angle, i) => (
            <ellipse
              key={`i-${i}`}
              cx="0" cy="-15"
              rx="7" ry="16"
              fill="url(#innerPetalGrad)"
              stroke="#e0b0c0"
              strokeWidth="0.4"
              transform={`rotate(${angle})`}
              opacity="0.85"
            />
          ))}
          <circle cx="0" cy="0" r="9" fill="#fef3c7" opacity="0.7" />
          <circle cx="0" cy="0" r="4.5" fill="#fde68a" opacity="0.55" />
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <g key={`s-${i}`} transform={`rotate(${angle})`}>
              <line x1="0" y1="0" x2="0" y2="-6" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6" />
              <circle cx="0" cy="-7" r="1" fill="#f59e0b" opacity="0.5" />
            </g>
          ))}
        </g>

        {/* Small flowers along the vine — pink gradient petals */}
        {[
          { x: 380, y: 30, s: 0.35, petals: 5 },
          { x: 310, y: 40, s: 0.28, petals: 5 },
          { x: 240, y: 34, s: 0.32, petals: 6 },
          { x: 170, y: 40, s: 0.25, petals: 5 },
          { x: 100, y: 36, s: 0.22, petals: 5 },
        ].map((flower, fi) => (
          <g key={`flower-${fi}`} transform={`translate(${flower.x},${flower.y}) scale(${flower.s})`}>
            {Array.from({ length: flower.petals }, (_, i) => (360 / flower.petals) * i).map((angle, i) => (
              <ellipse
                key={i}
                cx="0" cy="-18"
                rx="8" ry="20"
                fill="url(#petalGrad)"
                stroke="#e8a0b4"
                strokeWidth="0.8"
                transform={`rotate(${angle})`}
                opacity="0.88"
              />
            ))}
            <circle cx="0" cy="0" r="6" fill="#fef3c7" opacity="0.7" />
            <circle cx="0" cy="0" r="3" fill="#fde68a" opacity="0.5" />
          </g>
        ))}

        {/* Flower buds with hint of pink */}
        {[
          { x: 350, y: 45, s: 0.3 },
          { x: 210, y: 50, s: 0.25 },
          { x: 130, y: 44, s: 0.2 },
        ].map((bud, bi) => (
          <g key={`bud-${bi}`} transform={`translate(${bud.x},${bud.y}) scale(${bud.s})`}>
            <ellipse cx="0" cy="-12" rx="6" ry="14" fill="#e8f5e9" stroke="#a5d6a7" strokeWidth="0.6" opacity="0.7" />
            <ellipse cx="3" cy="-14" rx="5" ry="12" fill="#fce4ec" stroke="#f8bbd0" strokeWidth="0.5" opacity="0.5" transform="rotate(15)" />
          </g>
        ))}

        {/* Leaves */}
        {[
          { x: 440, y: 32, r: -30, s: 0.7 },
          { x: 395, y: 45, r: 25, s: 0.6 },
          { x: 355, y: 30, r: -20, s: 0.55 },
          { x: 330, y: 48, r: 35, s: 0.5 },
          { x: 275, y: 35, r: -25, s: 0.6 },
          { x: 250, y: 52, r: 30, s: 0.45 },
          { x: 200, y: 38, r: -20, s: 0.5 },
          { x: 155, y: 48, r: 25, s: 0.45 },
          { x: 120, y: 32, r: -30, s: 0.4 },
          { x: 80, y: 42, r: 20, s: 0.35 },
          { x: 410, y: 88, r: 15, s: 0.5 },
          { x: 295, y: 95, r: -10, s: 0.45 },
        ].map((leaf, i) => (
          <g key={`leaf-${i}`} transform={`translate(${leaf.x},${leaf.y}) rotate(${leaf.r}) scale(${leaf.s})`}>
            <path d="M0,0 Q8,-16 0,-34 Q-8,-16 0,0Z" fill="#81c784" opacity="0.5" />
            <line x1="0" y1="0" x2="0" y2="-34" stroke="#4caf50" strokeWidth="0.6" opacity="0.35" />
            <line x1="0" y1="-10" x2="4" y2="-16" stroke="#4caf50" strokeWidth="0.3" opacity="0.2" />
            <line x1="0" y1="-18" x2="-4" y2="-24" stroke="#4caf50" strokeWidth="0.3" opacity="0.2" />
          </g>
        ))}
      </svg>

      {/* Bottom-left leaves */}
      <svg className="absolute -bottom-6 -left-6 w-56 h-56 opacity-[0.10]" viewBox="0 0 200 200">
        <g transform="translate(60,140) rotate(-30)">
          <path d="M0,0 Q30,-60 0,-120 Q-30,-60 0,0Z" fill="#81c784" opacity="0.5" />
          <line x1="0" y1="0" x2="0" y2="-120" stroke="#4caf50" strokeWidth="1" opacity="0.3" />
        </g>
        <g transform="translate(90,160) rotate(-10)">
          <path d="M0,0 Q25,-50 0,-100 Q-25,-50 0,0Z" fill="#a5d6a7" opacity="0.4" />
          <line x1="0" y1="0" x2="0" y2="-100" stroke="#81c784" strokeWidth="0.8" opacity="0.3" />
        </g>
      </svg>

      {/* Bottom-right camellia — pink-edged */}
      <svg className="absolute -bottom-8 -right-8 w-48 h-48 opacity-[0.14] animate-float" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="btmCamelliaGrad" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="50%" stopColor="#fff0f3" />
            <stop offset="85%" stopColor="#fce4ec" />
            <stop offset="100%" stopColor="#f48fb1" />
          </radialGradient>
        </defs>
        <g transform="translate(100,100)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <ellipse
              key={i}
              cx="0" cy="-34"
              rx="15" ry="36"
              fill="url(#btmCamelliaGrad)"
              stroke="#e8a0b4"
              strokeWidth="0.5"
              transform={`rotate(${angle})`}
              opacity={0.9 - i * 0.03}
            />
          ))}
          <circle cx="0" cy="0" r="12" fill="#fef3c7" opacity="0.7" />
          <circle cx="0" cy="0" r="6" fill="#fde68a" opacity="0.5" />
        </g>
      </svg>
    </div>
  )
}
