"use client";

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  position: string | null;
};

function slotFor(position: string | null, index: number, total: number): { x: number; y: number } {
  const p = (position || "").trim();
  if (p.includes("حارس")) return { x: 50, y: 128 };
  if (p.includes("ظهير") || p.includes("قلب") || p.includes("دفاع")) {
    return { x: 22 + index * 14, y: 100 };
  }
  if (p.includes("وسط")) return { x: 30 + (index % 3) * 20, y: 72 };
  if (p.includes("جناح") || p.includes("مهاجم")) return { x: 28 + (index % 3) * 22, y: 42 };
  return { x: 30 + (index % 4) * 13, y: 85 };
}

export function PitchFormation({ players }: { players: Player[] }) {
  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 100 140"
        className="w-full h-auto"
        style={{ filter: "drop-shadow(0 0 24px rgba(0,0,0,0.4))" }}
      >
        {/* Pitch background */}
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.28 0.06 15)" />
            <stop offset="100%" stopColor="oklch(0.18 0.04 15)" />
          </linearGradient>
          <pattern id="pitchStripes" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
            <rect width="100" height="10" fill="rgba(255,255,255,0.015)" />
            <rect y="10" width="100" height="10" fill="transparent" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="140" fill="url(#pitchGrad)" rx="2" />
        <rect x="0" y="0" width="100" height="140" fill="url(#pitchStripes)" rx="2" />

        {/* White lines */}
        <g stroke="rgba(255,255,255,0.42)" strokeWidth="0.4" fill="none">
          {/* Outer border */}
          <rect x="6" y="6" width="88" height="128" rx="1" />

          {/* Halfway line */}
          <line x1="6" y1="70" x2="94" y2="70" />

          {/* Center circle */}
          <circle cx="50" cy="70" r="11" />

          {/* Center spot */}
          <circle cx="50" cy="70" r="0.6" fill="rgba(255,255,255,0.5)" />

          {/* Top penalty area */}
          <rect x="22" y="6" width="56" height="20" />
          <rect x="36" y="6" width="28" height="9" />
          <circle cx="50" cy="17" r="0.6" fill="rgba(255,255,255,0.5)" />

          {/* Bottom penalty area */}
          <rect x="22" y="114" width="56" height="20" />
          <rect x="36" y="125" width="28" height="9" />
          <circle cx="50" cy="123" r="0.6" fill="rgba(255,255,255,0.5)" />

          {/* Corner arcs */}
          <path d="M 6 8 Q 8 6 8 6" stroke="rgba(255,255,255,0.42)" />
          <path d="M 94 8 Q 92 6 92 6" stroke="rgba(255,255,255,0.42)" />
          <path d="M 6 132 Q 8 134 8 134" stroke="rgba(255,255,255,0.42)" />
          <path d="M 94 132 Q 92 134 92 134" stroke="rgba(255,255,255,0.42)" />
        </g>

        {/* Players */}
        {players.map((p, i) => {
          const pos = slotFor(p.position, i, players.length);
          return (
            <g key={p.id}>
              {/* Glow */}
              <circle cx={pos.x} cy={pos.y} r="4.5" fill="oklch(0.55 0.16 15)" opacity="0.25" />
              {/* Jersey circle */}
              <circle cx={pos.x} cy={pos.y} r="3.4" fill="oklch(0.42 0.16 15)" stroke="oklch(0.78 0.13 85)" strokeWidth="0.35" />
              {/* Number */}
              <text
                x={pos.x}
                y={pos.y + 1.4}
                textAnchor="middle"
                fontSize="3.4"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                fill="oklch(0.96 0.02 85)"
              >
                {p.jersey_number != null ? p.jersey_number : "•"}
              </text>
              {/* Name below */}
              <text
                x={pos.x}
                y={pos.y + 7.2}
                textAnchor="middle"
                fontSize="2.8"
                fontFamily="var(--font-sans)"
                fill="rgba(255,255,255,0.55)"
              >
                {p.last_name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
