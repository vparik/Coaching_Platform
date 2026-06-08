// Shared full-pitch SVG markings — used by TacticsClient, LineupPanel, and any future pitch board.
// Must be rendered inside an <svg> or <g> with viewBox="0 0 300 450".

const S = 'rgba(255,255,255,0.55)'
const SW = 1.5

export function FullPitchMarkings() {
  return (
    <>
      <rect width="300" height="450" fill="#1e5c2a" />
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <rect key={i} x="15" y={15 + i * 60} width="270" height="30" fill="rgba(0,0,0,0.08)" />
      ))}
      <rect x="15" y="15" width="270" height="420" fill="none" stroke={S} strokeWidth={SW} />
      <line x1="15" y1="225" x2="285" y2="225" stroke={S} strokeWidth={SW} />
      <circle cx="150" cy="225" r="37" fill="none" stroke={S} strokeWidth={SW} />
      <circle cx="150" cy="225" r="3" fill={S} />
      {/* Top end */}
      <rect x="70" y="15" width="160" height="66" fill="none" stroke={S} strokeWidth={SW} />
      <rect x="114" y="15" width="72" height="22" fill="none" stroke={S} strokeWidth={SW} />
      <rect x="136" y="7" width="28" height="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.7)" strokeWidth={SW} />
      <circle cx="150" cy="59" r="2.5" fill={S} />
      <path d="M 120 81 A 37 37 0 0 0 180 81" fill="none" stroke={S} strokeWidth={SW} />
      {/* Bottom end */}
      <rect x="70" y="369" width="160" height="66" fill="none" stroke={S} strokeWidth={SW} />
      <rect x="114" y="413" width="72" height="22" fill="none" stroke={S} strokeWidth={SW} />
      <rect x="136" y="435" width="28" height="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.7)" strokeWidth={SW} />
      <circle cx="150" cy="391" r="2.5" fill={S} />
      <path d="M 120 369 A 37 37 0 0 1 180 369" fill="none" stroke={S} strokeWidth={SW} />
    </>
  )
}
