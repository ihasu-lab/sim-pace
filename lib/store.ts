"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { normalizeAptitudes, type Aptitudes, type ElevationPoint, type Mode, type Waypoint } from "./simpace"
import type { Lang } from "./i18n"

export interface FormState {
  lang: Lang
  mode: Mode
  itra: string
  distance: string
  elevation: string
  targetH: string
  targetM: string
  aptitudes: Aptitudes
  waypoints: Waypoint[]
  gpxName: string | null
  profile?: ElevationPoint[]
}

export const DEFAULT_STATE: FormState = {
  lang: "ja",
  mode: "predict",
  itra: "",
  distance: "",
  elevation: "",
  targetH: "",
  targetM: "",
  aptitudes: { climb: 3, flat: 3, descent: 3 },
  waypoints: [
    { id: "wp-default-1", name: "第1エイド", distanceKm: 10, stayMin: 5 },
    { id: "wp-default-2", name: "第2エイド", distanceKm: 25, stayMin: 10 },
    { id: "wp-default-3", name: "第3エイド", distanceKm: 40, stayMin: 5 },
  ],
}

const STORAGE_KEY = "simpace:state:v1"

function reviveState(raw: unknown): FormState {
  if (!raw || typeof raw !== "object") return DEFAULT_STATE
  const r = raw as Partial<FormState>
  return {
    ...DEFAULT_STATE,
    ...r,
    aptitudes: normalizeAptitudes(r.aptitudes),
    waypoints: Array.isArray(r.waypoints) ? r.waypoints : DEFAULT_STATE.waypoints,
  }
}

/** LocalStorageに自動保存される状態フック */
export function useSimPaceStore() {
  const [state, setState] = useState<FormState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)
  const loaded = useRef(false)

  // 初回マウント時にLocalStorageから復元
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setState(reviveState(JSON.parse(stored)))
    } catch {
      // 破損データは無視
    }
    loaded.current = true
    setHydrated(true)
  }, [])

  // 変更を自動保存（復元完了後のみ）
  useEffect(() => {
    if (!loaded.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // 容量超過等は無視
    }
  }, [state])

  const patch = useCallback((p: Partial<FormState>) => {
    setState((prev) => ({ ...prev, ...p }))
  }, [])

  const replace = useCallback((next: FormState) => {
    setState(reviveState(next))
  }, [])

  return { state, patch, replace, hydrated }
}

/** 状態をJSON文字列にシリアライズ */
export function serializeState(state: FormState): string {
  return JSON.stringify(state, null, 2)
}

/** JSON文字列を状態に復元（不正な場合は例外） */
export function deserializeState(text: string): FormState {
  const parsed = JSON.parse(text)
  return reviveState(parsed)
}
