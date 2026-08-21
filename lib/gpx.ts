import type { ElevationPoint } from "./simpace"

export interface GpxData {
  name: string
  distanceKm: number
  elevationGainM: number
  profile: ElevationPoint[]
}

const R = 6371000 // 地球半径 (m)

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * GPX文字列を解析し、総距離・獲得標高・標高プロファイルを返す。
 * ブラウザの DOMParser を使用するためクライアント側でのみ呼び出すこと。
 */
export function parseGpx(xml: string): GpxData {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.querySelector("parsererror")) {
    throw new Error("PARSE")
  }

  const nameNode = doc.querySelector("trk > name, metadata > name, name")
  const name = nameNode?.textContent?.trim() || "GPX"

  const pts = Array.from(doc.getElementsByTagName("trkpt"))
  const source = pts.length > 0 ? pts : Array.from(doc.getElementsByTagName("rtept"))
  if (source.length < 2) {
    throw new Error("NO_POINTS")
  }

  let cumDist = 0
  let gain = 0
  let prevLat: number | null = null
  let prevLon: number | null = null
  let prevEle: number | null = null
  let smoothEle: number | null = null

  const profile: ElevationPoint[] = []

  for (const pt of source) {
    const lat = Number.parseFloat(pt.getAttribute("lat") || "")
    const lon = Number.parseFloat(pt.getAttribute("lon") || "")
    const eleNode = pt.getElementsByTagName("ele")[0]
    const ele = eleNode ? Number.parseFloat(eleNode.textContent || "0") : 0
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

    if (prevLat !== null && prevLon !== null) {
      cumDist += haversine(prevLat, prevLon, lat, lon)
    }

    // 標高ノイズ除去のため簡易スムージング
    if (smoothEle === null) {
      smoothEle = ele
    } else {
      smoothEle = smoothEle * 0.7 + ele * 0.3
    }
    if (prevEle !== null && smoothEle > prevEle) {
      gain += smoothEle - prevEle
    }
    prevEle = smoothEle

    profile.push({ distKm: cumDist / 1000, eleM: smoothEle })
    prevLat = lat
    prevLon = lon
  }

  return {
    name,
    distanceKm: Math.round((cumDist / 1000) * 10) / 10,
    elevationGainM: Math.round(gain),
    profile,
  }
}
