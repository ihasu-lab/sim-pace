"use client"

import type React from "react"
import { useState } from "react"
import { Gauge, Route, TrendingUp, Target, Activity, Timer } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { GpxUpload } from "@/components/gpx-upload"
import { AptitudeSliders } from "@/components/aptitude-sliders"
import { WaypointEditor } from "@/components/waypoint-editor"
import type { GpxData } from "@/lib/gpx"
import { normalizeAptitudes, type SimInput } from "@/lib/simpace"
import { t } from "@/lib/i18n"
import type { FormState } from "@/lib/store"

interface SimPaceFormProps {
  value: FormState
  onPatch: (patch: Partial<FormState>) => void
  onCalculate: (input: SimInput) => void
}

export function SimPaceForm({ value, onPatch, onCalculate }: SimPaceFormProps) {
  const {
    mode,
    itra,
    distance,
    elevation,
    targetH,
    targetM,
    aptitudes,
    waypoints,
    gpxName,
    lang,
  } = value
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const handleGpxLoaded = (data: GpxData) => {
    onPatch({
      gpxName: data.name,
      distance: String(data.distanceKm),
      elevation: String(data.elevationGainM),
      profile: data.profile,
    })
  }

  const handleGpxClear = () => {
    onPatch({ gpxName: null, profile: undefined })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const distanceKm = Number.parseFloat(distance)
    const elevationGainM = Number.parseFloat(elevation)
    const itraIndex = Number.parseFloat(itra)
    const targetSec =
      (Number.parseInt(targetH || "0", 10) || 0) * 3600 +
      (Number.parseInt(targetM || "0", 10) || 0) * 60

    const nextErrors: Record<string, boolean> = {
      distance: !(distanceKm > 0),
      elevation: !(elevationGainM >= 0),
      itra: mode === "predict" && !(itraIndex > 0),
      target: mode === "reverse" && !(targetSec > 0),
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    const cleanWaypoints = waypoints.filter(
      (w) => Number.isFinite(w.distanceKm) && w.distanceKm > 0,
    )
    const safeAptitudes = normalizeAptitudes(aptitudes)

    if (mode === "predict") {
      onCalculate({
        mode: "predict",
        itraIndex,
        distanceKm,
        elevationGainM,
        aptitudes: safeAptitudes,
        waypoints: cleanWaypoints,
        profile: value.profile,
      })
    } else {
      onCalculate({
        mode: "reverse",
        targetSec,
        distanceKm,
        elevationGainM,
        aptitudes: safeAptitudes,
        waypoints: cleanWaypoints,
        profile: value.profile,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* GPXアップロード */}
      <GpxUpload
        onLoaded={handleGpxLoaded}
        loadedName={gpxName}
        onClear={handleGpxClear}
        lang={lang}
      />

      {/* モード切り替え */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t(lang, "calcMode")}</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          <ModeTab
            active={mode === "predict"}
            onClick={() => onPatch({ mode: "predict" })}
            icon={Activity}
            label={t(lang, "modePredict")}
          />
          <ModeTab
            active={mode === "reverse"}
            onClick={() => onPatch({ mode: "reverse" })}
            icon={Target}
            label={t(lang, "modeReverse")}
          />
        </div>
      </div>

      {/* モード別の主要入力 */}
      {mode === "predict" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="itra" className="text-sm font-medium">
            ITRA INDEX
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {t(lang, "itraHint")}
            </span>
          </Label>
          <div className="relative">
            <Gauge className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="itra"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder={t(lang, "itraPlaceholder")}
              value={itra}
              onChange={(e) => onPatch({ itra: e.target.value })}
              aria-invalid={errors.itra}
              className="h-12 pl-10 text-base"
            />
          </div>
          {errors.itra ? (
            <p className="text-xs text-destructive">{t(lang, "errNumber")}</p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">
            {t(lang, "targetTime")}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {t(lang, "targetTimeHint")}
            </span>
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Timer className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={`${t(lang, "targetTime")} (${t(lang, "hour")})`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="8"
                value={targetH}
                onChange={(e) => onPatch({ targetH: e.target.value })}
                aria-invalid={errors.target}
                className="h-12 pl-10 pr-10 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {t(lang, "hour")}
              </span>
            </div>
            <div className="relative flex-1">
              <Input
                aria-label={`${t(lang, "targetTime")} (${t(lang, "minute")})`}
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                step="1"
                placeholder="30"
                value={targetM}
                onChange={(e) => onPatch({ targetM: e.target.value })}
                aria-invalid={errors.target}
                className="h-12 pr-8 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {t(lang, "minute")}
              </span>
            </div>
          </div>
          {errors.target ? (
            <p className="text-xs text-destructive">{t(lang, "errTarget")}</p>
          ) : null}
        </div>
      )}

      {/* 距離・獲得標高 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="distance" className="text-sm font-medium">
            {t(lang, "raceDistance")}
          </Label>
          <div className="relative">
            <Route className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="distance"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="42.00"
              value={distance}
              onChange={(e) => onPatch({ distance: e.target.value })}
              aria-invalid={errors.distance}
              className="h-12 pl-10 pr-9 text-base"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              km
            </span>
          </div>
          {errors.distance ? (
            <p className="text-xs text-destructive">{t(lang, "errDistance")}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="elevation" className="text-sm font-medium">
            {t(lang, "elevationGain")}
          </Label>
          <div className="relative">
            <TrendingUp className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="elevation"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="2500"
              value={elevation}
              onChange={(e) => onPatch({ elevation: e.target.value })}
              aria-invalid={errors.elevation}
              className="h-12 pl-10 pr-8 text-base"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              m
            </span>
          </div>
          {errors.elevation ? (
            <p className="text-xs text-destructive">{t(lang, "errElevation")}</p>
          ) : null}
        </div>
      </div>

      {/* 適性スライダー */}
      <AptitudeSliders
        value={aptitudes}
        onChange={(next) => onPatch({ aptitudes: next })}
        lang={lang}
      />

      {/* 通過ポイント */}
      <WaypointEditor
        waypoints={waypoints}
        onChange={(next) => onPatch({ waypoints: next })}
        lang={lang}
      />

      <Button type="submit" size="lg" className="h-12 w-full text-base font-semibold">
        {mode === "predict" ? t(lang, "calcPredict") : t(lang, "calcReverse")}
      </Button>
    </form>
  )
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}
