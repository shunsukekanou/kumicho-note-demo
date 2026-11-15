import { useCallback, useEffect, useMemo, useState } from 'react'
import { Handover } from './Handover'
import { Importer } from './Importer'
import { clearAllStorage, emptyPkg, fiscalLabel, loadLeader, loadPkg, loadProgress, samplePkg, saveLeader, savePkg, saveProgress } from './lib'
import { PrintView } from './Print'
import { Duty, DutyView, Join, Leave, Mine, Overview } from './Screens'
import type { Info, Pkg } from './types'
import type { Ctx, DocKey, Screen } from './ui'

const MENU: { s: Screen; icon: string; title: string; desc: string }[] = [
  { s: 'overview', icon: '🏘', title: '自治会の概要', desc: '年間スケジュール・規約・連絡体制' },
  { s: 'duty', icon: '📋', title: '組長のお仕事概要', desc: '回覧・集金・清掃・総会など、月別の手順' },
  { s: 'join', icon: '🤝', title: '入会関連', desc: '新しい方へのお誘い・申込書・案内チラシ（A4印刷）' },
  { s: 'leave', icon: '👋', title: '退会関連', desc: '退会届（A4印刷）・確認手順・引き継ぎチェック' },
  { s: 'mine', icon: '🗝', title: '自分の組のルール・備品の登録', desc: '組だけの決まり・備品の置き場所・輪番' },
]

function InfoEditor({ info, onSave, onCancel }: { info: Info; onSave: (i: Info) => void; onCancel: () => void }) {
  const [v, setV] = useState(info)
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...v, houses: Math.min(99, Math.max(1, Math.round(Number(v.houses) || 11))) })
      }}
    >
      <label>
        自治会の名前
        <input value={v.jichikai} onChange={(e) => setV({ ...v, jichikai: e.target.value })} maxLength={60} />
      </label>
      <label>
        組の名前（例：2組）
        <input value={v.kumi} onChange={(e) => setV({ ...v, kumi: e.target.value })} maxLength={40} />
      </label>
      <label>
        組の軒数（輪番の数）
        <input inputMode="numeric" value={String(v.houses)} onChange={(e) => setV({ ...v, houses: Number(e.target.value.replace(/\D/g, '')) })} maxLength={2} />
      </label>
      <label>
        年度の表記（例：令和8年度）
        <input value={v.year} onChange={(e) => setV({ ...v, year: e.target.value })} maxLength={20} />
      </label>
      <div className="row">
        <button className="btn primary" type="submit">
          保存する
        </button>
        <button className="btn ghost" type="button" onClick={onCancel}>
          やめる
        </button>
      </div>
    </form>
  )
}

function Home({ ctx }: { ctx: Ctx }) {
  const { pkg } = ctx
  const [editInfo, setEditInfo] = useState(false)
  const [confirm, setConfirm] = useState<'' | 'empty' | 'sample' | 'wipe'>('')
  const m = new Date().getMonth() + 1
  const now = pkg.items.filter((i) => i.cat === 'duty' && i.month === m)
  return (
    <div>
      <header className="hero">
        <p className="kicker">自治会・組長の引き継ぎパッケージ</p>
        <h1>組長ノート</h1>
        <p className="tag">11年に1度の組長当番も、これ1冊で迷わない。</p>
      </header>

      <div className="infoline">
        <div>
          <b>{pkg.info.jichikai || '（自治会の名前を入れてください）'}</b>
          <span>
            {pkg.info.kumi || '（組の名前）'}　{pkg.info.houses}軒の輪番　{pkg.info.year}
          </span>
        </div>
        <button className="btn mini" onClick={() => setEditInfo(!editInfo)}>
          直す
        </button>
      </div>
      {editInfo && (
        <InfoEditor
          info={pkg.info}
          onCancel={() => setEditInfo(false)}
          onSave={(i) => {
            ctx.update((p) => ({ ...p, info: i }))
            setEditInfo(false)
          }}
        />
      )}

      {pkg.sample && (
        <div className="card sample-note">
          <b>いまは、見本のデータ（架空の自治会）です。</b>
          <p>そのまま触って試せます。実際に使うときは、下の「設定・データ」から、見本を消して自分の組で始めます。</p>
        </div>
      )}

      <section className="card now">
        <h3>
          今月（{m}月）の組長のしごと
        </h3>
        {now.length ? (
          now.map((d) => <DutyView key={d.id} it={d} ctx={ctx} />)
        ) : (
          <p className="muted">今月の登録はありません。</p>
        )}
      </section>

      <nav className="menu" aria-label="メニュー">
        {MENU.map((x) => (
          <button key={x.s} className="menu-btn" onClick={() => ctx.go(x.s)} id={`menu-${x.s}`}>
            <span className="ic" aria-hidden="true">
              {x.icon}
            </span>
            <span className="tx">
              <b>{x.title}</b>
              <small>{x.desc}</small>
            </span>
            <span className="chev" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </nav>

      <section className="card pass">
        <h3>次の組長へ、渡す</h3>
        <div className="row wrap">
          <button className="btn primary" onClick={() => ctx.go('handover')}>
            📲 デジタルで一括引き継ぎ（5分）
          </button>
          <button className="btn primary" onClick={() => ctx.print('booklet')}>
            🖨 紙の冊子をA4で印刷
          </button>
        </div>
        <p className="muted">紙の資料は、画面下の「紙を取り込む」から、写真やスキャンで取り込めます。</p>
      </section>

      <details className="card settings">
        <summary>設定・データ</summary>
        <label className="check big">
          <input type="checkbox" checked={ctx.leader} onChange={(e) => ctx.setLeader(e.target.checked)} />
          <span>
            代表の組長モード
            <small className="muted">　オンにすると、取り込んだり追加した内容が「共通ベース」になり、ほかの組へ配れます。</small>
          </span>
        </label>
        <div className="row wrap">
          <button className="btn outline" onClick={() => setConfirm('empty')}>
            見本を消して、自分の組で始める
          </button>
          <button className="btn outline" onClick={() => setConfirm('sample')}>
            見本のデータに戻す
          </button>
          <button className="btn outline danger-soft" onClick={() => setConfirm('wipe')}>
            この端末のデータを全部消す
          </button>
        </div>
        {confirm && (
          <div className="card warn" role="alert">
            <b>
              {confirm === 'empty' && '見本のデータを全部消して、空の状態から始めます。よろしいですか？'}
              {confirm === 'sample' && '今のデータを消して、見本のデータに戻します。よろしいですか？'}
              {confirm === 'wipe' && 'この端末に保存した、すべてのデータを消します（見本に戻ります）。よろしいですか？'}
            </b>
            <div className="row">
              <button
                className="btn primary danger"
                onClick={() => {
                  if (confirm === 'empty') ctx.update(() => emptyPkg())
                  else if (confirm === 'sample') ctx.update(() => samplePkg())
                  else {
                    clearAllStorage()
                    ctx.update(() => samplePkg())
                    ctx.setLeader(false)
                  }
                  ctx.resetProgress()
                  setConfirm('')
                }}
              >
                はい
              </button>
              <button className="btn ghost" onClick={() => setConfirm('')}>
                やめる
              </button>
            </div>
          </div>
        )}
        <p className="muted">データは、この端末のブラウザの中だけに保存されます。外のサーバーには送りません。</p>
      </details>
    </div>
  )
}

export default function App() {
  const [pkg, setPkg] = useState<Pkg>(loadPkg)
  const [progress, setProgress] = useState<Record<string, boolean>>(loadProgress)
  const [leader, setLeaderState] = useState<boolean>(loadLeader)
  const [screen, setScreen] = useState<Screen>('home')
  const [printDoc, setPrintDoc] = useState<DocKey | null>(null)

  useEffect(() => savePkg(pkg), [pkg])
  useEffect(() => saveProgress(progress), [progress])
  const go = useCallback((s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }, [])

  const ctx: Ctx = useMemo(
    () => ({
      pkg,
      update: (fn) => setPkg((p) => fn(p)),
      progress,
      toggle: (key) => setProgress((p) => ({ ...p, [key]: !p[key] })),
      resetProgress: () => setProgress({}),
      leader,
      setLeader: (v) => {
        setLeaderState(v)
        saveLeader(v)
      },
      go,
      print: (d) => {
        setPrintDoc(d)
        window.scrollTo(0, 0)
      },
    }),
    [pkg, progress, leader, go],
  )

  // 印刷プレビュー中は、画面のかわりに書面だけを出す（印刷でも書面だけが出る）
  if (printDoc) return <PrintView doc={printDoc} pkg={pkg} onClose={() => setPrintDoc(null)} />

  const tab = screen === 'import' ? 'import' : screen === 'handover' ? 'handover' : 'home'
  return (
    <div className="app">
      <main className="main">
        {screen === 'home' && <Home ctx={ctx} />}
        {screen === 'overview' && <Overview ctx={ctx} />}
        {screen === 'duty' && <Duty ctx={ctx} />}
        {screen === 'join' && <Join ctx={ctx} />}
        {screen === 'leave' && <Leave ctx={ctx} />}
        {screen === 'mine' && <Mine ctx={ctx} />}
        {screen === 'import' && <Importer ctx={ctx} />}
        {screen === 'handover' && <Handover ctx={ctx} />}
      </main>
      <nav className="tabs" aria-label="切り替え">
        <button className={tab === 'home' ? 'on' : ''} onClick={() => go('home')} id="tab-home">
          <span aria-hidden="true">🏠</span>
          ホーム
        </button>
        <button className={tab === 'import' ? 'on' : ''} onClick={() => go('import')} id="tab-import">
          <span aria-hidden="true">📷</span>
          紙を取り込む
        </button>
        <button className={tab === 'handover' ? 'on' : ''} onClick={() => go('handover')} id="tab-handover">
          <span aria-hidden="true">📲</span>
          引き継ぎ
        </button>
      </nav>
      <p className="foot">
        見本は架空の自治会です。データはこの端末の中だけに保存されます（{fiscalLabel()}）。
      </p>
    </div>
  )
}
