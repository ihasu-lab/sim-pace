"use client"

import {
  Flag,
  Timer,
  Gauge,
  Route,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  AlertTriangle,
  Clock,
  ImageDown,
} from "lucide-react"
import {
  type SimResult,
  formatDuration,
  formatClock,
  formatPace,
} from "@/lib/simpace"
import { type Lang, t, localizeName } from "@/lib/i18n"
import type { FormState } from "@/lib/store"
import { ElevationChart } from "@/components/elevation-chart"
import { ExportPanel } from "@/components/export-panel"

interface SimPaceResultProps {
  result: SimResult
  state: FormState
  lang: Lang
}

const TERRAIN_META = {
  climb: { icon: TrendingUp, key: "climb", className: "text-accent" },
  flat: { icon: Minus, key: "flat", className: "text-muted-foreground" },
  descent: { icon: TrendingDown, key: "descent", className: "text-primary" },
} as const

export function SimPaceResult({ result, state, lang }: SimPaceResultProps) {
  const isReverse = result.mode === "reverse"
  const distanceKm = Number.parseFloat(state.distance) || 0
  const elevationGainM = Number.parseFloat(state.elevation) || 0
  const hasCutoff = result.segments.some((s) => s.cutoffSec !== null)

  return (
    <div className="flex flex-col gap-6">
      {/* 完走タイム / 目標タイム */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
          <Flag className="size-4" />
          {isReverse ? t(lang, "targetFinish") : t(lang, "estFinish")}
        </div>
        <p className="mt-2 font-mono text-5xl font-bold tracking-tight text-balance sm:text-6xl">
          {formatDuration(result.totalSec, lang)}
        </p>
        <p className="mt-1 font-mono text-sm text-primary-foreground/70">
          {formatClock(result.totalSec)}
        </p>
        <Timer className="pointer-events-none absolute -right-4 -top-4 size-28 text-primary-foreground/10" />
      </div>

      {/* 補足ステータス */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="size-3.5" />
            {isReverse ? t(lang, "gapNeeded") : t(lang, "gap")}
          </span>
          <span className="font-mono text-base font-semibold text-foreground">
            {formatPace(result.gapSecPerKm)} /km
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Route className="size-3.5" />
            {t(lang, "effortDist")}
          </span>
          <span className="font-mono text-base font-semibold text-foreground">
            {Number.isFinite(result.effortKm) ? result.effortKm.toFixed(1) : "0.0"} km
          </span>
        </div>
      </div>

      {/* 標高プロファイル */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TrendingUp className="size-3.5 text-primary" />
          {t(lang, "elevationProfile")}
        </span>
        <ElevationChart
          profile={state.profile}
          distanceKm={distanceKm}
          elevationGainM={elevationGainM}
          waypoints={state.waypoints.filter(
            (w) => w.distanceKm > 0 && w.distanceKm < distanceKm,
          )}
          height={148}
        />
      </div>

      {/* 逆算モードの戦略アドバイス */}
      {result.advice ? <AdviceCard result={result} lang={lang} /> : null}

      {/* 区間通過予想タイムテーブル */}
      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="size-4 text-primary" />
          {isReverse ? t(lang, "scheduleTitleReverse") : t(lang, "scheduleTitle")}
        </h3>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[20rem] table-fixed border-collapse">
            <colgroup>
              <col />
              <col className="w-[6.25rem]" />
              <col className="w-[5.75rem]" />
              {hasCutoff ? <col className="w-[4.75rem]" /> : null}
            </colgroup>
            <thead>
              <tr className="bg-secondary text-xs font-medium text-secondary-foreground">
                <th className="px-4 py-2.5 text-left font-medium">{t(lang, "colPoint")}</th>
                <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">
                  {t(lang, "colGap")}
                </th>
                <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">
                  {t(lang, "colPass")}
                </th>
                {hasCutoff ? (
                  <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                    {t(lang, "colMargin")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {result.segments.map((section, i) => {
                const meta = TERRAIN_META[section.terrain]
                const TerrainIcon = meta.icon
                return (
                  <tr
                    key={`${section.name}-${i}`}
                    className={`${i > 0 ? "border-t border-border" : ""} ${
                      section.marginSec !== null && section.marginSec < 0
                        ? "bg-destructive/10"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <TerrainIcon className={`size-3.5 ${meta.className}`} />
                          {localizeName(lang, section.name)}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span>
                            {section.fromKm.toFixed(1)}–{section.toKm.toFixed(1)}
                            {t(lang, "km")} / +{Math.round(section.gainM)}m
                          </span>
                          {section.stayMin > 0 ? (
                            <span className="flex items-center gap-0.5">
                              <Clock className="size-3" />
                              {t(lang, "stay")}
                              {section.stayMin}
                              {t(lang, "minute")}
                            </span>
                          ) : null}
                        </span>
                        {section.memo ? (
                          <span className="text-xs italic text-muted-foreground/80">
                            {section.memo}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3 align-middle text-right font-mono text-sm tabular-nums text-muted-foreground">
                      {formatPace(section.paceSecPerKm)}
                    </td>
                    <td className="px-2 py-3 align-middle text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatClock(section.cumulativeSec)}
                    </td>
                    {hasCutoff ? (
                      <td
                        className={`px-3 py-3 align-middle text-right font-mono text-xs font-semibold tabular-nums ${
                          section.marginSec === null
                            ? "text-muted-foreground"
                            : section.marginSec < 0
                              ? "text-destructive"
                              : "text-primary"
                        }`}
                      >
                        {section.marginSec === null
                          ? "—"
                          : `${section.marginSec < 0 ? "-" : "+"}${formatDuration(Math.abs(section.marginSec), lang)}`}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isReverse ? t(lang, "noteReverse") : t(lang, "notePredict")}
        </p>
      </div>

      {/* 画像エクスポート */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <ImageDown className="size-4 text-primary" />
          {t(lang, "exportAsImage")}
        </span>
        <ExportPanel result={result} state={state} lang={lang} />
      </div>
    </div>
  )
}

function AdviceCard({ result, lang }: { result: SimResult; lang: Lang }) {
  const advice = result.advice!
  const feasible = advice.feasible
  const kind = advice.kind
  const titleKey = (
    {
      tooFast: "adviceTooFastTitle",
      balanced: "adviceBalancedTitle",
      climb: "adviceClimbTitle",
      descent: "adviceDescentTitle",
      flat: "adviceFlatTitle",
    } as const
  )[kind]
  const msgKey = (
    {
      tooFast: "adviceTooFastMsg",
      balanced: "adviceBalancedMsg",
      climb: "adviceClimbMsg",
      descent: "adviceDescentMsg",
      flat: "adviceFlatMsg",
    } as const
  )[kind]

  const paces = [
    {
      icon: TrendingUp,
      label: t(lang, "adviceClimbGap"),
      value: advice.climbPaceSecPerKm,
      className: "text-accent",
    },
    {
      icon: TrendingDown,
      label: t(lang, "adviceDescentGap"),
      value: advice.descentPaceSecPerKm,
      className: "text-primary",
    },
  ].filter((p) => p.value !== null) as {
    icon: typeof TrendingUp
    label: string
    value: number
    className: string
  }[]

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border-2 p-5 ${
        feasible
          ? "border-accent/40 bg-accent/10"
          : "border-destructive/40 bg-destructive/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            feasible
              ? "bg-accent/20 text-accent-foreground"
              : "bg-destructive/20 text-destructive"
          }`}
        >
          {feasible ? (
            <Lightbulb className="size-5" />
          ) : (
            <AlertTriangle className="size-5" />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold text-foreground text-balance">
            {t(lang, titleKey)}
          </h4>
          <p className="text-sm leading-relaxed text-foreground/80 text-pretty">
            {t(lang, msgKey)}
          </p>
        </div>
      </div>

      {feasible && paces.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {paces.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.label}
                className="flex flex-col gap-0.5 rounded-lg bg-card/70 px-3 py-2"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className={`size-3.5 ${p.className}`} />
                  {p.label}
                </span>
                <span className="font-mono text-base font-bold text-foreground">
                  {formatPace(p.value)} /km
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
