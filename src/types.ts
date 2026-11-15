// 組長ノートのデータの形
export type Cat =
  | 'schedule' // 自治会の年間スケジュール
  | 'rule' // 自治会の規約
  | 'contact' // 連絡体制
  | 'duty' // 組長のお仕事（月別）
  | 'join' // 入会関連
  | 'leave' // 退会関連
  | 'handover' // 退会・交代時の引き継ぎチェック
  | 'myrule' // 自分の組のルール
  | 'equip' // 自分の組の備品
  | 'rotation' // 組長の輪番表

export type Source = 'base' | 'mine' // base＝代表組長が取り込んだ共通ベース／mine＝自分の組で足した分

export type Item = {
  id: string
  cat: Cat
  source: Source
  title: string
  body: string
  month?: number // 1〜12（schedule・duty）
  place?: string // 備品の保管場所
  count?: number // 備品の個数
  year?: number // 輪番：担当する年度（西暦）
  revised?: boolean // 規約：今回の改定で変わった点
}

export type Info = {
  jichikai: string // 自治会の名前
  kumi: string // 組の名前
  houses: number // 組の軒数（輪番の数）
  year: string // 年度の表記（例：令和8年度）
}

export type Pkg = {
  info: Info
  items: Item[]
  sample: boolean // true の間は「見本データ（架空）」の表示を出す
}

export const CAT_LABEL: Record<Cat, string> = {
  schedule: '年間スケジュール',
  rule: '規約',
  contact: '連絡体制',
  duty: '組長のお仕事（月別）',
  join: '入会関連',
  leave: '退会関連',
  handover: '引き継ぎチェック',
  myrule: '自分の組のルール',
  equip: '自分の組の備品',
  rotation: '組長の輪番',
}

export const ALL_CATS = Object.keys(CAT_LABEL) as Cat[]

// 年度は4月はじまり。表示は4月→3月の順
export const FISCAL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
