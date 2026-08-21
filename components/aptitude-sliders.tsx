"use client"

import { TrendingUp, Minus, TrendingDown } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { normalizeAptitude, type Aptitudes } from "@/lib/simpace"
import { type Lang, t } from "@/lib/i18n"

interface AptitudeSlidersProps {
  value: Aptitudes
  onChange: (value: Aptitudes) => void
  lang: Lang
}

const LEVEL_KEYS = [
  "aptLevel1",
  "aptLevel2",
  "aptLevel3",
  "aptLevel4",
  "aptLevel5",
] as const

const ITEMS: {
  key: keyof Aptitudes
  labelKey: "aptitudeClimb" | "aptitudeFlat" | "aptitudeDescent"
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: "climb", labelKey: "aptitudeClimb", icon: TrendingUp },
  { key: "flat", labelKey: "aptitudeFlat", icon: Minus },
  { key: "descent", labelKey: "aptitudeDescent", icon: TrendingDown },
]

export function AptitudeSliders({ value, onChange, lang }: AptitudeSlidersProps) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-medium">
        {t(lang, "aptitudeTitle")}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {t(lang, "aptitudeHint")}
        </span>
      </legend>

      {ITEMS.map((item) => {
        const Icon = item.icon
        const level = normalizeAptitude(value[item.key])
        const label = t(lang, item.labelKey)
        return (
          <div key={item.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Icon className="size-4 text-primary" />
                {label}
              </span>
              <span className="flex items-baseline gap-1.5 font-mono text-sm font-semibold text-primary">
                {level}
                <span className="text-xs font-normal text-muted-foreground">
                  {t(lang, LEVEL_KEYS[level - 1])}
                </span>
              </span>
            </div>
            <Slider
              value={level}
              min={1}
              max={5}
              step={1}
              onValueChange={(v) => {
                const raw = Array.isArray(v) ? v[0] : v
                const next = normalizeAptitude(raw)
                if (next === level) return
                onChange({ ...value, [item.key]: next })
              }}
              aria-label={label}
            />
            <div className="flex justify-between px-0.5 text-[10px] text-muted-foreground">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>
        )
      })}
    </fieldset>
  )
}
