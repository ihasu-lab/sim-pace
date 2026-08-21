"use client"

import type React from "react"
import { useRef } from "react"
import { Download, Upload, Languages, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Lang, t } from "@/lib/i18n"
import {
  type FormState,
  serializeState,
  deserializeState,
} from "@/lib/store"

interface AppToolbarProps {
  state: FormState
  onReplace: (next: FormState) => void
  onLang: (lang: Lang) => void
  saved: boolean
}

export function AppToolbar({ state, onReplace, onLang, saved }: AppToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const lang = state.lang

  const handleExport = () => {
    const blob = new Blob([serializeState(state)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `simpace-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const text = await file.text()
      onReplace(deserializeState(text))
    } catch {
      alert(lang === "ja" ? "JSONの読み込みに失敗しました" : "Failed to import JSON")
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* 言語トグル */}
      <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
        <Languages className="ml-1 size-4 text-muted-foreground" />
        <LangBtn active={lang === "ja"} onClick={() => onLang("ja")} label="日本語" />
        <LangBtn active={lang === "en"} onClick={() => onLang("en")} label="EN" />
      </div>

      {/* JSON入出力 */}
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Check className="size-3.5 text-primary" />
          {saved ? t(lang, "saved") : ""}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-1.5 bg-transparent text-xs"
        >
          <Download className="size-3.5" />
          {t(lang, "exportJson")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          className="gap-1.5 bg-transparent text-xs"
        >
          <Upload className="size-3.5" />
          {t(lang, "importJson")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleImport}
        />
      </div>
    </div>
  )
}

function LangBtn({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}
