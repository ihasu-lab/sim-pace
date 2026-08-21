"use client"

import { useRef, useState } from "react"
import { toPng } from "html-to-image"
import { Smartphone, IdCard, Download, X, Loader2 } from "lucide-react"
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

// エクスポート専用のダークパレット（CSS変数を使わず確実に描画）
const C = {
  bg: "#111d17",
  card: "#1b2a22",
  primary: "#5fb985",
  accent: "#e0a24a",
  text: "#eef4ee",
  muted: "#9fb3a6",
  border: "rgba(255,255,255,0.12)",
}

type Kind = "wallpaper" | "card"

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
        backgroundColor: C.bg,
      })
      setPreview({ url, kind })
    } catch {
      alert(t(lang, "exportFail"))
    } finally {
      setBusy(null)
    }
  }

  const download = () => {
    if (!preview) return
    const a = document.createElement("a")
    a.href = preview.url
    a.download = `simpace-${preview.kind}-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
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

      {/* プレビュー用モーダル */}
      {preview ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <div
            className={
              preview.kind === "wallpaper"
                ? "flex aspect-[9/16] h-[min(78vh,calc((100vw-2rem)*16/9))] max-h-[78vh] overflow-hidden rounded-[1.35rem] border border-border shadow-2xl"
                : "flex max-h-[78vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border shadow-2xl"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* biome-ignore lint/a11y/useAltText: プレビュー画像 */}
            <img
              src={preview.url || "/placeholder.svg"}
              alt={t(lang, "preview")}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={download} className="gap-2">
              <Download className="size-4" />
              {t(lang, "downloadPng")}
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
        <div ref={wallpaperRef} style={{ width: 405 }}>
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
  // Wallpaper is a true 9:16 phone frame. Card height is computed from content
  // so the laminated preview is never clipped.
  const width = isWall ? 405 : 720
  const distanceKm = Number.parseFloat(state.distance) || 0
  const elevationGainM = Number.parseFloat(state.elevation) || 0
  const isReverse = result.mode === "reverse"
  const hasCutoff = result.segments.some((s) => s.cutoffSec !== null)
  const tight = result.segments.length > 8

  const aids = state.waypoints
    .filter((w) => w.distanceKm > 0 && w.distanceKm < distanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  const rowH = tight ? 17 : 20
  const scheduleH = 18 + (result.segments.length + 1) * rowH
  const aidH = aids.length === 0 ? 0 : 20 + aids.length * 15 + 10
  const rightH = 52 + 8 + 98 + (aidH > 0 ? 8 + aidH : 0)
  const height = isWall ? 720 : 12 + 22 + 8 + Math.max(scheduleH, rightH, 220) + 24

  const chartColors = {
    line: C.primary,
    fill: "rgba(95,185,133,0.22)",
    grid: C.border,
    marker: C.accent,
    text: C.muted,
  }

  const timeLabel = isReverse ? t(lang, "targetFinish") : t(lang, "estFinish")
  const gapLabel = isReverse ? t(lang, "gapNeeded") : t(lang, "gap")
  const scheduleTitle = isReverse ? t(lang, "scheduleTitleReverse") : t(lang, "scheduleTitle")

  const headerCells = hasCutoff
    ? [t(lang, "colPoint"), t(lang, "colPass"), t(lang, "colCutoff"), t(lang, "colGap")]
    : [t(lang, "colPoint"), t(lang, "colPass"), t(lang, "colGap")]

  const schedule = (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 4,
          letterSpacing: 0.2,
        }}
      >
        {scheduleTitle}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <Row cells={headerCells} header hasCutoff={hasCutoff} tight={tight} />
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
              warn={s.marginSec !== null && s.marginSec < 0}
              alt={i % 2 === 1}
            />
          )
        })}
      </div>
    </div>
  )

  const profile = (
    <div
      style={{
        background: C.card,
        borderRadius: 10,
        padding: isWall ? "6px 8px 4px" : "6px 8px 4px",
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700 }}>
        {t(lang, "elevationProfile")}
      </div>
      <ElevationChart
        profile={state.profile}
        distanceKm={distanceKm}
        elevationGainM={elevationGainM}
        waypoints={aids}
        height={isWall ? 72 : 86}
        colors={chartColors}
      />
    </div>
  )

  const timeStrip = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: C.card,
        borderRadius: 10,
        padding: isWall ? "8px 12px" : "8px 12px",
        border: `1px solid ${C.border}`,
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.2 }}>{timeLabel}</div>
        <div
          style={{
            fontSize: isWall ? 26 : 22,
            fontWeight: 800,
            fontFamily: "var(--font-geist-mono), monospace",
            lineHeight: 1.15,
          }}
        >
          {formatDuration(result.totalSec, lang)}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.2 }}>{gapLabel}</div>
        <div
          style={{
            fontSize: isWall ? 16 : 15,
            fontWeight: 700,
            color: C.primary,
            fontFamily: "var(--font-geist-mono), monospace",
            lineHeight: 1.15,
          }}
        >
          {formatPace(result.gapSecPerKm)}/km
        </div>
      </div>
    </div>
  )

  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(160deg, ${C.bg} 0%, #0c1611 100%)`,
        color: C.text,
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        padding: isWall ? 14 : 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: C.primary,
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.3 }}>SimPace</span>
          <span style={{ fontSize: 10, color: C.muted }}>{t(lang, "raceSchedule")}</span>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-geist-mono), monospace",
            color: C.text,
          }}
        >
          {distanceKm} km / +{Math.round(elevationGainM)} m
        </div>
      </div>

      {isWall ? (
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
                  background: C.card,
                  borderRadius: 10,
                  padding: "6px 8px",
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>
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
                    }}
                  >
                    <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {localizeName(lang, w.name)}
                    </span>
                    <span
                      style={{
                        color: C.muted,
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
      )}

      <div style={{ fontSize: 8, color: C.muted, textAlign: "center", lineHeight: 1 }}>
        Generated by SimPace · {new Date().toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US")}
      </div>
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
}: {
  cells: string[]
  header?: boolean
  warn?: boolean
  alt?: boolean
  hasCutoff: boolean
  tight?: boolean
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: hasCutoff ? "1.45fr 0.95fr 0.95fr 0.75fr" : "1.5fr 1fr 0.85fr",
        gap: 4,
        padding: tight ? "2px 6px" : "3px 6px",
        borderRadius: 4,
        background: header
          ? "rgba(255,255,255,0.06)"
          : warn
            ? "rgba(224,80,80,0.18)"
            : alt
              ? "rgba(255,255,255,0.03)"
              : "transparent",
        fontSize: header ? 9 : tight ? 10 : 11,
        color: header ? C.muted : C.text,
        fontWeight: header ? 700 : 500,
        lineHeight: 1.25,
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
            color: i === cells.length - 2 ? C.primary : i === 1 && hasCutoff ? C.muted : C.text,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {c}
        </span>
      ))}
    </div>
  )
}
