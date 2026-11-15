import { useState, type ReactNode } from 'react'
import { newId } from './lib'
import type { Cat, Item, Pkg, Source } from './types'

export type Screen = 'home' | 'overview' | 'duty' | 'join' | 'leave' | 'mine' | 'import' | 'handover'
export type DocKey = 'booklet' | 'flyer' | 'joinform' | 'leaveform'

export type Ctx = {
  pkg: Pkg
  update: (fn: (p: Pkg) => Pkg) => void
  progress: Record<string, boolean>
  toggle: (key: string) => void
  resetProgress: () => void
  leader: boolean
  setLeader: (v: boolean) => void
  go: (s: Screen) => void
  print: (d: DocKey) => void
}

type FieldSpec = { month?: boolean; place?: boolean; count?: boolean; year?: boolean; revised?: boolean; title: string; body: string; rows?: number }
const F: Record<Cat, FieldSpec> = {
  schedule: { month: true, title: '行事の名前', body: 'くわしい内容' },
  rule: { revised: true, title: '見出し', body: '内容' },
  contact: { title: 'だれ・どこ（役割）', body: '連絡先・ひとこと' },
  duty: { month: true, title: 'その月のテーマ', body: 'やること（1行に1つ）', rows: 6 },
  join: { title: '見出し', body: '内容（手順は1行に1つ）', rows: 5 },
  leave: { title: '見出し', body: '内容（手順は1行に1つ）', rows: 5 },
  handover: { title: 'チェックする項目', body: 'メモ（なくてもよい）' },
  myrule: { title: 'ルールの名前', body: '内容' },
  equip: { place: true, count: true, title: '備品の名前', body: 'メモ（なくてもよい）' },
  rotation: { year: true, title: 'どこの家（例：5番宅）', body: 'メモ（なくてもよい）' },
}

export function MonthSelect({ value, onChange, id }: { value: number; onChange: (m: number) => void; id?: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m) => (
        <option key={m} value={m}>
          {m}月
        </option>
      ))}
    </select>
  )
}

function ItemForm({ cat, init, onSave, onCancel }: { cat: Cat; init?: Item; onSave: (v: Partial<Item>) => void; onCancel: () => void }) {
  const f = F[cat]
  const [title, setTitle] = useState(init?.title ?? '')
  const [body, setBody] = useState(init?.body ?? '')
  const [month, setMonth] = useState(init?.month ?? 4)
  const [place, setPlace] = useState(init?.place ?? '')
  const [count, setCount] = useState(String(init?.count ?? 1))
  const [year, setYear] = useState(String(init?.year ?? new Date().getFullYear()))
  const [revised, setRevised] = useState(init?.revised ?? false)
  const ok = title.trim().length > 0
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ok) return
        onSave({
          title: title.trim(),
          body: body.trim(),
          ...(f.month ? { month } : {}),
          ...(f.place ? { place: place.trim() } : {}),
          ...(f.count ? { count: Math.max(0, Math.round(Number(count) || 0)) } : {}),
          ...(f.year ? { year: Math.round(Number(year) || new Date().getFullYear()) } : {}),
          ...(f.revised ? { revised } : {}),
        })
      }}
    >
      {f.month && (
        <label>
          月<MonthSelect value={month} onChange={setMonth} />
        </label>
      )}
      <label>
        {f.title}
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
      </label>
      {f.place && (
        <label>
          保管場所
          <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={200} />
        </label>
      )}
      {f.count && (
        <label>
          個数
          <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} maxLength={4} />
        </label>
      )}
      {f.year && (
        <label>
          担当する年度（西暦。4月はじまり）
          <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} maxLength={4} />
        </label>
      )}
      <label>
        {f.body}
        <textarea rows={f.rows ?? 3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} />
      </label>
      {f.revised && (
        <label className="check">
          <input type="checkbox" checked={revised} onChange={(e) => setRevised(e.target.checked)} />
          今回の改定で変わった点
        </label>
      )}
      <div className="row">
        <button type="submit" className="btn primary" disabled={!ok}>
          保存する
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          やめる
        </button>
      </div>
    </form>
  )
}

export function SourceBadge({ source }: { source: Source }) {
  return <span className={`badge ${source}`}>{source === 'base' ? '共通ベース' : '自分の組'}</span>
}

// 項目の一覧。「編集する」のときだけ、直す・消す・追加が出る
export function EditableList({
  cat,
  items,
  edit,
  ctx,
  render,
  addLabel,
  empty,
  noAdd,
}: {
  cat: Cat
  items: Item[]
  edit: boolean
  ctx: Ctx
  render: (it: Item) => ReactNode
  addLabel: string
  empty?: string
  noAdd?: boolean
}) {
  const [editing, setEditing] = useState<string | null>(null) // item.id か 'new'
  const [delId, setDelId] = useState<string | null>(null)
  const save = (id: string | null, v: Partial<Item>) => {
    ctx.update((p) => {
      if (id && id !== 'new') return { ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...v } : i)) }
      const src: Source = ctx.leader ? 'base' : 'mine'
      const it: Item = { id: newId(), cat, source: src, title: '', body: '', ...v } as Item
      return { ...p, items: [...p.items, it] }
    })
    setEditing(null)
  }
  return (
    <div className="list">
      {items.length === 0 && !edit && <p className="muted">{empty ?? 'まだ登録がありません。'}</p>}
      {items.map((it) =>
        editing === it.id ? (
          <ItemForm key={it.id} cat={cat} init={it} onSave={(v) => save(it.id, v)} onCancel={() => setEditing(null)} />
        ) : (
          <div key={it.id} className="entry">
            {render(it)}
            {edit && (
              <div className="row small">
                <button className="btn mini" onClick={() => setEditing(it.id)}>
                  直す
                </button>
                {delId === it.id ? (
                  <>
                    <span className="muted">本当に消しますか？</span>
                    <button
                      className="btn mini danger"
                      onClick={() => {
                        ctx.update((p) => ({ ...p, items: p.items.filter((x) => x.id !== it.id) }))
                        setDelId(null)
                      }}
                    >
                      消す
                    </button>
                    <button className="btn mini" onClick={() => setDelId(null)}>
                      やめる
                    </button>
                  </>
                ) : (
                  <button className="btn mini danger-soft" onClick={() => setDelId(it.id)}>
                    消す
                  </button>
                )}
              </div>
            )}
          </div>
        ),
      )}
      {edit &&
        !noAdd &&
        (editing === 'new' ? (
          <ItemForm cat={cat} onSave={(v) => save('new', v)} onCancel={() => setEditing(null)} />
        ) : (
          <button className="btn add" onClick={() => setEditing('new')}>
            ＋ {addLabel}
          </button>
        ))}
    </div>
  )
}

export function ScreenHead({ title, sub, ctx, children }: { title: string; sub?: string; ctx: Ctx; children?: ReactNode }) {
  return (
    <div className="screen-head">
      <button className="btn back" onClick={() => ctx.go('home')}>
        ← メニューにもどる
      </button>
      <h2>{title}</h2>
      {sub && <p className="muted">{sub}</p>}
      {children}
    </div>
  )
}

export function EditToggle({ edit, setEdit }: { edit: boolean; setEdit: (v: boolean) => void }) {
  return (
    <button className={`btn ${edit ? 'primary' : 'outline'} edit-toggle`} onClick={() => setEdit(!edit)}>
      {edit ? '編集をおわる' : '✎ 編集する（追加・直す・消す）'}
    </button>
  )
}

export function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((l, i) => (
        <p key={i} className="line">
          {l}
        </p>
      ))}
    </>
  )
}
