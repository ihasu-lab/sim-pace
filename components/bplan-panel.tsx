"use client"

import type React from "react"
import { useMemo, useState } from "react"
import {
  Siren,
  MapPin,
  Timer,
  Gauge,
  Flag,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  recalcBPlan,
  formatDuration,
  formatClock,
  formatPace,
  type BPlanResult,
  type TerrainGait,
  type TerrainGaits,
} from "@/lib/simpace"
import { type Lang, t, localizeName } from "@/lib/i18n"
import type { FormState } from "@/lib/store"

interface BPlanPanelProps {
  state: FormState
  lang: Lang
}

const OUTPUT_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

const TERRAIN_META = {
  climb: { icon: TrendingUp, className: "text-accent" },
  flat: { icon: Minus, className: "text-muted-foreground" },
  descent: { icon: TrendingDown, className: "text-primary" },
} as const

export function BPlanPanel({ state, lang }: BPlanPanelProps) {
  const distanceKm = Number.parseFloat(state.distance)
  const elevationGainM = Number.parseFloat(state.elevation)
  const ready = distanceKm > 0 && elevationGainM >= 0

  const aids = useMemo(
    () =>
      state.waypoints
        .filter((w) => w.distanceKm > 0 && (!ready || w.distanceKm < distanceKm))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [state.waypoints, distanceKm, ready],
  )

  const [currentKm, setCurrentKm] = useState("")
  const [elapsedH, setElapsedH] = useState("")
  const [elapsedM, setElapsedM] = useState("")
  const [output, setOutput] = useState(70)
  const [gaits, setGaits] = useState<TerrainGaits>({
    flat: "run",
    climb: "run",
    descent: "run",
  })
  const [result, setResult] = useState<BPlanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRecalc = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const km = Number.parseFloat(currentKm)
    const elapsedSec =
      (Number.parseInt(elapsedH || "0", 10) || 0) * 3600 +
      (Number.parseInt(elapsedM || "0", 10) || 0) * 60
    if (!(km > 0) || km >= distanceKm) {
      setError(t(lang, "bplanPosErr"))
      return
    }
    if (!(elapsedSec > 0)) {
      setError(t(lang, "bplanElapsedErr"))
      return
    }
    setResult(
      recalcBPlan({
        distanceKm,
        elevationGainM,
        aptitudes: state.aptitudes,
        waypoints: state.waypoints,
        profile: state.profile,
        currentKm: km,
        elapsedSec,
        outputFactor: output / 100,
        gaits,
      }),
    )
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
        <Siren className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-pretty">
          {t(lang, "bplanNeedCourse")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleRecalc}
        className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <Siren className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {t(lang, "bplanTitle")}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground text-pretty">
              {t(lang, "bplanDesc")}
            </p>
          </div>
        </div>

        {/* 現在地 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="bplan-km" className="text-sm font-medium">
            {t(lang, "currentPos")}
          </Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="bplan-km"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="20.00"
              value={currentKm}
              onChange={(e) => setCurrentKm(e.target.value)}
              className="h-12 pl-10 pr-9 text-base"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              km
            </span>
          </div>
          {aids.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <span className="self-center text-xs text-muted-foreground">
                {t(lang, "currentPosAid")}:
              </span>
              {aids.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setCurrentKm(String(w.distanceKm))}
                  className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {localizeName(lang, w.name)}
                  <span className="ml-1 font-mono text-muted-foreground">
                    {w.distanceKm}km
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* 経過時間 */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">{t(lang, "elapsed")}</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Timer className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={`${t(lang, "elapsed")} (${t(lang, "hour")})`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="3"
                value={elapsedH}
                onChange={(e) => setElapsedH(e.target.value)}
                className="h-12 pl-10 pr-10 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {t(lang, "hour")}
              </span>
            </div>
            <div className="relative flex-1">
              <Input
                aria-label={`${t(lang, "elapsed")} (${t(lang, "minute")})`}
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                step="1"
                placeholder="30"
                value={elapsedM}
                onChange={(e) => setElapsedM(e.target.value)}
                className="h-12 pr-8 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {t(lang, "minute")}
              </span>
            </div>
          </div>
        </div>

        {/* 残り区間の出力 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t(lang, "output")}</Label>
            <span className="font-mono text-sm font-semibold text-primary">
              {output}%
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1 rounded-xl bg-secondary p-1">
            {OUTPUT_STEPS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutput(o)}
                aria-pressed={output === o}
                className={`rounded-lg py-2 text-xs font-semibold tabular-nums transition-colors ${
                  output === o
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o}%
              </button>
            ))}
          </div>
        </div>

        {/* 地形ごとの走法 */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">{t(lang, "gaitSection")}</Label>
          <div className="flex flex-col gap-2">
            <GaitRow
              icon={Minus}
              iconClass="text-muted-foreground"
              label={t(lang, "flat")}
              value={gaits.flat}
              onChange={(gait) => setGaits((prev) => ({ ...prev, flat: gait }))}
              lang={lang}
            />
            <GaitRow
              icon={TrendingUp}
              iconClass="text-accent"
              label={t(lang, "uphill")}
              value={gaits.climb}
              onChange={(gait) => setGaits((prev) => ({ ...prev, climb: gait }))}
              lang={lang}
            />
            <GaitRow
              icon={TrendingDown}
              iconClass="text-primary"
              label={t(lang, "downhill")}
              value={gaits.descent}
              onChange={(gait) => setGaits((prev) => ({ ...prev, descent: gait }))}
              lang={lang}
            />
          </div>
        </div>

        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5" />
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="h-12 w-full text-base font-semibold">
          {t(lang, "recalc")}
        </Button>
      </form>

      {result ? <BPlanResultView result={result} lang={lang} /> : null}
    </div>
  )
}

function BPlanResultView({
  result,
  lang,
}: {
  result: BPlanResult
  lang: Lang
}) {
  const alert = result.anyMissed
    ? {
        tone: "missed" as const,
        icon: AlertTriangle,
        title: t(lang, "cutoffRisk"),
        msg: t(lang, "cutoffMissedMsg"),
      }
    : result.anyWarn
      ? {
          tone: "warn" as const,
          icon: AlertTriangle,
          title: t(lang, "cutoffTight"),
          msg: t(lang, "cutoffWarnMsg"),
        }
      : {
          tone: "ok" as const,
          icon: CheckCircle2,
          title: t(lang, "cutoffClear"),
          msg: t(lang, "cutoffOk"),
        }

  const AlertIcon = alert.icon

  return (
    <div className="flex flex-col gap-5">
      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flag className="size-3.5" />
            {t(lang, "projectedFinish")}
          </span>
          <span className="font-mono text-2xl font-bold text-foreground">
            {formatDuration(result.projectedFinishSec, lang)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatClock(result.projectedFinishSec)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="size-3.5" />
            {t(lang, "observedPace")}
          </span>
          <span className="font-mono text-2xl font-bold text-foreground">
            {formatPace(result.observedPaceSecPerKm)}
          </span>
          <span className="text-xs text-muted-foreground">/km (GAP)</span>
        </div>
      </div>

      {/* 警告アラート */}
      <div
        className={`flex items-start gap-3 rounded-2xl border-2 p-4 ${
          alert.tone === "missed"
            ? "border-destructive/50 bg-destructive/10"
            : alert.tone === "warn"
              ? "border-accent/50 bg-accent/10"
              : "border-primary/40 bg-primary/10"
        }`}
      >
        <AlertIcon
          className={`size-5 shrink-0 ${
            alert.tone === "missed"
              ? "text-destructive"
              : alert.tone === "warn"
                ? "text-accent"
                : "text-primary"
          }`}
        />
        <div>
          <h4 className="text-sm font-bold text-foreground">{alert.title}</h4>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground/80 text-pretty">
            {alert.msg}
          </p>
        </div>
      </div>

      {/* 残り区間テーブル */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[20rem] table-fixed border-collapse">
          <colgroup>
            <col />
            <col className="w-[5.75rem]" />
            <col className="w-[5.75rem]" />
            <col className="w-[4.75rem]" />
          </colgroup>
          <thead>
            <tr className="bg-secondary text-xs font-medium text-secondary-foreground">
              <th className="px-4 py-2.5 text-left font-medium">{t(lang, "colPoint")}</th>
              <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">
                {t(lang, "colPass")}
              </th>
              <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">
                {t(lang, "colCutoff")}
              </th>
              <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                {t(lang, "colMargin")}
              </th>
            </tr>
          </thead>
          <tbody>
            {result.segments.map((s, i) => {
              const meta = TERRAIN_META[s.terrain]
              const Icon = meta.icon
              return (
                <tr
                  key={`${s.name}-${i}`}
                  className={`${i > 0 ? "border-t border-border" : ""} ${
                    s.status === "missed"
                      ? "bg-destructive/10"
                      : s.status === "warn"
                        ? "bg-accent/10"
                        : ""
                  }`}
                >
                  <td className="px-4 py-3 align-middle">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Icon className={`size-3.5 ${meta.className}`} />
                      {localizeName(lang, s.name)}
                    </span>
                  </td>
                  <td className="px-2 py-3 align-middle text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatClock(s.arrivalSec)}
                  </td>
                  <td className="px-2 py-3 align-middle text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {s.cutoffSec !== null ? formatClock(s.cutoffSec) : "—"}
                  </td>
                  <td
                    className={`px-3 py-3 align-middle text-right font-mono text-sm font-semibold tabular-nums ${
                      s.marginSec === null
                        ? "text-muted-foreground"
                        : s.marginSec < 0
                          ? "text-destructive"
                          : s.status === "warn"
                            ? "text-accent"
                            : "text-primary"
                    }`}
                  >
                    {s.marginSec === null
                      ? "—"
                      : `${s.marginSec < 0 ? "-" : "+"}${formatDuration(Math.abs(s.marginSec), lang)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t(lang, "bplanNote")}
      </p>
    </div>
  )
}

function GaitRow({
  icon: Icon,
  iconClass,
  label,
  value,
  onChange,
  lang,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  label: string
  value: TerrainGait
  onChange: (gait: TerrainGait) => void
  lang: Lang
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex min-w-[5.5rem] items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon className={`size-4 ${iconClass}`} />
        {label}
      </span>
      <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {(["walk", "run"] as const).map((gait) => (
          <button
            key={gait}
            type="button"
            onClick={() => onChange(gait)}
            aria-pressed={value === gait}
            className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
              value === gait
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(lang, gait)}
          </button>
        ))}
      </div>
    </div>
  )
}
