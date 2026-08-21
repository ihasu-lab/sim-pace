import type { ElevationPoint, Waypoint } from "@/lib/simpace"

interface ElevationChartProps {
  profile?: ElevationPoint[]
  distanceKm: number
  elevationGainM: number
  waypoints?: Waypoint[]
  height?: number
  /** エクスポート用に色を明示（CSS変数を使わない） */
  colors?: {
    line: string
    fill: string
    grid: string
    marker: string
    text: string
  }
  className?: string
}

const DEFAULT_COLORS = {
  line: "var(--color-primary)",
  fill: "color-mix(in oklab, var(--color-primary) 22%, transparent)",
  grid: "var(--color-border)",
  marker: "var(--color-accent)",
  text: "var(--color-muted-foreground)",
}

/**
 * 標高プロファイルの簡易エリアチャート（SVG）。
 * GPXが無い場合は距離・獲得標高から擬似的な山型を生成して表示する。
 */
export function ElevationChart({
  profile,
  distanceKm,
  elevationGainM,
  waypoints = [],
  height = 120,
  colors = DEFAULT_COLORS,
  className,
}: ElevationChartProps) {
  const width = 600
  const pad = { top: 8, right: 8, bottom: 8, left: 8 }

  const pts = buildPoints(profile, distanceKm, elevationGainM)
  const maxDist = pts[pts.length - 1]?.d || distanceKm || 1
  const minEle = Math.min(...pts.map((p) => p.e))
  const maxEle = Math.max(...pts.map((p) => p.e))
  const eleRange = maxEle - minEle || 1

  const x = (d: number) =>
    pad.left + (d / maxDist) * (width - pad.left - pad.right)
  const y = (e: number) =>
    height - pad.bottom - ((e - minEle) / eleRange) * (height - pad.top - pad.bottom)

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.d).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ")
  const area = `${line} L${x(maxDist).toFixed(1)},${height - pad.bottom} L${x(0).toFixed(1)},${height - pad.bottom} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
      role="img"
      aria-label="Elevation profile"
    >
      <path d={area} fill={colors.fill} />
      <path d={line} fill="none" stroke={colors.line} strokeWidth={2} strokeLinejoin="round" />
      {waypoints
        .filter((w) => w.distanceKm > 0 && w.distanceKm < maxDist)
        .map((w) => {
          const px = x(w.distanceKm)
          const py = y(eleAt(pts, w.distanceKm))
          return (
            <g key={w.id}>
              <line
                x1={px}
                y1={py}
                x2={px}
                y2={height - pad.bottom}
                stroke={colors.grid}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={px} cy={py} r={3} fill={colors.marker} />
            </g>
          )
        })}
    </svg>
  )
}

function eleAt(pts: { d: number; e: number }[], d: number): number {
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].d >= d) {
      const a = pts[i - 1]
      const b = pts[i]
      const span = b.d - a.d || 1
      return a.e + ((b.e - a.e) * (d - a.d)) / span
    }
  }
  return pts[pts.length - 1]?.e ?? 0
}

function buildPoints(
  profile: ElevationPoint[] | undefined,
  distanceKm: number,
  elevationGainM: number,
): { d: number; e: number }[] {
  if (profile && profile.length > 1) {
    // 表示用に最大200点に間引き
    const step = Math.max(1, Math.floor(profile.length / 200))
    const out: { d: number; e: number }[] = []
    for (let i = 0; i < profile.length; i += step) {
      out.push({ d: profile[i].distKm, e: profile[i].eleM })
    }
    const last = profile[profile.length - 1]
    if (out[out.length - 1]?.d !== last.distKm) out.push({ d: last.distKm, e: last.eleM })
    return out
  }
  // GPXが無い場合は擬似的な山型（半分で山頂）
  const dist = distanceKm || 1
  const peak = elevationGainM || 100
  const n = 40
  const out: { d: number; e: number }[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const d = t * dist
    // 2つの緩やかな山を持つ波形で標高を擬似生成
    const e =
      peak * (0.5 * (1 - Math.cos(t * Math.PI * 2)) * 0.5 + Math.sin(t * Math.PI) * 0.6)
    out.push({ d, e })
  }
  return out
}
