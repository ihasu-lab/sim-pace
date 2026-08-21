"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Upload, FileCheck2, X, AlertCircle } from "lucide-react"
import { parseGpx, type GpxData } from "@/lib/gpx"
import { type Lang, t } from "@/lib/i18n"

interface GpxUploadProps {
  onLoaded: (data: GpxData) => void
  loadedName: string | null
  onClear: () => void
  lang: Lang
}

export function GpxUpload({ onLoaded, loadedName, onClear, lang }: GpxUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setError(t(lang, "gpxNeedFile"))
      return
    }
    try {
      const text = await file.text()
      const data = parseGpx(text)
      onLoaded(data)
    } catch (e) {
      const code = e instanceof Error ? e.message : ""
      setError(
        code === "PARSE"
          ? t(lang, "gpxParseErr")
          : code === "NO_POINTS"
            ? t(lang, "gpxNoPoints")
            : t(lang, "gpxFail"),
      )
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  if (loadedName) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <FileCheck2 className="size-4 shrink-0 text-primary" />
          <span className="truncate">{loadedName}</span>
        </span>
        <button
          type="button"
          onClick={onClear}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="size-3.5" />
          {t(lang, "gpxClear")}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/10"
            : "border-border bg-secondary/40 hover:border-primary/50 hover:bg-secondary/70"
        }`}
      >
        <Upload className="size-7 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {t(lang, "gpxUpload")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t(lang, "gpxDrop")}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".gpx,application/gpx+xml"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ""
        }}
      />
      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t(lang, "gpxHint")}
        </p>
      )}
    </div>
  )
}
