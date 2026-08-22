"use client"

import { useRef, useState } from "react"
import { toPng } from "html-to-image"
import { Smartphone, IdCard, Download, X, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ElevationChart } from "@/components/elevation-chart"
import {
  type SimResult,
  formatDuration,
  formatClock,
  formatPace,
} from "@/lib/simpace"
import { type Lang, t, localizeName } from "@/lib/i18n"
import type { FormState } from "@/lib/store"

interface ExportPanelProps {
  result: SimResult
  state: FormState
  lang: Lang
}

type Palette = {
  bg: string
  card: string
  primary: string
  accent: string
  text: string
  muted: string
  border: string
  headerBg: string
  altBg: string
  warnBg: string
  chartFill: string
  chartGrid: string
  chartHalo: string
}

/** 壁紙: 既存のダークテーマ */
const WALL: Palette = {
  bg: "#111d17",
  card: "#1b2a22",
  primary: "#5fb985",
  accent: "#e0a24a",
  text: "#eef4ee",
  muted: "#9fb3a6",
  border: "rgba(255,255,255,0.12)",
  headerBg: "rgba(255,255,255,0.06)",
  altBg: "rgba(255,255,255,0.03)",
  warnBg: "rgba(224,80,80,0.18)",
  chartFill: "rgba(95,185,133,0.22)",
  chartGrid: "rgba(255,255,255,0.12)",
  chartHalo: "#0c1611",
}

/** ラミネートカード: 印刷向け白地・高コントラスト */
const PRINT: Palette = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  primary: "#111111",
  accent: "#111111",
  text: "#111111",
  muted: "#333333",
  border: "#333333",
  headerBg: "#F3F3F3",
  altBg: "#F7F7F7",
  warnBg: "#EDEDED",
  chartFill: "rgba(17,17,17,0.08)",
  chartGrid: "#CCCCCC",
  chartHalo: "#FFFFFF",
}

type Kind = "wallpaper" | "card"

/** Strict 9:16 lock-screen canvas (same ratio as 1080×1920). Captured at 3× → 1215×2160. */
const WALL_WIDTH = 405
const WALL_HEIGHT = 720
const WALL_PAD_X = 0.12
const WALL_SAFE_TOP = 0.3
const WALL_SAFE_BOTTOM = 0.15
const WALL_CONTENT_H = 1 - WALL_SAFE_TOP - WALL_SAFE_BOTTOM

function wallpaperFit(segmentCount: number, zoneH: number) {
  const headerH = 16
  const timeH = 42
  const footerH = 10
  const gap = 5
  const gaps = gap * 4
  const profileChrome = 18
  const schedTitle = 14
  const rows = Math.max(segmentCount, 1) + 1
  const chrome = headerH + timeH + footerH + gaps + profileChrome + schedTitle

  let chartH = 96
  let rowH = 15
  const used = () => chrome + chartH + rows * rowH
  while (used() > zoneH && chartH > 68) chartH -= 2
  while (used() > zoneH && rowH > 12) rowH -= 1
  if (used() > zoneH) {
    chartH = Math.max(60, chartH - (used() - zoneH))
  }
  return { chartH, rowH, gap }
}

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function tryDownload(url: string, filename: string) {
  try {
    if (isMobileBrowser()) return
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch {
    // Mobile / in-app browsers often ignore a.download
  }
}

export function ExportPanel({ result, state, lang }: ExportPanelProps) {
  const wallpaperRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<Kind | null>(null)
  const [preview, setPreview] = useState<{ url: string; kind: Kind } | null>(null)

  const generate = async (kind: Kind) => {
    const node = kind === "wallpaper" ? wallpaperRef.current : cardRef.current
    if (!node) return
    setBusy(kind)
    try {
      const url = await toPng(node, {
        pixelRatio: kind === "wallpaper" ? 3 : 2.5,
        cacheBust: true,
        backgroundColor: kind === "card" ? PRINT.bg : WALL.bg,
        ...(kind === "wallpaper"
          ? { width: WALL_WIDTH, height: WALL_HEIGHT }
          : {}),
      })
      setPreview({ url, kind })
      tryDownload(
        url,
        `simpace-${kind}-${new Date().toISOString().slice(0, 10)}.png`,
      )
    } catch {
      alert(t(lang, "exportFail"))
    } finally {
      setBusy(null)
    }
  }

  const fileName = preview
    ? `simpace-${preview.kind}-${new Date().toISOString().slice(0, 10)}.png`
    : "simpace.png"

  const download = () => {
    if (!preview) return
    if (isMobileBrowser()) {
      openTab()
      return
    }
    tryDownload(preview.url, fileName)
  }

  const openTab = () => {
    if (!preview) return
    window.open(preview.url, "_blank", "noopener")
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => generate("wallpaper")}
          disabled={busy !== null}
          className="h-11 gap-2 bg-transparent"
        >
          {busy === "wallpaper" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Smartphone className="size-4" />
          )}
          {t(lang, "exportWallpaper")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => generate("card")}
          disabled={busy !== null}
          className="h-11 gap-2 bg-transparent"
        >
          {busy === "card" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <IdCard className="size-4" />
          )}
          {t(lang, "exportCard")}
        </Button>
      </div>

      {/* プレビュー用モーダル（モバイルは長押し保存） */}
      {preview ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <p
            className="rounded-full bg-primary px-4 py-1.5 text-center text-sm font-semibold text-primary-foreground shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {t(lang, "saveHint")}
          </p>
          <div
            className={
              preview.kind === "wallpaper"
                ? "flex aspect-[9/16] h-[min(70vh,calc((100vw-2rem)*16/9))] max-h-[70vh] overflow-hidden rounded-[1.35rem] border border-border bg-black shadow-2xl"
                : "flex max-h-[70vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={preview.url}
              alt={t(lang, "preview")}
              className="h-full w-full object-contain"
              style={{ WebkitTouchCallout: "default", WebkitUserSelect: "auto" }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button onClick={download} className="gap-2">
              <Download className="size-4" />
              {t(lang, "downloadPng")}
            </Button>
            <Button variant="outline" onClick={openTab} className="gap-2 bg-transparent">
              <ExternalLink className="size-4" />
              {t(lang, "openInTab")}
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)} className="gap-2 bg-transparent">
              <X className="size-4" />
              {t(lang, "close")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* オフスクリーンのエクスポート用ノード */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}
      >
        <div ref={wallpaperRef} style={{ width: WALL_WIDTH }}>
          <ExportLayout kind="wallpaper" result={result} state={state} lang={lang} />
        </div>
        <div ref={cardRef} style={{ width: 720 }}>
          <ExportLayout kind="card" result={result} state={state} lang={lang} />
        </div>
      </div>
    </>
  )
}

function ExportLayout({
  kind,
  result,
  state,
  lang,
}: {
  kind: Kind
  result: SimResult
  state: FormState
  lang: Lang
}) {
  const isWall = kind === "wallpaper"
  const P = isWall ? WALL : PRINT
  // Wallpaper is a true 9:16 phone frame. Card height is computed from content
  // so the laminated preview is never clipped.
  const width = isWall ? WALL_WIDTH : 720
  const distanceKm = Number.parseFloat(state.distance) || 0
  const elevationGainM = Number.parseFloat(state.elevation) || 0
  const isReverse = result.mode === "reverse"
  const hasCutoff = result.segments.some((s) => s.cutoffSec !== null)
  const tight = result.segments.length > 8
  const wallFit = isWall
    ? wallpaperFit(result.segments.length, WALL_HEIGHT * WALL_CONTENT_H)
    : null

  const aids = state.waypoints
    .filter((w) => w.distanceKm > 0 && w.distanceKm < distanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  const rowH = tight ? 17 : 20
  const scheduleH = 18 + (result.segments.length + 1) * rowH
  const chartH = isWall ? wallFit!.chartH : 172
  const aidH = aids.length === 0 ? 0 : 20 + aids.length * 15 + 10
  const rightH = 52 + 8 + (chartH + 22) + (aidH > 0 ? 8 + aidH : 0)
  const height = isWall ? WALL_HEIGHT : 12 + 22 + 8 + Math.max(scheduleH, rightH, 220) + 24

  const chartColors = {
    line: P.primary,
    fill: P.chartFill,
    grid: P.chartGrid,
    marker: P.accent,
    text: P.text,
    halo: P.chartHalo,
  }

  const timeLabel = isReverse ? t(lang, "targetFinish") : t(lang, "estFinish")
  const gapLabel = isReverse ? t(lang, "gapNeeded") : t(lang, "gap")
  const scheduleTitle = isReverse ? t(lang, "scheduleTitleReverse") : t(lang, "scheduleTitle")

  const headerCells = hasCutoff
    ? [t(lang, "colPoint"), t(lang, "colPass"), t(lang, "colCutoff"), t(lang, "colGap")]
    : [t(lang, "colPoint"), t(lang, "colPass"), t(lang, "colGap")]

  const schedule = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: isWall ? 10 : 11,
          fontWeight: 700,
          marginBottom: isWall ? 2 : 4,
          letterSpacing: 0.2,
          flexShrink: 0,
          lineHeight: 1.2,
        }}
      >
        {scheduleTitle}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
        <Row
          cells={headerCells}
          header
          hasCutoff={hasCutoff}
          tight={tight}
          compact={isWall}
          rowHeight={wallFit?.rowH}
          palette={P}
        />
        {result.segments.map((s, i) => {
          const stay =
            s.stayMin > 0 ? ` · ${t(lang, "stay")}${s.stayMin}${t(lang, "minute")}` : ""
          const point = `${localizeName(lang, s.name)}${stay}`
          const cells = hasCutoff
            ? [
                point,
                formatClock(s.cumulativeSec),
                s.cutoffSec !== null ? formatClock(s.cutoffSec) : "—",
                formatPace(s.paceSecPerKm),
              ]
            : [point, formatClock(s.cumulativeSec), formatPace(s.paceSecPerKm)]
          return (
            <Row
              key={i}
              cells={cells}
              hasCutoff={hasCutoff}
              tight={tight}
              compact={isWall}
              rowHeight={wallFit?.rowH}
              warn={s.marginSec !== null && s.marginSec < 0}
              alt={i % 2 === 1}
              palette={P}
            />
          )
        })}
      </div>
    </div>
  )

  const profile = (
    <div
      style={{
        background: P.card,
        borderRadius: 10,
        padding: isWall ? "4px 6px 2px" : "6px 8px 4px",
        border: `1px solid ${P.border}`,
        flexShrink: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: isWall ? 9 : 10, color: P.muted, marginBottom: isWall ? 1 : 2, fontWeight: 700, lineHeight: 1.2 }}>
        {t(lang, "elevationProfile")}
      </div>
      <ElevationChart
        profile={state.profile}
        distanceKm={distanceKm}
        elevationGainM={elevationGainM}
        waypoints={aids}
        height={chartH}
        colors={chartColors}
        showWaypointDetails
        compact={isWall}
        waypointLabel={(w) => localizeName(lang, w.name)}
      />
    </div>
  )

  const timeStrip = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: P.card,
        borderRadius: 10,
        padding: isWall ? "5px 8px" : "8px 12px",
        border: `1px solid ${P.border}`,
        gap: isWall ? 8 : 12,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: isWall ? 8 : 9, color: P.muted, lineHeight: 1.15 }}>{timeLabel}</div>
        <div
          style={{
            fontSize: isWall ? 20 : 22,
            fontWeight: 800,
            fontFamily: "var(--font-geist-mono), monospace",
            lineHeight: 1.1,
            color: P.text,
          }}
        >
          {formatDuration(result.totalSec, lang)}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: isWall ? 8 : 9, color: P.muted, lineHeight: 1.15 }}>{gapLabel}</div>
        <div
          style={{
            fontSize: isWall ? 13 : 15,
            fontWeight: 700,
            color: P.primary,
            fontFamily: "var(--font-geist-mono), monospace",
            lineHeight: 1.1,
          }}
        >
          {formatPace(result.gapSecPerKm)}/km
        </div>
      </div>
    </div>
  )

  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isWall ? 5 : 6, minWidth: 0 }}>
        <span
          style={{
            width: isWall ? 7 : 8,
            height: isWall ? 7 : 8,
            borderRadius: 999,
            background: P.primary,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: isWall ? 12 : 14, fontWeight: 800, letterSpacing: 0.3, color: P.text }}>
          SimPace
        </span>
        <span style={{ fontSize: isWall ? 9 : 10, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t(lang, "raceSchedule")}
        </span>
      </div>
      <div
        style={{
          fontSize: isWall ? 10 : 11,
          fontWeight: 700,
          fontFamily: "var(--font-geist-mono), monospace",
          color: P.text,
          flexShrink: 0,
        }}
      >
        {distanceKm} km / +{Math.round(elevationGainM)} m
      </div>
    </div>
  )

  const footer = (
    <div
      style={{
        fontSize: isWall ? 7 : 8,
        color: P.muted,
        textAlign: "center",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      Generated by SimPace · {new Date().toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US")}
    </div>
  )

  const body = isWall ? (
    <>
      {timeStrip}
      {profile}
      {schedule}
    </>
  ) : (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.35fr 1fr",
        gap: 8,
        alignItems: "stretch",
        minHeight: 0,
        flex: 1,
      }}
    >
      {schedule}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
        {timeStrip}
        {profile}
        {aids.length > 0 ? (
          <div
            style={{
              background: P.card,
              borderRadius: 10,
              padding: "6px 8px",
              border: `1px solid ${P.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div style={{ fontSize: 10, color: P.muted, fontWeight: 700 }}>
              {t(lang, "aidInfo")}
            </div>
            {aids.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 10,
                  lineHeight: 1.25,
                  color: P.text,
                }}
              >
                <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {localizeName(lang, w.name)}
                </span>
                <span
                  style={{
                    color: P.muted,
                    fontFamily: "var(--font-geist-mono), monospace",
                    flexShrink: 0,
                  }}
                >
                  {w.distanceKm}km · {w.stayMin ?? 0}
                  {t(lang, "minute")}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <div
      style={{
        width,
        height,
        background: isWall
          ? `linear-gradient(160deg, ${P.bg} 0%, #0c1611 100%)`
          : P.bg,
        color: P.text,
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        padding: isWall ? 0 : 12,
        display: "flex",
        flexDirection: "column",
        gap: isWall ? 0 : 8,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {isWall ? (
        <>
          {/* Clock / Dynamic Island / date widget zone — top 30% */}
          <div style={{ height: WALL_HEIGHT * WALL_SAFE_TOP, flexShrink: 0 }} />
          <div
            style={{
              height: WALL_HEIGHT * WALL_CONTENT_H,
              flexShrink: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              paddingLeft: WALL_WIDTH * WALL_PAD_X,
              paddingRight: WALL_WIDTH * WALL_PAD_X,
              gap: wallFit!.gap,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {header}
            {body}
            {footer}
          </div>
          {/* Home bar / Flashlight / Camera widget zone — bottom 15% */}
          <div style={{ height: WALL_HEIGHT * WALL_SAFE_BOTTOM, flexShrink: 0 }} />
        </>
      ) : (
        <>
          {header}
          {body}
          {footer}
        </>
      )}
    </div>
  )
}

function Row({
  cells,
  header,
  warn,
  alt,
  hasCutoff,
  tight,
  compact,
  rowHeight,
  palette: P,
}: {
  cells: string[]
  header?: boolean
  warn?: boolean
  alt?: boolean
  hasCutoff: boolean
  tight?: boolean
  compact?: boolean
  rowHeight?: number
  palette: Palette
}) {
  const fontSize = compact
    ? header
      ? 8
      : rowHeight && rowHeight < 14
        ? 8
        : 9
    : header
      ? 9
      : tight
        ? 10
        : 11
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: hasCutoff
          ? compact
            ? "1.2fr 1fr 1fr 0.7fr"
            : "1.45fr 0.95fr 0.95fr 0.75fr"
          : compact
            ? "1.35fr 1.05fr 0.8fr"
            : "1.5fr 1fr 0.85fr",
        gap: compact ? 2 : 4,
        padding: compact ? "0 4px" : tight ? "2px 6px" : "3px 6px",
        height: rowHeight,
        boxSizing: "border-box",
        alignItems: "center",
        borderRadius: compact ? 3 : 4,
        background: header
          ? P.headerBg
          : warn
            ? P.warnBg
            : alt
              ? P.altBg
              : "transparent",
        fontSize,
        color: header ? P.muted : P.text,
        fontWeight: header ? 700 : 500,
        lineHeight: compact ? 1.1 : 1.25,
        minWidth: 0,
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {cells[0]}
      </span>
      {cells.slice(1).map((c, i) => (
        <span
          key={i}
          style={{
            textAlign: "right",
            fontFamily: "var(--font-geist-mono), monospace",
            color: i === cells.length - 2 ? P.primary : i === 1 && hasCutoff ? P.muted : P.text,
            fontVariantNumeric: "tabular-nums",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c}
        </span>
      ))}
    </div>
  )
}
