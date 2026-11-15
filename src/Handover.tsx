import { useRef, useState } from 'react'
import { applyPayload, copyText, decodeText, downloadJson, encodeParts, fromObject, makePayload, type Payload, type Scope } from './lib'
import type { Ctx } from './ui'

export function Handover({ ctx }: { ctx: Ctx }) {
  const { pkg } = ctx
  const [scope, setScope] = useState<Scope>('all')
  const [parts, setParts] = useState<string[] | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [paste, setPaste] = useState('')
  const [found, setFound] = useState<Payload | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const baseN = pkg.items.filter((i) => i.source === 'base').length
  const mineN = pkg.items.length - baseN

  async function make() {
    setCopied(null)
    setParts(await encodeParts(makePayload(pkg, scope)))
  }
  async function doCopy(i: number) {
    if (!parts) return
    setCopied((await copyText(parts[i])) ? i : -1)
  }
  async function check() {
    setFound(null)
    setMsg(null)
    const r = await decodeText(paste)
    if (r.ok) setFound(r.payload)
    else setMsg({ ok: false, t: r.error })
  }
  function applyFound() {
    if (!found) return
    ctx.update((p) => applyPayload(p, found))
    setMsg({ ok: true, t: `取り込みました（${found.items.length}件）。メニューにもどって、内容を確かめてください。` })
    setFound(null)
    setPaste('')
  }
  async function onFile(f: File) {
    setMsg(null)
    setFound(null)
    try {
      const r = fromObject(JSON.parse(await f.text()))
      if (r.ok) setFound(r.payload)
      else setMsg({ ok: false, t: r.error })
    } catch {
      setMsg({ ok: false, t: 'ファイルを読み取れませんでした。組長ノートのバックアップ（.json）を選んでください。' })
    }
  }

  const fb = found ? found.items.filter((i) => i.source === 'base').length : 0
  const fm = found ? found.items.length - fb : 0

  return (
    <div>
      <div className="screen-head">
        <h2>引き継ぎ</h2>
        <p className="muted">次の組長へ渡す方法は2つ。相手に合わせて選べます。</p>
      </div>

      <section className="card hand">
        <h3>① デジタルで一括引き継ぎ <span className="badge now">5分以内</span></h3>
        <p className="muted">若い世代向け。ボタンを押して出る文字をコピーし、LINEなどでそのまま送ります。受け取った側は、貼り付けるだけで、組のデータが丸ごと入ります。</p>

        <div className="seg">
          <label className={`segopt ${scope === 'all' ? 'on' : ''}`}>
            <input type="radio" name="scope" checked={scope === 'all'} onChange={() => { setScope('all'); setParts(null) }} />
            <span>
              <b>ぜんぶ渡す（次の組長へ）</b>
              <small>共通ベース {baseN}件 ＋ 自分の組 {mineN}件</small>
            </span>
          </label>
          <label className={`segopt ${scope === 'base' ? 'on' : ''}`}>
            <input type="radio" name="scope" checked={scope === 'base'} onChange={() => { setScope('base'); setParts(null) }} />
            <span>
              <b>共通ベースだけ配る（ほかの組へ）</b>
              <small>代表の組長が取り込んだ {baseN}件だけ。自分の組の分は含みません</small>
            </span>
          </label>
        </div>

        <button className="btn primary big" onClick={make} id="btn-make-handover" disabled={scope === 'base' && baseN === 0}>
          一括引き継ぎ（送る文字を作る）
        </button>

        {parts && (
          <div className="parts">
            <p>
              <b>{parts.length > 1 ? `${parts.length}通に分けました。1通ずつコピーして、順に送ります。` : '下の「コピーする」を押して、LINEなどに貼り付けて送ります。'}</b>
            </p>
            {parts.map((t, i) => (
              <div key={i} className="part">
                <textarea readOnly rows={4} value={t} onFocus={(e) => e.currentTarget.select()} aria-label={`引き継ぎデータ ${i + 1}`} />
                <button className="btn primary" onClick={() => doCopy(i)} id={`btn-copy-${i}`}>
                  {copied === i ? '✓ コピーしました' : `コピーする${parts.length > 1 ? `（${i + 1}/${parts.length}）` : ''}`}
                </button>
                {copied === -1 && <span className="err"> コピーできませんでした。枠を長押しして、コピーしてください。</span>}
              </div>
            ))}
          </div>
        )}

        <h4>受け取った側：引き継ぎを取り込む</h4>
        <textarea
          id="paste-box"
          rows={4}
          value={paste}
          onChange={(e) => { setPaste(e.target.value); setFound(null); setMsg(null) }}
          placeholder="受け取ったメッセージを、まるごと貼り付けます（複数通ある場合は、続けて貼ります）"
        />
        <button className="btn outline" disabled={!paste.trim()} onClick={check} id="btn-check-import">
          内容を確かめる
        </button>
        {found && (
          <div className="card ok" role="status">
            <b>
              {found.info.jichikai || '（名前なし）'} {found.info.kumi} の{found.kind === 'base' ? '共通ベース' : 'データ'}です
            </b>
            <p className="muted">
              共通ベース {fb}件{fm ? ` ＋ 自分の組 ${fm}件` : ''}。
              {found.kind === 'base' && !pkg.sample ? '自分の組の分は、そのまま残ります。共通ベースは入れ替わります。' : '今ある内容は、入れ替わります。'}
            </p>
            <div className="row">
              <button className="btn primary" onClick={applyFound} id="btn-apply-import">
                この内容を取り込む
              </button>
              <button className="btn ghost" onClick={() => setFound(null)}>
                やめる
              </button>
            </div>
          </div>
        )}
        {msg && <p className={msg.ok ? 'okmsg' : 'err'} role="status">{msg.t}</p>}

        <details className="more">
          <summary>ファイルで保存・読み込み（バックアップ）</summary>
          <div className="row wrap">
            <button className="btn outline" onClick={() => downloadJson(pkg)}>
              ファイル（JSON）に保存
            </button>
            <button className="btn outline" onClick={() => fileRef.current?.click()}>
              ファイルから読み込む
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
        </details>
      </section>

      <section className="card hand">
        <h3>② 紙の引き継ぎ冊子（A4） <span className="badge base">スマホが苦手な方にも</span></h3>
        <p className="muted">パソコンやスマホの説明（1時間ほど）が要りません。全内容をA4数枚にまとめて、そのまま紙で手渡せます。PDFにも保存できます。</p>
        <button className="btn primary big" onClick={() => ctx.print('booklet')} id="btn-print-booklet">
          🖨 引き継ぎ冊子を、A4で印刷・PDF保存
        </button>
        <div className="row wrap docs">
          <button className="btn mini" onClick={() => ctx.print('flyer')}>案内チラシ</button>
          <button className="btn mini" onClick={() => ctx.print('joinform')}>入会申込書</button>
          <button className="btn mini" onClick={() => ctx.print('leaveform')}>退会届</button>
        </div>
      </section>
    </div>
  )
}
