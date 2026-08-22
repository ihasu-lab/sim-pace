export type Lang = "ja" | "en"

type Dict = Record<string, { ja: string; en: string }>

const DICT: Dict = {
  appTitle: {
    ja: "トレイルランニング レースペースシミュレーター",
    en: "Trail Running Race Pace Simulator",
  },
  appTagline: {
    ja: "トレイルランニング レースペースシミュレーター",
    en: "Trail Running Race Pace Simulator",
  },
  intro: {
    ja: "GPXコースまたは距離・獲得標高と適性を入力すると、想定完走タイムやポイント別の通過予想タイムを計算します。「目標タイムから逆算」モードでは、目標達成に必要なペースと戦略アドバイスを表示します。",
    en: "Enter a GPX course or distance, elevation gain and aptitudes to compute your estimated finish time and split schedule. The reverse mode shows the pace and strategy you need to hit a target time.",
  },
  tabPlan: { ja: "通常シミュレーション", en: "Simulation" },
  tabBPlan: { ja: "Bプラン（緊急再計算）", en: "Plan B (Recalc)" },
  inputArea: { ja: "入力エリア", en: "Input area" },
  resultArea: { ja: "結果エリア", en: "Result area" },
  emptyResult: {
    ja: "条件を入力して計算すると、ここに予想タイムと通過タイムが表示されます。",
    en: "Enter your conditions and calculate to see the predicted finish and splits here.",
  },
  footer: {
    ja: "SimPace — 表示されるタイムはあくまで目安です",
    en: "SimPace — all times shown are estimates only",
  },
  viewNormal: { ja: "通常シミュレーション", en: "Simulation" },
  viewBPlan: { ja: "Bプラン（緊急再計算）", en: "Plan B (Recalc)" },
  exportJson: { ja: "JSONで書き出し", en: "Export JSON" },
  importJson: { ja: "JSONを読み込み", en: "Import JSON" },
  saved: { ja: "自動保存済み", en: "Auto-saved" },

  // result
  estFinish: { ja: "想定完走タイム", en: "Estimated Finish" },
  targetFinish: { ja: "目標完走タイム", en: "Target Finish" },
  gap: { ja: "GAP（平地換算ペース）", en: "GAP (grade-adjusted pace)" },
  gapNeeded: { ja: "必要GAP（平地換算ペース）", en: "Required GAP" },
  effortDist: { ja: "負荷換算距離", en: "Effort distance" },
  scheduleTitle: { ja: "ポイント別 通過予想タイム", en: "Split Schedule" },
  scheduleTitleReverse: { ja: "ポイント別 目標通過タイム", en: "Target Split Schedule" },
  colPoint: { ja: "通過ポイント", en: "Point" },
  colGap: { ja: "区間GAP", en: "Split GAP" },
  colPass: { ja: "通過時刻", en: "Pass Time" },
  colCutoff: { ja: "関門", en: "Cutoff" },
  colMargin: { ja: "猶予", en: "Margin" },
  stay: { ja: "滞在", en: "Stay" },
  finish: { ja: "フィニッシュ", en: "Finish" },
  climb: { ja: "登り", en: "Climb" },
  flat: { ja: "フラット", en: "Flat" },
  descent: { ja: "下り", en: "Descent" },
  uphill: { ja: "上り", en: "Uphill" },
  downhill: { ja: "下り", en: "Downhill" },

  // form
  calcMode: { ja: "計算モード", en: "Calculation mode" },
  modePredict: { ja: "走力(ITRA)から予測", en: "Predict from ITRA" },
  modeReverse: { ja: "目標タイムから逆算", en: "Reverse from target" },
  itraHint: { ja: "ITRAのパフォーマンス指数", en: "ITRA performance index" },
  itraPlaceholder: { ja: "例: 500", en: "e.g. 500" },
  targetTime: { ja: "目標完走タイム", en: "Target finish time" },
  targetTimeHint: { ja: "達成したいゴールタイム", en: "The finish time you want to hit" },
  raceDistance: { ja: "レース距離", en: "Race distance" },
  elevationGain: { ja: "獲得標高", en: "Elevation gain" },
  calcPredict: { ja: "ペースを計算する", en: "Calculate pace" },
  calcReverse: { ja: "目標から逆算する", en: "Calculate from target" },
  errNumber: { ja: "正しい数値を入力してください", en: "Enter a valid number" },
  errTarget: { ja: "目標タイムを入力してください", en: "Enter a target time" },
  errDistance: { ja: "距離を入力してください", en: "Enter the distance" },
  errElevation: { ja: "標高を入力してください", en: "Enter the elevation gain" },

  // aptitude
  aptitudeTitle: { ja: "ランナーの適性", en: "Runner Suitability" },
  aptitudeHint: {
    ja: "1:苦手 〜 3:普通 〜 5:得意",
    en: "1: Weak — 3: Average — 5: Excellent",
  },
  aptitudeClimb: { ja: "登り適性", en: "Uphill" },
  aptitudeFlat: { ja: "フラット適性", en: "Flat" },
  aptitudeDescent: { ja: "下り適性", en: "Downhill" },
  aptLevel1: { ja: "苦手", en: "Weak" },
  aptLevel2: { ja: "やや苦手", en: "Fair" },
  aptLevel3: { ja: "普通", en: "Average" },
  aptLevel4: { ja: "やや得意", en: "Strong" },
  aptLevel5: { ja: "得意", en: "Excellent" },

  // waypoints
  waypointTitle: { ja: "通過ポイント / エイド", en: "Passing Points / Aid" },
  waypointHint: {
    ja: "距離・関門・滞在・メモを設定できます",
    en: "Set distance, cutoff, stay time and notes",
  },
  waypointEmpty: {
    ja: "ポイントがありません。「行を追加」で通過ポイントを設定してください。",
    en: "No points yet. Tap “Add row” to add a passing point.",
  },
  addRow: { ja: "行を追加", en: "Add row" },
  pointName: { ja: "ポイント名", en: "Point name" },
  pointNamePh: { ja: "例: 第1エイド", en: "e.g. Aid 1" },
  aidDefault: { ja: "エイド", en: "Aid" },
  wpDistance: { ja: "距離", en: "Distance" },
  wpCutoff: { ja: "関門", en: "Cutoff" },
  wpStay: { ja: "滞在", en: "Stay" },
  wpMemo: { ja: "メモ", en: "Notes" },
  wpMemoPh: { ja: "メモ（補給・装備など）", en: "Notes (fuel, kit, etc.)" },
  deletePoint: { ja: "削除", en: "Remove" },

  // gpx
  gpxUpload: { ja: "GPXファイルをアップロード", en: "Upload a GPX file" },
  gpxDrop: {
    ja: "ドラッグ＆ドロップ、またはクリックして選択",
    en: "Drag and drop, or click to choose",
  },
  gpxHint: {
    ja: "アップロードすると距離・獲得標高が自動入力され、区間ごとの標高も反映されます。",
    en: "Distance and elevation are filled in automatically, including the profile.",
  },
  gpxClear: { ja: "解除", en: "Clear" },
  gpxNeedFile: { ja: "GPXファイル（.gpx）を選択してください", en: "Please choose a .gpx file" },
  gpxFail: { ja: "読み込みに失敗しました", en: "Failed to load the file" },
  gpxParseErr: { ja: "GPXファイルの解析に失敗しました", en: "Could not parse the GPX file" },
  gpxNoPoints: { ja: "トラックポイントが見つかりませんでした", en: "No track points found" },
  exportFail: { ja: "画像の生成に失敗しました", en: "Failed to generate image" },

  // result extras
  exportAsImage: { ja: "画像で書き出し", en: "Export as image" },
  noteReverse: {
    ja: "※ 目標タイム達成に必要な各ポイントの通過時刻とGAP（平地換算ペース）です。",
    en: "* Required pass times and GAP (grade-adjusted pace) to hit your target.",
  },
  notePredict: {
    ja: "※ ITRA INDEXから平地速度を推定し、獲得標高・適性・後半の失速を加味した目安です。",
    en: "* Estimated from ITRA index with elevation, aptitude and late-race fatigue.",
  },
  adviceClimbGap: { ja: "登り区間の目安GAP", en: "Climb target GAP" },
  adviceDescentGap: { ja: "下り区間の目安GAP", en: "Descent target GAP" },
  adviceTooFastTitle: {
    ja: "目標タイムが速すぎる可能性があります",
    en: "Target time may be too ambitious",
  },
  adviceTooFastMsg: {
    ja: "この距離・獲得標高と適性では、設定した目標タイムの達成はかなり困難です。目標タイムを見直すか、適性・トレーニング計画を再検討しましょう。",
    en: "With this distance, elevation and suitability, the target looks very hard to hit. Revisit the time, or your training plan.",
  },
  adviceBalancedTitle: {
    ja: "バランス型 — 安定したイーブンペースで",
    en: "Balanced — Hold a steady even pace",
  },
  adviceBalancedMsg: {
    ja: "全体的にイーブンペースで安定した展開が理想です。特定区間で無理をせず、エイド滞在時間の短縮でタイムを稼ぎましょう。",
    en: "An even pace throughout is ideal. Don’t surge on any one section — shave time at aid stations instead.",
  },
  adviceClimbTitle: {
    ja: "登り強者 — 上りでアドバンテージを",
    en: "Climb Specialist — Make time on the ups",
  },
  adviceClimbMsg: {
    ja: "登りでアドバンテージを作れる適性です。上り区間でしっかりタイムを稼ぎ、下りは脚のダメージを抑える走法を心がけましょう。",
    en: "You can build an advantage on climbs. Push the ups, and run the downs in a way that spares your legs.",
  },
  adviceDescentTitle: {
    ja: "下り強者 — 後半のテクニカルで攻める",
    en: "Downhill Specialist — Attack technical sections later",
  },
  adviceDescentMsg: {
    ja: "下り区間でタイムを短縮できる強みがあります。前半の上りで脚を使い切らず、後半のテクニカルな下りで攻める戦略が有効です。",
    en: "You can take time back on descents. Don’t empty the tank on early climbs — attack the technical downs later.",
  },
  adviceFlatTitle: {
    ja: "フラット強者 — 走れる区間が勝負",
    en: "Flat Specialist — Win on the runnable sections",
  },
  adviceFlatMsg: {
    ja: "林道や走れるフラット区間でのスピードアップが目標達成の鍵です。走れる区間で確実にペース（GAP）を維持しましょう。",
    en: "Speed on forest roads and runnable flats is the key. Hold your GAP wherever the trail lets you run.",
  },

  // export
  exportWallpaper: { ja: "スマホ壁紙用出力", en: "Wallpaper" },
  exportCard: { ja: "ラミネートカード用出力", en: "Race Card" },
  elevationProfile: { ja: "標高プロファイル", en: "Elevation Profile" },
  aidInfo: { ja: "エイド情報", en: "Aid Stations" },
  raceSchedule: { ja: "レーススケジュール", en: "Race Schedule" },
  memo: { ja: "メモ", en: "Memo" },
  downloadPng: { ja: "PNGを保存", en: "Download PNG" },
  saveHint: { ja: "画像を長押しして保存", en: "Long press image to save" },
  openInTab: { ja: "新しいタブで開く", en: "Open in new tab" },
  close: { ja: "閉じる", en: "Close" },
  preview: { ja: "プレビュー", en: "Preview" },

  // bplan
  bplanTitle: { ja: "レース中 緊急再計算", en: "Mid-Race Recalculation" },
  bplanDesc: {
    ja: "現在地と経過時間、残りの出力を入力すると、関門に間に合うかを再計算します。",
    en: "Enter your current position, elapsed time and remaining effort to recheck cutoffs.",
  },
  currentPos: { ja: "現在地", en: "Current position" },
  currentPosAid: { ja: "エイドから選択", en: "Pick an aid" },
  elapsed: { ja: "現在の経過時間", en: "Elapsed time" },
  output: { ja: "残り区間の出力", en: "Remaining effort" },
  gaitSection: { ja: "残り区間の走法", en: "Remaining gait" },
  walk: { ja: "歩く", en: "Walk" },
  run: { ja: "走る", en: "Run" },
  recalc: { ja: "再計算する", en: "Recalculate" },
  projectedFinish: { ja: "予測フィニッシュ", en: "Projected finish" },
  observedPace: { ja: "現在の実効ペース", en: "Current effective pace" },
  cutoffOk: { ja: "関門はすべてクリア見込みです", en: "All cutoffs look clear" },
  cutoffWarnMsg: {
    ja: "関門猶予が少ない区間があります。ペースアップまたはエイド短縮を検討してください。",
    en: "Some cutoff margins are tight. Consider speeding up or shortening aid stops.",
  },
  cutoffMissedMsg: {
    ja: "現在の出力では関門に間に合わない区間があります。ペースの立て直しが必要です。",
    en: "At this effort some cutoffs will be missed. You need to pick up the pace.",
  },
  cutoffRisk: { ja: "関門アウトの危険", en: "Cutoff risk" },
  cutoffTight: { ja: "関門猶予が少ない", en: "Tight cutoffs" },
  cutoffClear: { ja: "関門クリア見込み", en: "Cutoffs clear" },
  bplanNeedCourse: {
    ja: "先に「通常シミュレーション」でコースの距離・獲得標高・関門を設定してください。",
    en: "Set the course distance, elevation and cutoffs in Simulation first.",
  },
  bplanPosErr: {
    ja: "現在地はコース距離の範囲内で入力してください",
    en: "Current position must be within the course",
  },
  bplanElapsedErr: { ja: "経過時間を入力してください", en: "Enter elapsed time" },
  bplanNote: {
    ja: "※ 現在地までの実績ペースから残り区間を指定出力で走った場合の予測です。関門猶予がマイナスの区間は関門アウトの見込みです。",
    en: "* Projection based on your pace so far and the chosen effort. Negative margins indicate a likely cutoff miss.",
  },
  hour: { ja: "時間", en: "h" },
  minute: { ja: "分", en: "m" },
  km: { ja: "km", en: "km" },
}

export function t(lang: Lang, key: keyof typeof DICT): string {
  const entry = DICT[key]
  if (!entry) return key
  return entry[lang]
}

/** 区間名を言語に応じて変換（"フィニッシュ" -> "Finish" 等） */
export function localizeName(lang: Lang, name: string): string {
  if (lang === "ja") return name
  if (name === "フィニッシュ") return "Finish"
  const nthAid = name.match(/^第(\d+)エイド$/)
  if (nthAid) return `Aid ${nthAid[1]}`
  const aidN = name.match(/^エイド(\d+)$/)
  if (aidN) return `Aid ${aidN[1]}`
  return name
}
