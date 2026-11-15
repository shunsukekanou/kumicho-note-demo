import { useRef, useState } from 'react'
import { draftsToItems, parseText, tidyOcr, type Draft } from './lib'
import { readImage } from './ocr'
import { ALL_CATS, CAT_LABEL, type Cat } from './types'
import { MonthSelect, ScreenHead, type Ctx } from './ui'

const SAMPLE_URL = 'samples/sample-paper.png'
// 取り込み先として選べる種類（輪番・引き継ぎチェックは、手で入れる）
const CHOICES: Cat[] = ALL_CATS.filter((c) => c !== 'rotation' && c !== 'handover')

export function Importer({ ctx }: { ctx: Ctx }) {
  const [asBase, setAsBase] = useState(ctx.leader)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [prog, setProg] = useState<{ p: number; label: string } | null>(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [drafts, setDrafts] = useState<Draft[] | null>(null)
  const [done, setDone] = useState<{ n: number; cats: Cat[] } | null>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function run(blob: Blob) {
    setErr('')
    setDone(null)
    setDrafts(null)
    setBusy(true)
    if (imgUrl) URL.revokeObjectURL(imgUrl)
    setImgUrl(URL.createObjectURL(blob))
    try {
      const raw = await readImage(blob, (p, label) => setProg({ p, label }))
      const t = tidyOcr(raw)
      setText(t)
      if (!t.trim()) setErr('文字が読み取れませんでした。明るい所で、紙をまっすぐ撮り直すか、下の欄に文字を入力してください。')
    } catch {
      setErr('読み取りに失敗しました。下の欄に、紙を見ながら文字を入力して進めることもできます。')
    } finally {
      setBusy(false)
      setProg(null)
    }
  }

  async function runSample() {
    try {
      const r = await fetch(SAMPLE_URL)
      await run(await r.blob())
    } catch {
      setErr('見本の紙資料を開けませんでした。')
    }
  }

  const upd = (key: string, v: Partial<Draft>) => setDrafts((ds) => ds && ds.map((d) => (d.key === key ? { ...d, ...v } : d)))
  const onCount = drafts?.filter((d) => d.on && d.title.trim()).length ?? 0

  function commit() {
    if (!drafts) return
    const items = draftsToItems(drafts, asBase ? 'base' : 'mine')
    if (!items.length) return
    ctx.update((p) => ({ ...p, items: [...p.items, ...items], sample: p.sample }))
    setDone({ n: items.length, cats: Array.from(new Set(items.map((i) => i.cat))) })
    setDrafts(null)
    setText('')
  }

  return (
    <div>
      <ScreenHead title="紙の資料を取り込む" sub="自治会から渡された紙を撮影・スキャンして、文字を読み取り、項目に分けます。" ctx={ctx} />

      <div className="card note">
        🔒 写真は、この端末の中だけで読み取ります。外のサーバーには送りません（写真そのものも保存しません）。
      </div>

      <h3 className="sec">① 取り込み先</h3>
      <div className="seg">
        <label className={`segopt ${asBase ? 'on' : ''}`}>
          <input type="radio" name="dest" checked={asBase} onChange={() => setAsBase(true)} />
          <span>
            <b>共通ベース</b>
            <small>代表の組長が取り込む。ほかの組へ配れます</small>
          </span>
        </label>
        <label className={`segopt ${!asBase ? 'on' : ''}`}>
          <input type="radio" name="dest" checked={!asBase} onChange={() => setAsBase(false)} />
          <span>
            <b>自分の組の分</b>
            <small>自分の組だけの決まり・備品</small>
          </span>
        </label>
      </div>

      <h3 className="sec">② 紙を読み取る</h3>
      <div className="row wrap">
        <button className="btn primary" disabled={busy} onClick={() => camRef.current?.click()}>
          📷 カメラで撮る
        </button>
        <button className="btn outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          🖼 画像ファイル（スキャン）を選ぶ
        </button>
        <button className="btn sample" disabled={busy} onClick={runSample} id="btn-sample-ocr">
          ✨ 見本の紙資料で、読み取りを試す
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />

      {busy && (
        <div className="card" role="status">
          <b>{prog?.label ?? '準備中'}</b>
          <div className="bar">
            <i style={{ width: `${Math.round((prog?.p ?? 0) * 100)}%` }} />
          </div>
        </div>
      )}
      {err && <p className="err">{err}</p>}

      {imgUrl && (
        <figure className="paper-img">
          <img src={imgUrl} alt="読み取る紙の資料" />
        </figure>
      )}

      <h3 className="sec">③ 読み取った文字（まちがいは直せます）</h3>
      <textarea
        id="ocr-text"
        className="ocr-text"
        rows={9}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'ここに、読み取った文字が出ます。\n文字を直したり、直接入力・貼り付けもできます。\n\n【年間の予定】\n4月　年度はじめ\n【組のきまり】\n・回覧は1番宅から\n【備品】\n回覧板　2冊　組長宅の玄関棚'}
      />
      <p className="muted">【年間の予定】【組のきまり】【備品】のような見出しの行があると、自動で正しい種類に分けられます。</p>
      <button className="btn primary" disabled={!text.trim() || busy} onClick={() => { setDrafts(parseText(text)); setDone(null) }}>
        項目に分ける
      </button>

      {drafts && (
        <>
          <h3 className="sec">④ 内容を確かめて、取り込む（{drafts.length}件）</h3>
          {drafts.length === 0 && <p className="muted">項目にできる行がありませんでした。</p>}
          <div className="drafts">
            {drafts.map((d) => (
              <div key={d.key} className={`draft ${d.on ? '' : 'off'}`}>
                <label className="check">
                  <input type="checkbox" checked={d.on} onChange={(e) => upd(d.key, { on: e.target.checked })} />
                  取り込む
                </label>
                <div className="grid2">
                  <select value={d.cat} onChange={(e) => upd(d.key, { cat: e.target.value as Cat })} aria-label="種類">
                    {CHOICES.map((c) => (
                      <option key={c} value={c}>
                        {CAT_LABEL[c]}
                      </option>
                    ))}
                  </select>
                  {(d.cat === 'schedule' || d.cat === 'duty') && <MonthSelect value={d.month ?? 4} onChange={(m) => upd(d.key, { month: m })} />}
                </div>
                <input value={d.title} onChange={(e) => upd(d.key, { title: e.target.value })} aria-label="見出し" />
                {d.cat === 'equip' ? (
                  <div className="grid2">
                    <input value={d.place ?? ''} onChange={(e) => upd(d.key, { place: e.target.value })} placeholder="保管場所" aria-label="保管場所" />
                    <input inputMode="numeric" value={String(d.count ?? 1)} onChange={(e) => upd(d.key, { count: Number(e.target.value.replace(/\D/g, '')) || 0 })} aria-label="個数" />
                  </div>
                ) : (
                  <textarea rows={2} value={d.body} onChange={(e) => upd(d.key, { body: e.target.value })} aria-label="内容" />
                )}
              </div>
            ))}
          </div>
          <button className="btn primary big" disabled={!onCount} onClick={commit} id="btn-commit">
            選んだ {onCount} 件を、{asBase ? '共通ベース' : '自分の組'}に取り込む
          </button>
        </>
      )}

      {done && (
        <div className="card ok" role="status">
          <b>{done.n}件を取り込みました。</b>
          <p className="muted">取り込んだ内容は、メニューの各画面で見られます。</p>
          <div className="row wrap">
            {done.cats.includes('schedule') && <button className="btn mini" onClick={() => ctx.go('overview')}>自治会の概要へ</button>}
            {done.cats.some((c) => c === 'myrule' || c === 'equip') && <button className="btn mini" onClick={() => ctx.go('mine')}>自分の組のルール・備品へ</button>}
            {done.cats.includes('duty') && <button className="btn mini" onClick={() => ctx.go('duty')}>組長のお仕事へ</button>}
          </div>
        </div>
      )}
    </div>
  )
}
