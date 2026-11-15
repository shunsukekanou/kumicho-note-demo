import type { ReactNode } from 'react'
import { byFiscal, fiscalYear } from './lib'
import { FISCAL_MONTHS, type Cat, type Item, type Pkg } from './types'
import type { DocKey } from './ui'

const of = (p: Pkg, c: Cat) => p.items.filter((i) => i.cat === c)
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
const reiwa = (y: number) => `令和${y - 2018 === 1 ? '元' : y - 2018}年度`
const nameOf = (p: Pkg) => [p.info.jichikai || '（自治会名）', p.info.kumi].filter(Boolean).join(' ')

function Lines({ t }: { t: string }) {
  return (
    <>
      {t
        .split('\n')
        .filter((l) => l.trim())
        .map((l, i) => (
          <p key={i}>{l}</p>
        ))}
    </>
  )
}
function Boxes({ t }: { t: string }) {
  return (
    <ul className="boxes">
      {t
        .split('\n')
        .filter((l) => l.trim())
        .map((l, i) => (
          <li key={i}>
            <span className="cb">□</span> {l}
          </li>
        ))}
    </ul>
  )
}

function Cover({ p }: { p: Pkg }) {
  return (
    <article className="paper cover">
      <p className="kicker">自治会・組長の引き継ぎ冊子</p>
      <h1>組長ノート</h1>
      <p className="cover-name">{nameOf(p)}</p>
      <p className="cover-sub">
        {p.info.houses}軒の輪番　／　{p.info.year}　／　作成日 {today()}
      </p>

      <h3>この冊子の使い方</h3>
      <ol className="flow">
        <li>はじめに、「2 組長のお仕事（月別）」を、4月から順に読みます。やったことは□に✓を入れます。</li>
        <li>わからないことは、「1 自治会の概要」の連絡体制へ、電話で聞きます。</li>
        <li>新しく入る方がいたら「3 入会・退会」を見て、別紙の案内チラシ・入会申込書を使います。</li>
        <li>自分の組だけの決まり・備品の置き場所は、「4 自分の組」にあります。</li>
        <li>組長を交代するときは、「5 引き継ぎチェック」を使って、次の組長へ渡します。</li>
      </ol>

      <h3>もくじ</h3>
      <ol className="toc">
        <li>自治会の概要（年間スケジュール・規約・連絡体制）</li>
        <li>組長のお仕事（月別）</li>
        <li>入会・退会</li>
        <li>自分の組のルール・備品・輪番</li>
        <li>引き継ぎチェック</li>
      </ol>
      <p className="small">※この冊子は、組長ノート（スマホ・パソコン）から印刷しました。同じ内容を、データでも受け渡しできます。</p>
    </article>
  )
}

function Overview({ p }: { p: Pkg }) {
  return (
    <article className="paper">
      <h2>1　自治会の概要</h2>
      <h3>年間スケジュール（4月はじまり）</h3>
      <table className="grid">
        <tbody>
          {of(p, 'schedule')
            .sort(byFiscal)
            .map((s) => (
              <tr key={s.id}>
                <th className="w-m">{s.month}月</th>
                <td>
                  <b>{s.title}</b>
                  {s.body && <span>　{s.body}</span>}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <h3>規約（★は、今回の改定で変わった点）</h3>
      <ul className="plain">
        {of(p, 'rule')
          .sort((a, b) => Number(!!b.revised) - Number(!!a.revised))
          .map((r) => (
            <li key={r.id}>
              <b>
                {r.revised ? '★' : '・'}
                {r.title}</b>
              　{r.body}
            </li>
          ))}
      </ul>
      <h3>連絡体制</h3>
      <table className="grid">
        <tbody>
          {of(p, 'contact').map((c) => (
            <tr key={c.id}>
              <th className="w-r">{c.title}</th>
              <td>{c.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

function Duties({ p }: { p: Pkg }) {
  const duties = of(p, 'duty')
  return (
    <article className="paper">
      <h2>2　組長のお仕事（月別）</h2>
      <p className="small">やったことは、□に✓を入れます。</p>
      <div className="cols2">
      {FISCAL_MONTHS.map((m) => {
        const list = duties.filter((d) => d.month === m)
        if (!list.length) return null
        return (
          <div key={m} className="mblock">
            <h3>
              {m}月　{list.map((d) => d.title).join('／')}
            </h3>
            {list.map((d) => (
              <Boxes key={d.id} t={d.body} />
            ))}
          </div>
        )
      })}
      </div>
    </article>
  )
}

function Blocks({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((it) => (
        <div key={it.id} className="blk">
          <b>{it.title}</b>
          {/流れ|手順/.test(it.title) ? (
            <ol className="flow">
              {it.body
                .split('\n')
                .filter((l) => l.trim())
                .map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
            </ol>
          ) : (
            <Lines t={it.body} />
          )}
        </div>
      ))}
    </>
  )
}

function JoinLeave({ p }: { p: Pkg }) {
  return (
    <article className="paper">
      <h2>3　入会・退会</h2>
      <h3>入会（新しく入る方をお誘いするとき）</h3>
      <Blocks items={of(p, 'join')} />
      <p className="small">※案内チラシ・入会申込書は、別の用紙で印刷できます。</p>
      <h3>退会（退会の申し出を受けたとき）</h3>
      <Blocks items={of(p, 'leave')} />
      <p className="small">※退会届は、別の用紙で印刷できます。</p>
    </article>
  )
}

function Mine({ p }: { p: Pkg }) {
  const cur = fiscalYear()
  return (
    <article className="paper">
      <h2>4　自分の組のルール・備品・輪番</h2>
      <h3>{p.info.kumi || '自分の組'}のルール</h3>
      <ul className="plain">
        {of(p, 'myrule').map((r) => (
          <li key={r.id}>
            <b>・{r.title}</b>　{r.body}
          </li>
        ))}
      </ul>
      <h3>備品と保管場所</h3>
      <table className="grid">
        <thead>
          <tr>
            <th>備品</th>
            <th>保管場所</th>
            <th className="w-c">個数</th>
            <th>メモ</th>
          </tr>
        </thead>
        <tbody>
          {of(p, 'equip').map((e) => (
            <tr key={e.id}>
              <td>{e.title}</td>
              <td>{e.place}</td>
              <td className="w-c">{e.count}</td>
              <td>{e.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>組長の輪番（{p.info.houses}軒）</h3>
      <table className="grid rot">
        <tbody>
          {of(p, 'rotation')
            .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
            .map((r) => (
              <tr key={r.id} className={r.year === cur ? 'cur' : ''}>
                <th>{r.title}</th>
                <td>
                  {r.year}年度（{r.year ? reiwa(r.year) : ''}）{r.year === cur ? '　← 今年度の組長' : ''}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </article>
  )
}

function Handover({ p }: { p: Pkg }) {
  return (
    <article className="paper">
      <h2>5　引き継ぎチェック</h2>
      <p className="small">組長を交代するとき、1つずつ確かめて、□に✓を入れます。</p>
      <ul className="boxes big">
        {of(p, 'handover').map((h) => (
          <li key={h.id}>
            <span className="cb">□</span> {h.title}
          </li>
        ))}
      </ul>
      <div className="sign">
        <p>引き継ぎをした日：　　　　年　　　月　　　日</p>
        <p>前の組長（　　　　　　　　　　　）　　次の組長（　　　　　　　　　　　）</p>
      </div>
    </article>
  )
}

function Flyer({ p }: { p: Pkg }) {
  const fee = of(p, 'rule').find((r) => /会費/.test(r.title))
  const sched = of(p, 'schedule').sort(byFiscal)
  const contacts = of(p, 'contact').slice(0, 3)
  return (
    <article className="paper doc flyer">
      <p className="kicker">{p.info.jichikai || '（自治会名）'}</p>
      <h1>自治会へ、ようこそ！</h1>
      <p className="lead">
        私たちの自治会は、くらしの安心とつながりのために、みんなで助けあって活動しています。ご近所どうし、気軽に顔を合わせられる地域をいっしょにつくりませんか。
      </p>
      <h3>こんな活動をしています</h3>
      <div className="cols">
        {sched.map((s) => (
          <p key={s.id}>
            <b>{s.month}月</b>　{s.title}
          </p>
        ))}
      </div>
      <h3>入会すると</h3>
      <ul className="plain">
        <li>防災訓練や、日ごろの助けあいの輪に加われます。</li>
        <li>ごみステーションの管理や、地域の清掃を、みんなで分担できます。</li>
        <li>夏まつりなどの行事に参加できます。回覧板で、地域のお知らせが届きます。</li>
      </ul>
      {fee && (
        <>
          <h3>会費</h3>
          <p>{fee.body.replace(/（改定前：.*）/, '')}</p>
        </>
      )}
      <h3>入会のしかた</h3>
      <ol className="flow">
        <li>この案内をお読みください。わからないことは、組長におたずねください。</li>
        <li>「入会申込書」に書いて、組長へお渡しください。</li>
        <li>自治会から、会費の集金袋とごみ出しのルールをお届けします。</li>
      </ol>
      <h3>お問い合わせ</h3>
      <table className="grid">
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id}>
              <th className="w-r">{c.title}</th>
              <td>{c.body.replace(/（.*）/, '')}</td>
            </tr>
          ))}
          <tr>
            <th className="w-r">{p.info.kumi || '組'}の組長</th>
            <td>お名前（　　　　　　　　　　）　連絡先（　　　　　　　　　　　　　　）</td>
          </tr>
        </tbody>
      </table>
    </article>
  )
}

function Row({ th, children, tall }: { th: string; children?: ReactNode; tall?: boolean }) {
  return (
    <tr className={tall ? 'tall' : ''}>
      <th className="w-r">{th}</th>
      <td>{children}</td>
    </tr>
  )
}

function JoinForm({ p }: { p: Pkg }) {
  return (
    <article className="paper doc">
      <p className="to">{p.info.jichikai || '（自治会名）'}　会長　殿</p>
      <h1>入会申込書</h1>
      <p className="lead">私は、{p.info.jichikai || '自治会'}の趣旨に賛同し、次のとおり入会を申し込みます。</p>
      <p className="right">申込日：　　　　　年　　　月　　　日</p>
      <table className="grid form">
        <tbody>
          <Row th="ふりがな" />
          <Row th="世帯主のお名前" tall />
          <Row th="住所" tall>
            <span className="hint">丁目・番地・建物名・部屋番号まで</span>
          </Row>
          <Row th="日中の連絡先" tall>
            <span className="hint">電話番号</span>
          </Row>
          <Row th="世帯の人数">　　　　人（うち 65歳以上　　　　人）</Row>
          <Row th="回覧のうけとり">□ 紙の回覧板　　□ 紙とLINEのお知らせの両方（希望する方）</Row>
          <Row th="その他" tall>
            <span className="hint">ごみ出し・組の活動で、ご希望やお困りのこと</span>
          </Row>
        </tbody>
      </table>
      <p className="small">
        ※ご記入いただいた個人情報は、自治会の運営（連絡・名簿づくり）の目的だけに使い、ほかの目的には使いません。名簿は、組長の交代のときに、次の組長へ引き継ぎます。
      </p>
      <h3>自治会・組使用欄（記入しないでください）</h3>
      <table className="grid form">
        <tbody>
          <Row th="受付日・受付者">　　　　年　　月　　日　　　{p.info.kumi || '　　　組'}　組長（　　　　　　　　　）</Row>
          <Row th="会費・集金袋">□ 渡した　　□ 第1回の会費を受け取った</Row>
          <Row th="自治会へ連絡">□ 会長へ連絡した　　□ 会計へ連絡した　　□ 名簿に載せた</Row>
        </tbody>
      </table>
    </article>
  )
}

function LeaveForm({ p }: { p: Pkg }) {
  return (
    <article className="paper doc">
      <p className="to">{p.info.jichikai || '（自治会名）'}　会長　殿</p>
      <h1>退会届</h1>
      <p className="lead">私は、{p.info.jichikai || '自治会'}を、次のとおり退会します。</p>
      <p className="right">届出日：　　　　　年　　　月　　　日</p>
      <table className="grid form">
        <tbody>
          <Row th="ふりがな" />
          <Row th="世帯主のお名前" tall>
            <span className="hint">自筆でお書きください</span>
          </Row>
          <Row th="住所" tall />
          <Row th="退会する日">　　　　　年　　　月　　　日</Row>
          <Row th="退会の理由" tall>
            <span className="hint">書きたくない場合は、空けたままで構いません</span>
          </Row>
        </tbody>
      </table>
      <h3>次の説明を受けたことを、確認してください</h3>
      <ul className="boxes big">
        <li>
          <span className="cb">□</span> 納めた会費は、退会しても戻らないこと
        </li>
        <li>
          <span className="cb">□</span> 回覧板や配布物が、届かなくなること
        </li>
        <li>
          <span className="cb">□</span> ごみステーションなど共用の場所の使い方は、自治会の決まりによること
        </li>
      </ul>
      <h3>自治会・組使用欄（記入しないでください）</h3>
      <table className="grid form">
        <tbody>
          <Row th="受付日・受付者">　　　　年　　月　　日　　　{p.info.kumi || '　　　組'}　組長（　　　　　　　　　）</Row>
          <Row th="自治会へ連絡">□ 会長へ連絡した　　□ 会計へ連絡した　　□ 名簿から外した　　□ 回覧を止めた</Row>
        </tbody>
      </table>
    </article>
  )
}

export function PrintView({ doc, pkg, onClose }: { doc: DocKey; pkg: Pkg; onClose: () => void }) {
  const title = { booklet: '引き継ぎ冊子', flyer: '案内チラシ', joinform: '入会申込書', leaveform: '退会届' }[doc]
  return (
    <div className="printview">
      <div className="pv-bar no-print">
        <button className="btn ghost light" onClick={onClose}>
          ← もどる
        </button>
        <b>{title}（A4）</b>
        <button className="btn primary" onClick={() => window.print()} id="btn-do-print">
          🖨 印刷・PDF保存
        </button>
      </div>
      <p className="pv-hint no-print">
        印刷の画面で、用紙「A4」・倍率「100%」を選びます。「PDFに保存」を選ぶと、PDFのファイルになります。
      </p>
      <div className="sheets">
        {doc === 'booklet' && (
          <>
            <Cover p={pkg} />
            <Overview p={pkg} />
            <Duties p={pkg} />
            <JoinLeave p={pkg} />
            <Mine p={pkg} />
            <Handover p={pkg} />
          </>
        )}
        {doc === 'flyer' && <Flyer p={pkg} />}
        {doc === 'joinform' && <JoinForm p={pkg} />}
        {doc === 'leaveform' && <LeaveForm p={pkg} />}
      </div>
    </div>
  )
}
