export type Mode = "predict" | "reverse"

/** 各適性は 1(苦手) 〜 3(普通) 〜 5(得意) */
export interface Aptitudes {
  climb: number
  flat: number
  descent: number
}

export interface Waypoint {
  id: string
  name: string
  distanceKm: number
  /** 関門(カットオフ)時刻: スタートからの経過秒。未設定は null */
  cutoffSec?: number | null
  /** エイド滞在時間(分) */
  stayMin?: number
  /** メモ */
  memo?: string
}

/** GPXから抽出した標高プロファイルの1点 */
export interface ElevationPoint {
  distKm: number
  eleM: number
}

interface CommonInput {
  distanceKm: number
  elevationGainM: number
  aptitudes: Aptitudes
  waypoints: Waypoint[]
  profile?: ElevationPoint[]
}

export interface PredictInput extends CommonInput {
  mode: "predict"
  itraIndex: number
}

export interface ReverseInput extends CommonInput {
  mode: "reverse"
  targetSec: number
}

export type SimInput = PredictInput | ReverseInput

/** 適性値を 1〜5 の整数に正規化。不正値は「普通」(3) にフォールバック */
export function normalizeAptitude(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return 3
  return Math.min(5, Math.max(1, Math.round(n)))
}

export function normalizeAptitudes(a?: Partial<Aptitudes> | null): Aptitudes {
  return {
    climb: normalizeAptitude(a?.climb),
    flat: normalizeAptitude(a?.flat),
    descent: normalizeAptitude(a?.descent),
  }
}

export interface SegmentResult {
  name: string
  fromKm: number
  toKm: number
  distanceKm: number
  gainM: number
  lossM: number
  durationSec: number
  cumulativeSec: number
  /** この区間の実効ペース (秒/km) */
  paceSecPerKm: number
  /** レース全体に対する累積進捗 (0-1) */
  progress: number
  /** 区間の地形分類 */
  terrain: "climb" | "flat" | "descent"
  /** この地点の関門時刻(秒)。未設定は null */
  cutoffSec: number | null
  /** 関門猶予 = cutoffSec - cumulativeSec（負は関門アウト）。未設定は null */
  marginSec: number | null
  /** エイド滞在時間(分) */
  stayMin: number
  /** メモ */
  memo?: string
}

export type AdviceKind = "tooFast" | "balanced" | "climb" | "descent" | "flat"

export interface StrategyAdvice {
  feasible: boolean
  kind: AdviceKind
  climbPaceSecPerKm: number | null
  descentPaceSecPerKm: number | null
}

export interface SimResult {
  mode: Mode
  totalSec: number
  /** 平地換算ペース GAP (秒/km) */
  gapSecPerKm: number
  effortKm: number
  segments: SegmentResult[]
  advice: StrategyAdvice | null
}

/* ---------- 係数 ---------- */

/** フラット適性による平地ペース補正係数（大きいほど遅い） */
function flatMultiplier(flat: number): number {
  return 1 + (3 - flat) * 0.03 // flat1=1.06, flat3=1.0, flat5=0.94
}

/** 登り適性による、標高1m登坂あたりの追加秒数 */
function climbSecPerM(climb: number): number {
  return 4.6 - (climb - 3) * 0.7 // climb1=6.0, climb3=4.6, climb5=3.2
}

/** 下り適性による、標高1m下降あたりの短縮秒数 */
function descSaveSecPerM(descent: number): number {
  return Math.max(1.0 + (descent - 3) * 0.45, 0.1) // desc1=0.1, desc3=1.0, desc5=1.9
}

/** 進捗に応じた疲労係数（後半ほど失速） */
function fatigue(progressMid: number): number {
  return 1 + 0.22 * progressMid
}

/**
 * ITRA INDEX から平地基準速度 (km/h) を推定。
 * よりアグレッシブ（現実的）なタイムになるよう従来比 約18%高速化。
 * 目安: INDEX 300 → 約7.6km/h, 500 → 約9.4km/h, 800 → 約12.2km/h
 */
function flatSpeedFromItra(itraIndex: number): number {
  const speed = (4 + itraIndex / 125) * 1.18
  return Math.min(Math.max(speed, 3.5), 16)
}

/* ---------- 区間分割 ---------- */

interface RawSegment {
  name: string
  fromKm: number
  toKm: number
  distanceKm: number
  gainM: number
  lossM: number
  progressMid: number
  cutoffSec: number | null
  stayMin: number
  memo?: string
}

/** プロファイルから区間 [from,to] の獲得/消失標高を求める */
function elevationBetween(
  profile: ElevationPoint[],
  fromKm: number,
  toKm: number,
): { gain: number; loss: number } {
  let gain = 0
  let loss = 0
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1]
    const b = profile[i]
    const span = b.distKm - a.distKm
    if (span <= 0) continue
    const s = Math.max(a.distKm, fromKm)
    const e = Math.min(b.distKm, toKm)
    if (e <= s) continue
    const frac = (e - s) / span
    const dele = (b.eleM - a.eleM) * frac
    if (dele > 0) gain += dele
    else loss += -dele
  }
  return { gain, loss }
}

function buildSegments(input: CommonInput): RawSegment[] {
  const { distanceKm, elevationGainM, waypoints, profile } = input

  // 距離でソートし範囲内の境界を作る
  const bounds = waypoints
    .filter((w) => w.distanceKm > 0 && w.distanceKm < distanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  const points: {
    name: string
    distanceKm: number
    cutoffSec: number | null
    stayMin: number
    memo?: string
  }[] = bounds.map((w) => ({
    name: w.name.trim() || `${w.distanceKm}km`,
    distanceKm: w.distanceKm,
    cutoffSec: w.cutoffSec ?? null,
    stayMin: w.stayMin ?? 0,
    memo: w.memo,
  }))
  // フィニッシュ境界を必ず追加
  points.push({
    name: "フィニッシュ",
    distanceKm,
    cutoffSec: null,
    stayMin: 0,
  })

  const totalDist = distanceKm || 1
  const hasProfile = profile && profile.length > 1

  const segments: RawSegment[] = []
  let prevKm = 0
  for (const p of points) {
    const segDist = p.distanceKm - prevKm
    if (segDist <= 0) {
      prevKm = p.distanceKm
      continue
    }
    let gain: number
    let loss: number
    if (hasProfile) {
      const r = elevationBetween(profile!, prevKm, p.distanceKm)
      gain = r.gain
      loss = r.loss
    } else {
      // 距離按分（周回/往復を想定し下降も同程度と仮定）
      gain = elevationGainM * (segDist / totalDist)
      loss = elevationGainM * (segDist / totalDist)
    }
    segments.push({
      name: p.name,
      fromKm: prevKm,
      toKm: p.distanceKm,
      distanceKm: segDist,
      gainM: gain,
      lossM: loss,
      progressMid: (prevKm + p.distanceKm) / 2 / totalDist,
      cutoffSec: p.cutoffSec,
      stayMin: p.stayMin,
      memo: p.memo,
    })
    prevKm = p.distanceKm
  }
  return segments
}

function classifyTerrain(seg: {
  distanceKm: number
  gainM: number
  lossM: number
}): "climb" | "flat" | "descent" {
  const gradeUp = (seg.gainM / (seg.distanceKm * 1000)) * 100
  const gradeDown = (seg.lossM / (seg.distanceKm * 1000)) * 100
  if (gradeUp - gradeDown > 2.5) return "climb"
  if (gradeDown - gradeUp > 2.5) return "descent"
  return "flat"
}

/* ---------- メイン計算 ---------- */

export function calculate(input: SimInput): SimResult {
  const raw = buildSegments(input)
  const { distanceKm, elevationGainM } = input
  const aptitudes = normalizeAptitudes(input.aptitudes)
  const fMult = flatMultiplier(aptitudes.flat)
  const cCost = climbSecPerM(aptitudes.climb)
  const dSave = descSaveSecPerM(aptitudes.descent)

  const effortKm = distanceKm + elevationGainM / 100

  // 各区間の係数を事前計算
  // segTime = fatigue * (dist*fMult*flatPace + gain*cCost - loss*dSave)
  const prepared = raw.map((seg) => {
    const f = fatigue(seg.progressMid)
    const flatCoef = f * seg.distanceKm * fMult // × flatPace
    const climbConst = f * (seg.gainM * cCost - seg.lossM * dSave)
    return { seg, flatCoef, climbConst }
  })

  const A = prepared.reduce((sum, p) => sum + p.flatCoef, 0)
  const B = prepared.reduce((sum, p) => sum + p.climbConst, 0)
  // エイド滞在の合計(秒)。累積タイムに加算される定数項
  const totalStaySec = raw.reduce((sum, s) => sum + (s.stayMin ?? 0) * 60, 0)

  let flatPace: number
  let advice: StrategyAdvice | null = null

  if (input.mode === "predict") {
    const speed = flatSpeedFromItra(input.itraIndex)
    flatPace = 3600 / speed
  } else {
    // 目標タイムから必要な平地ペースを逆算（滞在時間ぶんを差し引く）
    flatPace = A > 0 ? (input.targetSec - B - totalStaySec) / A : 0
  }

  let cumulative = 0
  const segments: SegmentResult[] = prepared.map(({ seg, flatCoef, climbConst }) => {
    // 実所要時間（負にならないよう下限を設定）
    const minTime = seg.distanceKm * flatPace * fMult * 0.35
    const durationSec = Math.max(flatCoef * flatPace + climbConst, minTime)
    cumulative += durationSec
    const arrivalSec = cumulative
    // 到着後にエイド滞在ぶんを進める（次区間はこの後から開始）
    cumulative += (seg.stayMin ?? 0) * 60
    const cutoffSec = seg.cutoffSec ?? null
    const marginSec = cutoffSec !== null ? cutoffSec - arrivalSec : null
    return {
      name: seg.name,
      fromKm: seg.fromKm,
      toKm: seg.toKm,
      distanceKm: seg.distanceKm,
      gainM: seg.gainM,
      lossM: seg.lossM,
      durationSec,
      cumulativeSec: arrivalSec,
      paceSecPerKm: seg.distanceKm > 0 ? durationSec / seg.distanceKm : 0,
      progress: 0,
      terrain: classifyTerrain(seg),
      cutoffSec,
      marginSec,
      stayMin: seg.stayMin ?? 0,
      memo: seg.memo,
    }
  })

  // フィニッシュ到着 = 最後の区間の到着時刻
  const totalSec =
    segments.length > 0 ? segments[segments.length - 1].cumulativeSec : cumulative
  segments.forEach((s) => {
    s.progress = totalSec > 0 ? s.cumulativeSec / totalSec : 0
  })

  if (input.mode === "reverse") {
    advice = buildAdvice({ ...input, aptitudes }, flatPace, fMult, cCost, dSave)
  }

  return {
    mode: input.mode,
    totalSec,
    gapSecPerKm: flatPace,
    effortKm,
    segments,
    advice,
  }
}

/* ---------- 逆算モードのアドバイス ---------- */

function buildAdvice(
  input: ReverseInput,
  flatPace: number,
  fMult: number,
  cCost: number,
  dSave: number,
): StrategyAdvice {
  // 実現可能性: 平地ペースが極端に速い/不可能な場合
  const feasible = flatPace > 40 // 40秒/km(=15km/h) を下回る要求は非現実的

  // コース平均勾配から、登り集中区間/下り集中区間の代表ペースを算出
  // （登り・下りはそれぞれ全体の約半分の距離に集中すると仮定）
  const avgUpMPerKm =
    input.distanceKm > 0 ? input.elevationGainM / input.distanceKm : 0
  const concentratedMPerKm = avgUpMPerKm * 2
  const midFatigue = 1.11
  const flatBase = flatPace * fMult
  const climbPace = feasible
    ? (flatBase + concentratedMPerKm * cCost) * midFatigue
    : null
  const descentPace = feasible
    ? Math.max(
        (flatBase - concentratedMPerKm * dSave) * midFatigue,
        flatBase * 0.4,
      )
    : null

  if (!feasible) {
    return {
      feasible: false,
      kind: "tooFast",
      climbPaceSecPerKm: climbPace,
      descentPaceSecPerKm: descentPace,
    }
  }

  const { climb, flat, descent } = input.aptitudes
  const max = Math.max(climb, flat, descent)
  const min = Math.min(climb, flat, descent)

  let kind: AdviceKind
  if (max - min <= 1) kind = "balanced"
  else if (climb === max) kind = "climb"
  else if (descent === max) kind = "descent"
  else kind = "flat"

  return {
    feasible: true,
    kind,
    climbPaceSecPerKm: climbPace,
    descentPaceSecPerKm: descentPace,
  }
}

/* ---------- フォーマッタ ---------- */

/** 秒を完走タイム用に整形。ja: "H時間MM分" / en: "Hh MMm" */
export function formatDuration(totalSec: number, lang: "ja" | "en" = "ja"): string {
  if (!Number.isFinite(totalSec)) return lang === "en" ? "0m" : "0分"
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const mm = m.toString().padStart(2, "0")
  if (lang === "en") {
    return h > 0 ? `${h}h ${mm}m` : `${m}m`
  }
  if (h > 0) {
    return `${h}時間${mm}分`
  }
  return `${m}分`
}

/** 秒を "HH:MM:SS" 形式に整形（通過タイム用） */
export function formatClock(totalSec: number): string {
  if (!Number.isFinite(totalSec)) return "00:00:00"
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":")
}

/** 分/km ペースを "M'SS\"" 形式に整形 */
export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return "--'--\""
  const sec = Math.round(secPerKm)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}'${s.toString().padStart(2, "0")}"`
}

/** "H:MM" または "HH:MM" 形式の文字列を秒に変換。空/不正は null */
export function parseHM(value: string): number | null {
  const t = value.trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2}):(\d{1,2})$/)
  if (!m) return null
  const h = Number.parseInt(m[1], 10)
  const min = Number.parseInt(m[2], 10)
  if (!Number.isFinite(h) || !Number.isFinite(min) || min > 59) return null
  return h * 3600 + min * 60
}

/** 秒を "H:MM" 形式に整形（関門時刻の表示・入力用） */
export function formatHM(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec)) return ""
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}:${m.toString().padStart(2, "0")}`
}

/** 関門猶予が少ないと判定する閾値(秒) */
export const CUTOFF_WARN_SEC = 10 * 60

/* ---------- Bプラン（レース中 緊急再計算） ---------- */

export interface BPlanInput {
  distanceKm: number
  elevationGainM: number
  aptitudes: Aptitudes
  waypoints: Waypoint[]
  profile?: ElevationPoint[]
  /** 現在地（スタートからの距離 km） */
  currentKm: number
  /** 現在の経過時間(秒) */
  elapsedSec: number
  /** 残り区間の出力係数 (0.1=10%出力 … 1.0=通常) */
  outputFactor: number
  /** 地形ごとの走法。walk はその地形の区間を歩く想定で遅らせる */
  gaits: TerrainGaits
}

export type TerrainGait = "walk" | "run"

export interface TerrainGaits {
  flat: TerrainGait
  climb: TerrainGait
  descent: TerrainGait
}

export interface BPlanSegment {
  name: string
  fromKm: number
  toKm: number
  distanceKm: number
  gainM: number
  lossM: number
  terrain: "climb" | "flat" | "descent"
  arrivalSec: number
  cutoffSec: number | null
  marginSec: number | null
  status: "ok" | "warn" | "missed"
}

export interface BPlanResult {
  /** これまでの実績から推定した平地換算ペース(秒/km) */
  observedPaceSecPerKm: number
  /** 残り区間に適用する平地換算ペース(秒/km) */
  projectedPaceSecPerKm: number
  projectedFinishSec: number
  segments: BPlanSegment[]
  worstMarginSec: number | null
  anyMissed: boolean
  anyWarn: boolean
}

interface BPlanRaw {
  name: string
  fromKm: number
  toKm: number
  distanceKm: number
  gainM: number
  lossM: number
  progressMid: number
  cutoffSec: number | null
  stayMin: number
}

/** Bプラン用: currentKm境界を挿入して区間を構築 */
function buildBPlanSegments(input: BPlanInput): BPlanRaw[] {
  const { distanceKm, elevationGainM, waypoints, profile, currentKm } = input

  const meta = new Map<number, { name: string; cutoffSec: number | null; stayMin: number }>()
  waypoints
    .filter((w) => w.distanceKm > 0 && w.distanceKm < distanceKm)
    .forEach((w) => {
      meta.set(w.distanceKm, {
        name: w.name.trim() || `${w.distanceKm}km`,
        cutoffSec: w.cutoffSec ?? null,
        stayMin: w.stayMin ?? 0,
      })
    })

  const boundarySet = new Set<number>()
  for (const km of meta.keys()) boundarySet.add(km)
  if (currentKm > 0 && currentKm < distanceKm) boundarySet.add(currentKm)
  boundarySet.add(distanceKm)

  const boundaries = Array.from(boundarySet).sort((a, b) => a - b)
  const totalDist = distanceKm || 1
  const hasProfile = profile && profile.length > 1

  const segs: BPlanRaw[] = []
  let prevKm = 0
  for (const km of boundaries) {
    const segDist = km - prevKm
    if (segDist <= 0) {
      prevKm = km
      continue
    }
    let gain: number
    let loss: number
    if (hasProfile) {
      const r = elevationBetween(profile!, prevKm, km)
      gain = r.gain
      loss = r.loss
    } else {
      gain = elevationGainM * (segDist / totalDist)
      loss = elevationGainM * (segDist / totalDist)
    }
    const m = meta.get(km)
    segs.push({
      name: m?.name ?? (km >= distanceKm ? "フィニッシュ" : `${km}km`),
      fromKm: prevKm,
      toKm: km,
      distanceKm: segDist,
      gainM: gain,
      lossM: loss,
      progressMid: (prevKm + km) / 2 / totalDist,
      cutoffSec: m?.cutoffSec ?? null,
      stayMin: m?.stayMin ?? 0,
    })
    prevKm = km
  }
  return segs
}

/**
 * レース中の緊急再計算。
 * 現在地までの実績から現在の平地換算ペースを逆算し、
 * 残り区間を指定の出力係数で走った場合の通過時刻・関門猶予を返す。
 */
export function recalcBPlan(input: BPlanInput): BPlanResult {
  const raw = buildBPlanSegments(input)
  const { currentKm, elapsedSec, outputFactor, gaits } = input
  const aptitudes = normalizeAptitudes(input.aptitudes)
  const fMult = flatMultiplier(aptitudes.flat)
  const cCost = climbSecPerM(aptitudes.climb)
  const dSave = descSaveSecPerM(aptitudes.descent)
  const walkFlat = gaits.flat === "walk"
  const walkClimb = gaits.climb === "walk"
  const walkDescent = gaits.descent === "walk"
  const walkMult = 1.5

  const done = raw.filter((s) => s.toKm <= currentKm + 1e-6)
  const remaining = raw.filter((s) => s.toKm > currentKm + 1e-6)

  // 実績から平地換算ペースを推定
  let aDone = 0
  let bDone = 0
  let stayDone = 0
  for (const s of done) {
    const f = fatigue(s.progressMid)
    aDone += f * s.distanceKm * fMult
    bDone += f * (s.gainM * cCost - s.lossM * dSave)
    stayDone += s.stayMin * 60
  }
  let observed = aDone > 0 ? (elapsedSec - stayDone - bDone) / aDone : 8 * 60
  if (!Number.isFinite(observed) || observed <= 0) observed = 8 * 60

  // 残り区間の適用ペース（出力が下がるほど遅くなる）。10%〜120%を許容
  const factor = Math.min(Math.max(outputFactor, 0.1), 1.2)
  const projected = observed / factor
  const dSaveRem = walkDescent ? 0 : dSave

  let cumulative = elapsedSec
  let worstMargin: number | null = null
  let anyMissed = false
  let anyWarn = false

  const segments: BPlanSegment[] = remaining.map((s) => {
    const f = fatigue(s.progressMid)
    const terrain = classifyTerrain(s)
    const walking =
      (terrain === "flat" && walkFlat) ||
      (terrain === "climb" && walkClimb) ||
      (terrain === "descent" && walkDescent)
    const minTime = s.distanceKm * projected * fMult * 0.35
    let duration = Math.max(
      f * (s.distanceKm * fMult * projected + s.gainM * cCost - s.lossM * dSaveRem),
      minTime,
    )
    if (walking) duration *= walkMult
    cumulative += duration
    const arrivalSec = cumulative
    cumulative += s.stayMin * 60
    const cutoffSec = s.cutoffSec
    const marginSec = cutoffSec !== null ? cutoffSec - arrivalSec : null
    let status: "ok" | "warn" | "missed" = "ok"
    if (marginSec !== null) {
      if (marginSec < 0) status = "missed"
      else if (marginSec < CUTOFF_WARN_SEC) status = "warn"
      if (worstMargin === null || marginSec < worstMargin) worstMargin = marginSec
      if (status === "missed") anyMissed = true
      if (status === "warn") anyWarn = true
    }
    return {
      name: s.name,
      fromKm: s.fromKm,
      toKm: s.toKm,
      distanceKm: s.distanceKm,
      gainM: s.gainM,
      lossM: s.lossM,
      terrain,
      arrivalSec,
      cutoffSec,
      marginSec,
      status,
    }
  })

  return {
    observedPaceSecPerKm: observed,
    projectedPaceSecPerKm: projected,
    projectedFinishSec: cumulative,
    segments,
    worstMarginSec: worstMargin,
    anyMissed,
    anyWarn,
  }
}
