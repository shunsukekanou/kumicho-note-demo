// 保存・引き継ぎ文字列・紙の文字の仕分け。外部への通信は一切しない
import { makeSampleItems, sampleInfo } from './data'
import { ALL_CATS, type Cat, type Info, type Item, type Pkg, type Source } from './types'

const KEY = 'kumicho-note-v1'
const PKEY = 'kumicho-note-progress-v1'
const MKEY = 'kumicho-note-leader-v1'

export function newId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)
}

export function samplePkg(): Pkg {
  return { info: { ...sampleInfo }, items: makeSampleItems(), sample: true }
}

export function emptyPkg(): Pkg {
  return { info: { jichikai: '', kumi: '', houses: 11, year: fiscalLabel() }, items: [], sample: false }
}

// 今日の年度表記（4月はじまり）。例：2026年11月 → 令和8年度
export function fiscalYear(d = new Date()): number {
  return d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1
}
export function fiscalLabel(d = new Date()): string {
  const y = fiscalYear(d) - 2018 // 令和元年＝2019
  return `令和${y === 1 ? '元' : y}年度`
}

// ── 保存（この端末のブラウザの中だけ）
function s(v: unknown, max = 2000): string {
  return typeof v === 'string' ? v.slice(0, max) : ''
}
function n(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

export function cleanItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return []
  const out: Item[] = []
  for (const r of raw.slice(0, 600)) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const cat = o.cat as Cat
    if (!ALL_CATS.includes(cat)) continue
    const title = s(o.title, 200)
    if (!title) continue
    const m = n(o.month)
    out.push({
      id: s(o.id, 40) || newId(),
      cat,
      source: o.source === 'mine' ? 'mine' : 'base',
      title,
      body: s(o.body, 3000),
      ...(m && m >= 1 && m <= 12 ? { month: Math.round(m) } : {}),
      ...(typeof o.place === 'string' ? { place: s(o.place, 200) } : {}),
      ...(n(o.count) !== undefined ? { count: Math.max(0, Math.round(n(o.count)!)) } : {}),
      ...(n(o.year) !== undefined ? { year: Math.round(n(o.year)!) } : {}),
      ...(o.revised === true ? { revised: true } : {}),
    })
  }
  return out
}

export function cleanInfo(raw: unknown, fallback: Info): Info {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const h = n(o.houses)
  return {
    jichikai: typeof o.jichikai === 'string' ? s(o.jichikai, 60) : fallback.jichikai,
    kumi: typeof o.kumi === 'string' ? s(o.kumi, 40) : fallback.kumi,
    houses: h && h >= 1 && h <= 99 ? Math.round(h) : fallback.houses,
    year: typeof o.year === 'string' ? s(o.year, 20) : fallback.year,
  }
}

export function loadPkg(): Pkg {
  try {
    const t = localStorage.getItem(KEY)
    if (t) {
      const o = JSON.parse(t)
      const info = cleanInfo(o.info, sampleInfo)
      return { info, items: cleanItems(o.items), sample: o.sample === true }
    }
  } catch {
    /* 読めなければ見本から始める */
  }
  return samplePkg()
}
export function savePkg(p: Pkg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* 容量いっぱい・保存禁止のときは、画面だけで続ける */
  }
}

export function loadProgress(): Record<string, boolean> {
  try {
    const o = JSON.parse(localStorage.getItem(PKEY) || '{}')
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}
export function saveProgress(p: Record<string, boolean>) {
  try {
    localStorage.setItem(PKEY, JSON.stringify(p))
  } catch {
    /* 同上 */
  }
}
export function loadLeader(): boolean {
  try {
    return localStorage.getItem(MKEY) === '1'
  } catch {
    return false
  }
}
export function saveLeader(v: boolean) {
  try {
    localStorage.setItem(MKEY, v ? '1' : '0')
  } catch {
    /* 同上 */
  }
}
export function clearAllStorage() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(PKEY)
    localStorage.removeItem(MKEY)
  } catch {
    /* 同上 */
  }
}

// ── 引き継ぎ（データ文字列）
export type Scope = 'all' | 'base'
export type Payload = { app: 'kumicho-note'; v: 1; kind: Scope; info: Info; items: Item[]; at: string }

export function makePayload(pkg: Pkg, scope: Scope): Payload {
  const items = scope === 'base' ? pkg.items.filter((i) => i.source === 'base') : pkg.items
  return {
    app: 'kumicho-note',
    v: 1,
    kind: scope,
    info: scope === 'base' ? { ...pkg.info, kumi: '' } : pkg.info,
    items,
    at: new Date().toISOString().slice(0, 10),
  }
}

function b64encode(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
function b64decode(t: string): Uint8Array {
  const bin = atob(t)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const buf = new Uint8Array(bytes) // 型の都合で、新しい配列に写す
  const out = new Response(new Blob([buf]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}
function fnv(t: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

const PART_SIZE = 3000 // LINE の1通（5000字まで）に収まる大きさ
export async function encodeParts(payload: Payload): Promise<string[]> {
  const raw = new TextEncoder().encode(JSON.stringify(payload))
  let body: string
  if (typeof CompressionStream !== 'undefined') body = 'KN1:' + b64encode(await pipe(raw, new CompressionStream('deflate-raw')))
  else body = 'KN0:' + b64encode(raw)
  const hash = fnv(body)
  const total = Math.ceil(body.length / PART_SIZE)
  const parts: string[] = []
  const label = [payload.info.jichikai, payload.info.kumi].filter(Boolean).join(' ')
  for (let i = 0; i < total; i++) {
    const chunk = body.slice(i * PART_SIZE, (i + 1) * PART_SIZE)
    parts.push(
      `【組長ノート 引き継ぎデータ ${i + 1}/${total}】${label ? '（' + label + '）' : ''}\n` +
        `この全体をコピーして、組長ノートの「引き継ぎを取り込む」に貼り付けてください。` +
        (total > 1 ? `（${total}通すべてを貼ります）` : '') +
        `\nKN[${i + 1}/${total}|${hash}]${chunk}`,
    )
  }
  return parts
}

export type Decoded = { ok: true; payload: Payload } | { ok: false; error: string }

export async function decodeText(text: string): Promise<Decoded> {
  const re = /KN\[(\d+)\/(\d+)\|([0-9a-f]{8})\]([A-Za-z0-9+/=:]+)/g
  const found = new Map<number, string>()
  let total = 0
  let hash = ''
  let mixed = false
  for (const m of text.matchAll(re)) {
    const i = Number(m[1])
    const t = Number(m[2])
    if (!total) {
      total = t
      hash = m[3]
    } else if (t !== total || m[3] !== hash) mixed = true
    found.set(i, m[4])
  }
  if (!found.size) return { ok: false, error: '引き継ぎデータが見つかりません。送られてきたメッセージを、まるごとコピーして貼ってください。' }
  if (mixed) return { ok: false, error: '別々の引き継ぎデータが混ざっています。1回分だけを貼ってください。' }
  const missing: number[] = []
  for (let i = 1; i <= total; i++) if (!found.has(i)) missing.push(i)
  if (missing.length) return { ok: false, error: `${total}通のうち、${missing.join('・')}通目が足りません。すべて貼ってください。` }
  const body = Array.from({ length: total }, (_, k) => found.get(k + 1)!).join('')
  if (fnv(body) !== hash) return { ok: false, error: 'データが途中で欠けているようです。もう一度、まるごとコピーして貼ってください。' }
  try {
    let bytes: Uint8Array
    if (body.startsWith('KN1:')) {
      if (typeof DecompressionStream === 'undefined') return { ok: false, error: 'このブラウザでは読めない形式です。新しいブラウザで開いてください。' }
      bytes = await pipe(b64decode(body.slice(4)), new DecompressionStream('deflate-raw'))
    } else if (body.startsWith('KN0:')) bytes = b64decode(body.slice(4))
    else return { ok: false, error: '組長ノートのデータではありません。' }
    return fromObject(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return { ok: false, error: 'データを読み取れませんでした。もう一度、まるごとコピーして貼ってください。' }
  }
}

// JSONファイル・データ文字列どちらの中身も、ここで点検してから使う
export function fromObject(o: unknown): Decoded {
  if (!o || typeof o !== 'object') return { ok: false, error: '組長ノートのデータではありません。' }
  const r = o as Record<string, unknown>
  if (r.app !== 'kumicho-note') return { ok: false, error: '組長ノートのデータではありません。' }
  const items = cleanItems(r.items)
  if (!items.length) return { ok: false, error: '取り込める項目がありません。' }
  return {
    ok: true,
    payload: {
      app: 'kumicho-note',
      v: 1,
      kind: r.kind === 'base' ? 'base' : 'all',
      info: cleanInfo(r.info, sampleInfo),
      items,
      at: typeof r.at === 'string' ? r.at.slice(0, 10) : '',
    },
  }
}

// 取り込み：共通ベースだけのデータは「共通ベースを入れ替え・自分の組の分は残す」。全部のデータは丸ごと入れ替え
export function applyPayload(cur: Pkg, p: Payload): Pkg {
  const fresh = p.items.map((i) => ({ ...i, id: newId() }))
  if (p.kind === 'base' && !cur.sample) {
    return {
      info: { ...p.info, kumi: cur.info.kumi || '' },
      items: [...fresh, ...cur.items.filter((i) => i.source === 'mine')],
      sample: false,
    }
  }
  return { info: p.info, items: fresh, sample: false }
}

export function downloadJson(pkg: Pkg) {
  const blob = new Blob([JSON.stringify(makePayload(pkg, 'all'), null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `組長ノート_バックアップ_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = t
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

// ── 紙の資料から読み取った文字を、項目に仕分ける
export type Draft = {
  key: string
  on: boolean
  cat: Cat
  title: string
  body: string
  month?: number
  place?: string
  count?: number
}

const toHalf = (t: string) =>
  t
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[：]/g, ':')

// 日本語の文字のあいだに入った余分な空白を取り除く（OCRの癖）
export function tidyOcr(t: string): string {
  return t
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/[ \t　]+/g, ' ')
        .replace(/(?<=[^\x00-\x7F]) +| +(?=[^\x00-\x7F])/g, '')
        .replace(/^[_\s]+/, '')
        .trim(),
    )
    .join('\n')
}

function sectionCat(h: string): Cat | null {
  if (/備品|道具|用具/.test(h)) return 'equip'
  if (/予定|スケジュール|行事/.test(h)) return 'schedule'
  if (/組のきまり|組のルール|組の決まり|組の約束/.test(h)) return 'myrule'
  if (/規約|会則/.test(h)) return 'rule'
  if (/連絡/.test(h)) return 'contact'
  if (/仕事|しごと|お役目/.test(h)) return 'duty'
  if (/入会/.test(h)) return 'join'
  if (/退会/.test(h)) return 'leave'
  return null
}

export function parseText(text: string): Draft[] {
  const out: Draft[] = []
  let cur: Cat | null = null
  let k = 0
  for (const raw of toHalf(text).split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const head = line.match(/^[【\[［]\s*([^】\]］]+?)\s*[】\]］]\s*$/) || line.match(/^[■◆▼◇]\s*(.{1,14})$/)
    if (head && sectionCat(head[1])) {
      cur = sectionCat(head[1])
      continue
    }
    const bare = line.replace(/^(?:[・･\-\*•●○◯■□▶▷]|\d+[.)）])+\s*/, '')
    if (!bare || bare.length < 2) continue
    const mon = bare.match(/^(\d{1,2})\s*月[\s_:、,・]*(.+)$/)
    const eq = bare.match(/^(.+?)\s*[:、,]?\s*(\d{1,3})\s*(冊|個|本|台|枚|セット|組|張|基|着)\s*[:、,]?\s*(.*)$/)
    let d: Draft
    if (mon && +mon[1] >= 1 && +mon[1] <= 12 && (cur === 'schedule' || cur === 'duty' || cur === null || cur === 'rule')) {
      const c: Cat = cur === 'duty' ? 'duty' : 'schedule'
      d = { key: `d${++k}`, on: true, cat: c, title: mon[2].trim(), body: '', month: +mon[1] }
    } else if (cur === 'equip' || (cur === null && eq)) {
      if (eq) d = { key: `d${++k}`, on: true, cat: 'equip', title: eq[1].replace(/^備品\s*/, '').trim() || bare, body: '', place: eq[4].trim(), count: +eq[2] }
      else d = { key: `d${++k}`, on: true, cat: 'equip', title: bare, body: '', place: '', count: 1 }
    } else {
      const c: Cat = cur ?? 'myrule'
      const sp = bare.match(/^(.{2,24}?)[:：]\s*(.+)$/)
      if (sp) d = { key: `d${++k}`, on: true, cat: c, title: sp[1].trim(), body: sp[2].trim(), ...(c === 'schedule' || c === 'duty' ? { month: 4 } : {}) }
      else d = { key: `d${++k}`, on: true, cat: c, title: bare.length > 28 ? bare.slice(0, 28) + '…' : bare, body: bare.length > 28 ? bare : '', ...(c === 'schedule' || c === 'duty' ? { month: 4 } : {}) }
    }
    if (cur === null && d.cat === 'myrule') d.on = false // 見出しの前にある表題などは、初期はオフ
    out.push(d)
  }
  return out
}

export function draftsToItems(drafts: Draft[], source: Source): Item[] {
  return drafts
    .filter((d) => d.on && d.title.trim())
    .map((d) => ({
      id: newId(),
      cat: d.cat,
      source,
      title: d.title.trim().slice(0, 200),
      body: d.body.trim().slice(0, 3000),
      ...(d.cat === 'schedule' || d.cat === 'duty' ? { month: d.month ?? 4 } : {}),
      ...(d.cat === 'equip' ? { place: (d.place ?? '').trim(), count: d.count ?? 1 } : {}),
    }))
}

export function byFiscal(a: Item, b: Item): number {
  const fa = (a.month ?? 4) >= 4 ? (a.month ?? 4) - 4 : (a.month ?? 4) + 8
  const fb = (b.month ?? 4) >= 4 ? (b.month ?? 4) - 4 : (b.month ?? 4) + 8
  return fa - fb
}

export function srcOf(source: Source): string {
  return source === 'base' ? '共通ベース' : '自分の組'
}
