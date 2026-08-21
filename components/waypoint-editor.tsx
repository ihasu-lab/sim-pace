"use client"

import { useEffect, useState } from "react"
import { MapPin, Plus, Trash2, Flag, Clock, StickyNote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { type Lang, t } from "@/lib/i18n"
import { type Waypoint, parseHM, formatHM } from "@/lib/simpace"

interface WaypointEditorProps {
  waypoints: Waypoint[]
  onChange: (waypoints: Waypoint[]) => void
  lang: Lang
}

let idSeq = 0
function newId() {
  idSeq += 1
  return `wp-${Date.now()}-${idSeq}`
}

export function WaypointEditor({ waypoints, onChange, lang }: WaypointEditorProps) {
  const update = (id: string, patch: Partial<Waypoint>) => {
    onChange(waypoints.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

  const remove = (id: string) => {
    onChange(waypoints.filter((w) => w.id !== id))
  }

  const add = () => {
    const last = waypoints[waypoints.length - 1]
    const nextKm = last ? Math.round(last.distanceKm + 10) : 10
    onChange([
      ...waypoints,
      {
        id: newId(),
        name: `${t(lang, "aidDefault")}${waypoints.length + 1}`,
        distanceKm: nextKm,
        stayMin: 5,
      },
    ])
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">
        {t(lang, "waypointTitle")}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {t(lang, "waypointHint")}
        </span>
      </legend>

      {waypoints.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          {t(lang, "waypointEmpty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {waypoints.map((w) => (
            <div
              key={w.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-3"
            >
              {/* 1行目: ポイント名 + 削除 */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label={t(lang, "pointName")}
                    value={w.name}
                    onChange={(e) => update(w.id, { name: e.target.value })}
                    placeholder={t(lang, "pointNamePh")}
                    className="h-10 pl-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(w.id)}
                  aria-label={`${t(lang, "deletePoint")}: ${w.name}`}
                  className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {/* 2行目: 距離 / 関門 / 滞在 */}
              <div className="grid grid-cols-3 gap-2">
                <Field label={t(lang, "wpDistance")} hint="km">
                  <Input
                    aria-label={`${t(lang, "wpDistance")} (km)`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={Number.isFinite(w.distanceKm) ? String(w.distanceKm) : ""}
                    onChange={(e) =>
                      update(w.id, {
                        distanceKm: Number.parseFloat(e.target.value),
                      })
                    }
                    className="h-9 pl-7 text-right font-mono text-sm"
                  />
                  <FieldIcon icon={MapPin} />
                </Field>
                <Field label={t(lang, "wpCutoff")} hint="H:MM">
                  <CutoffInput
                    cutoffSec={w.cutoffSec}
                    onCommit={(sec) => update(w.id, { cutoffSec: sec })}
                    lang={lang}
                  />
                  <FieldIcon icon={Flag} />
                </Field>
                <Field label={t(lang, "wpStay")} hint={t(lang, "minute")}>
                  <Input
                    aria-label={`${t(lang, "wpStay")} (${t(lang, "minute")})`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={Number.isFinite(w.stayMin) ? String(w.stayMin ?? 0) : ""}
                    onChange={(e) =>
                      update(w.id, {
                        stayMin: Number.parseInt(e.target.value || "0", 10) || 0,
                      })
                    }
                    className="h-9 pl-7 text-right font-mono text-sm"
                  />
                  <FieldIcon icon={Clock} />
                </Field>
              </div>

              {/* 3行目: メモ */}
              <div className="relative">
                <StickyNote className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label={t(lang, "wpMemo")}
                  value={w.memo ?? ""}
                  onChange={(e) => update(w.id, { memo: e.target.value })}
                  placeholder={t(lang, "wpMemoPh")}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        className="h-10 w-full gap-1.5 bg-transparent text-sm"
      >
        <Plus className="size-4" />
        {t(lang, "addRow")}
      </Button>
    </fieldset>
  )
}

/** 関門時刻の制御コンポーネント: 表示はH:MM文字列、確定時に秒へ変換 */
function CutoffInput({
  cutoffSec,
  onCommit,
  lang,
}: {
  cutoffSec: number | null | undefined
  onCommit: (sec: number | null) => void
  lang: Lang
}) {
  const [text, setText] = useState(() => formatHM(cutoffSec))

  // 外部（JSON読込・GPX等）からの変更を反映
  useEffect(() => {
    setText(formatHM(cutoffSec))
  }, [cutoffSec])

  return (
    <Input
      aria-label={`${t(lang, "wpCutoff")} (H:MM)`}
      inputMode="numeric"
      placeholder="6:30"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(parseHM(text))}
      className="h-9 pl-7 text-right font-mono text-sm"
    />
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between px-0.5 text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{hint}</span>
      </span>
      <span className="relative block">{children}</span>
    </label>
  )
}

function FieldIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Icon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
  )
}
