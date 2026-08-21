"use client"

import { useEffect, useState } from "react"
import { Activity, MapPinned, Route, Siren } from "lucide-react"
import { SimPaceForm } from "@/components/simpace-form"
import { SimPaceResult } from "@/components/simpace-result"
import { BPlanPanel } from "@/components/bplan-panel"
import { AppToolbar } from "@/components/app-toolbar"
import { calculate, type SimInput, type SimResult } from "@/lib/simpace"
import { useSimPaceStore } from "@/lib/store"
import { t } from "@/lib/i18n"

type TopTab = "plan" | "bplan"

/** Hero backgrounds in /public/images — add new files here to include them. */
const HERO_IMAGES = [
  "/images/trail-hero01.png",
  "/images/trail-hero02.jpg",
  "/images/trail-hero03.jpg",
  "/images/trail-hero04.png",
  "/images/trail-hero05.jpg",
  "/images/trail-hero06.jpg",
] as const

function pickHeroImage(): string {
  const i = Math.floor(Math.random() * HERO_IMAGES.length)
  return HERO_IMAGES[i] ?? HERO_IMAGES[0]
}

export default function Page() {
  const { state, patch, replace, hydrated } = useSimPaceStore()
  const [result, setResult] = useState<SimResult | null>(null)
  const [tab, setTab] = useState<TopTab>("plan")
  const [heroSrc, setHeroSrc] = useState<string | null>(null)
  const lang = state.lang

  useEffect(() => {
    setHeroSrc(pickHeroImage())
  }, [])

  const handleCalculate = (input: SimInput) => {
    setResult(calculate(input))
  }

  return (
    <main className="min-h-dvh bg-background">
      {/* ヒーロー: 読み込みごとにランダムな背景画像 */}
      <header
        className="relative h-52 overflow-hidden bg-secondary bg-cover bg-center sm:h-72"
        style={heroSrc ? { backgroundImage: `url("${heroSrc}")` } : undefined}
        role="img"
        aria-label={
          lang === "ja"
            ? "日本の険しい山の稜線を走るトレイルランナー"
            : "Trail runners on a rugged Japanese mountain ridge"
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-2xl px-5 pb-5">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="size-5" />
            <span className="text-sm font-semibold tracking-wide">SimPace</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-balance text-foreground sm:text-3xl">
            {t(lang, "appTitle")}
          </h1>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6">
        {/* ツールバー: 言語切替 + JSON入出力 */}
        <AppToolbar
          state={state}
          onReplace={replace}
          onLang={(l) => patch({ lang: l })}
          saved={hydrated}
        />

        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {t(lang, "intro")}
        </p>

        {/* トップレベルのタブ: 通常シミュレーション / Bプラン */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          <TopTabBtn
            active={tab === "plan"}
            onClick={() => setTab("plan")}
            icon={Route}
            label={t(lang, "tabPlan")}
          />
          <TopTabBtn
            active={tab === "bplan"}
            onClick={() => setTab("bplan")}
            icon={Siren}
            label={t(lang, "tabBPlan")}
          />
        </div>

        {tab === "plan" ? (
          <>
            {/* 入力カード */}
            <section
              aria-label={t(lang, "inputArea")}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <SimPaceForm
                value={state}
                onPatch={patch}
                onCalculate={handleCalculate}
              />
            </section>

            {/* 結果 */}
            <section aria-label={t(lang, "resultArea")} aria-live="polite">
              {result ? (
                <SimPaceResult result={result} state={state} lang={lang} />
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
                  <MapPinned className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-pretty">
                    {t(lang, "emptyResult")}
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          <BPlanPanel state={state} lang={lang} />
        )}

        <footer className="pb-4 pt-2 text-center text-xs text-muted-foreground">
          {t(lang, "footer")}
        </footer>
      </div>
    </main>
  )
}

function TopTabBtn({
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
