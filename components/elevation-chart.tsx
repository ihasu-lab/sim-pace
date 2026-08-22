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
    halo?: string
  }
  className?: string
  /** 通過ポイント名と距離・標高をマーカーに表示（書き出し用） */
  showWaypointDetails?: boolean
  waypointLabel?: (w: Waypoint) => string
}

const DEFAULT_COLORS = {
  line: "var(--color-primary)",
  fill: "color-mix(in oklab, var(--color-primary) 22%, transparent)",
  grid: "var(--color-border)",
  marker: "var(--color-accent)",
  text: "var(--color-muted-foreground)",
  halo: "var(--color-background)",
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
  height = 148,
  colors = DEFAULT_COLORS,
  className,
  showWaypointDetails = false,
  waypointLabel,
}: ElevationChartProps) {
  // 書き出し枠は横長になりやすいので viewBox 幅を抑えて縦方向を使い切る
  const width = showWaypointDetails ? 400 : 580
  const pad = {
    top: showWaypointDetails ? 46 : 12,
    right: 14,
    bottom: 20,
    left: 36,
  }

  const pts = buildPoints(profile, distanceKm, elevationGainM)
  const maxDist = pts[pts.length - 1]?.d || distanceKm || 1
  const rawMin = Math.min(...pts.map((p) => p.e))
  const rawMax = Math.max(...pts.map((p) => p.e))
  const rawRange = rawMax - rawMin || 100
  const head = rawRange * 0.04
  const minEle = rawMin >= 0 && rawMin <= head * 2 ? 0 : rawMin - head
  const maxEle = rawMax + head
  const eleRange = maxEle - minEle || 1
  const yStep = niceStep(eleRange, 4)
  const xStep = niceDistanceStep(maxDist)

  const x = (d: number) =>
    pad.left + (d / maxDist) * (width - pad.left - pad.right)
  const y = (e: number) =>
    height - pad.bottom - ((e - minEle) / eleRange) * (height - pad.top - pad.bottom)

  const plotBottom = height - pad.bottom
  const plotTop = pad.top
  const plotLeft = pad.left
  const plotRight = width - pad.right

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.d).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ")
  const area = `${line} L${x(maxDist).toFixed(1)},${plotBottom} L${x(0).toFixed(1)},${plotBottom} Z`

  const xTicks = buildTicks(0, maxDist, xStep)
  const yTicks = buildTicks(minEle, maxEle, yStep)
  const marks = waypoints.filter((w) => w.distanceKm > 0 && w.distanceKm < maxDist + 1e-6)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
      role="img"
      aria-label="Elevation profile"
    >
      {yTicks.map((ele) => (
        <g key={`y-${ele}`}>
          <line
            x1={plotLeft}
            y1={y(ele)}
            x2={plotRight}
            y2={y(ele)}
            stroke={colors.grid}
            strokeWidth={1}
          />
          <text
            x={plotLeft - 5}
            y={y(ele)}
            textAnchor="end"
            dominantBaseline="middle"
            fill={colors.text}
            fontSize={10}
            fontFamily="ui-monospace, monospace"
          >
            {formatEle(ele)}
          </text>
        </g>
      ))}

      {xTicks.map((d) => (
        <g key={`x-${d}`}>
          <line
            x1={x(d)}
            y1={plotBottom}
            x2={x(d)}
            y2={plotBottom + 3}
            stroke={colors.grid}
            strokeWidth={1}
          />
          <text
            x={x(d)}
            y={height - 4}
            textAnchor="middle"
            fill={colors.text}
            fontSize={10}
            fontFamily="ui-monospace, monospace"
          >
            {formatKm(d)}
          </text>
        </g>
      ))}

      <line
        x1={plotLeft}
        y1={plotTop}
        x2={plotLeft}
        y2={plotBottom}
        stroke={colors.text}
        strokeWidth={1}
      />
      <line
        x1={plotLeft}
        y1={plotBottom}
        x2={plotRight}
        y2={plotBottom}
        stroke={colors.text}
        strokeWidth={1}
      />
      <text
        x={10}
        y={plotTop - 3}
        fill={colors.text}
        fontSize={8}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        m
      </text>
      <text
        x={plotRight + 2}
        y={height - 4}
        fill={colors.text}
        fontSize={8}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        km
      </text>

      <path d={area} fill={colors.fill} />
      <path d={line} fill="none" stroke={colors.line} strokeWidth={2} strokeLinejoin="round" />

      {marks.map((w, i) => {
        const px = x(w.distanceKm)
        const ele = eleAt(pts, w.distanceKm)
        const py = y(ele)
        const name = waypointLabel ? waypointLabel(w) : w.name
        const anchor = px < plotLeft + 52 ? "start" : px > plotRight - 52 ? "end" : "middle"
        const tx = anchor === "start" ? px + 4 : anchor === "end" ? px - 4 : px
        const labelY = 13 + (i % 2) * 20
        const halo = colors.halo ?? "rgba(0,0,0,0.75)"
        return (
          <g key={w.id}>
            <line
              x1={px}
              y1={showWaypointDetails ? labelY + 16 : py}
              x2={px}
              y2={plotBottom}
              stroke={colors.grid}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={px} cy={py} r={4} fill={colors.marker} stroke={halo} strokeWidth={1} />
            {showWaypointDetails ? (
              <text
                x={tx}
                y={labelY}
                textAnchor={anchor}
                fill={colors.text}
                stroke={halo}
                strokeWidth={3.5}
                paintOrder="stroke fill"
                fontSize={11}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                <tspan x={tx} dy="0" fontWeight={700}>
                  {truncate(name, 14)}
                </tspan>
                <tspan
                  x={tx}
                  dy="12"
                  fontSize={10}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={600}
                >
                  {formatKm(w.distanceKm)}km / {formatEle(ele)}m
                </tspan>
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function formatKm(d: number): string {
  if (!Number.isFinite(d)) return "0"
  const r = Math.round(d * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

function formatEle(e: number): string {
  if (!Number.isFinite(e)) return "0"
  return String(Math.round(e))
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** 見やすい目盛間隔（1 / 2 / 5 × 10^n） */
function niceStep(span: number, targetTicks: number): number {
  const s = Math.max(span, 1)
  const raw = s / Math.max(targetTicks, 1)
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return nice * pow
}

function niceDistanceStep(maxDist: number): number {
  if (maxDist <= 8) return 1
  if (maxDist <= 16) return 2
  if (maxDist <= 40) return 5
  if (maxDist <= 80) return 10
  if (maxDist <= 160) return 20
  return niceStep(maxDist, 5)
}

function buildTicks(min: number, max: number, step: number): number[] {
  if (!(step > 0) || !(max > min)) return [min, max]
  const start = Math.ceil((min - 1e-9) / step) * step
  const out: number[] = []
  for (let v = start; v <= max + 1e-6; v += step) {
    out.push(Number(v.toFixed(8)))
  }
  return out.length > 0 ? out : [min, max]
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
    const step = Math.max(1, Math.floor(profile.length / 200))
    const out: { d: number; e: number }[] = []
    for (let i = 0; i < profile.length; i += step) {
      out.push({ d: profile[i].distKm, e: profile[i].eleM })
    }
    const last = profile[profile.length - 1]
    if (out[out.length - 1]?.d !== last.distKm) out.push({ d: last.distKm, e: last.eleM })
    return out
  }
  const dist = distanceKm || 1
  const peak = elevationGainM || 100
  const n = 40
  const out: { d: number; e: number }[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const d = t * dist
    const e =
      peak * (0.5 * (1 - Math.cos(t * Math.PI * 2)) * 0.5 + Math.sin(t * Math.PI) * 0.6)
    out.push({ d, e })
  }
  return out
}
