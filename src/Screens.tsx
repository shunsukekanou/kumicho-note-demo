import { useState } from 'react'
import { byFiscal, fiscalYear } from './lib'
import { CAT_LABEL, FISCAL_MONTHS, type Cat, type Item } from './types'
import { EditableList, EditToggle, Lines, ScreenHead, SourceBadge, type Ctx } from './ui'

const nowMonth = () => new Date().getMonth() + 1
const of = (ctx: Ctx, cat: Cat) => ctx.pkg.items.filter((i) => i.cat === cat)
const reiwa = (y: number) => `令和${y - 2018 === 1 ? '元' : y - 2018}年度`

function MineBadge({ it, always }: { it: Item; always?: boolean }) {
  return it.source === 'mine' || always ? <SourceBadge source={it.source} /> : null
}

// ① 自治会の概要
export function Overview({ ctx }: { ctx: Ctx }) {
  const [edit, setEdit] = useState(false)
  const m = nowMonth()
  const sched = of(ctx, 'schedule').sort(byFiscal)
  return (
    <div>
      <ScreenHead title="自治会の概要" sub="年間スケジュール・規約・連絡体制を、ひと目で。" ctx={ctx}>
        <EditToggle edit={edit} setEdit={setEdit} />
      </ScreenHead>

      <h3 className="sec">年間スケジュール（4月はじまり）</h3>
      <EditableList
        cat="schedule"
        items={sched}
        edit={edit}
        ctx={ctx}
        addLabel="行事を追加する"
        render={(it) => (
          <div className={`sched ${it.month === m ? 'now' : ''}`}>
            <div className="mon">{it.month}月</div>
            <div className="sbody">
              <b>{it.title}</b> {it.month === m && <span className="badge now">今月</span>} <MineBadge it={it} />
              {it.body && <p className="line">{it.body}</p>}
            </div>
          </div>
        )}
      />

      <h3 className="sec">規約（10年ぶりの改定を、★で表示）</h3>
      <EditableList
        cat="rule"
        items={of(ctx, 'rule').sort((a, b) => Number(!!b.revised) - Number(!!a.revised))}
        edit={edit}
        ctx={ctx}
        addLabel="規約を追加する"
        render={(it) => (
          <div>
            <b>{it.revised && <span className="star">★改定 </span>}{it.title}</b> <MineBadge it={it} />
            <p className="line">{it.body}</p>
          </div>
        )}
      />

      <h3 className="sec">連絡体制</h3>
      <EditableList
        cat="contact"
        items={of(ctx, 'contact')}
        edit={edit}
        ctx={ctx}
        addLabel="連絡先を追加する"
        render={(it) => (
          <div>
            <b>{it.title}</b> <MineBadge it={it} />
            <p className="line">{it.body}</p>
          </div>
        )}
      />
    </div>
  )
}

// ② 組長のお仕事概要
export function Duty({ ctx }: { ctx: Ctx }) {
  const [edit, setEdit] = useState(false)
  const m = nowMonth()
  const duties = of(ctx, 'duty')
  const months = [m, ...FISCAL_MONTHS.filter((x) => x !== m)] // 今月を先頭に
  return (
    <div>
      <ScreenHead title="組長のお仕事（月別）" sub="今月のしごとが、いちばん上。やったら□を押して✓にします。" ctx={ctx}>
        <EditToggle edit={edit} setEdit={setEdit} />
      </ScreenHead>
      {months.map((mm) => {
        const list = duties.filter((d) => d.month === mm)
        if (!list.length) return null
        return (
          <section key={mm} className={`month-card ${mm === m ? 'now' : ''}`}>
            <h3>
              {mm}月 {mm === m && <span className="badge now">今月</span>}
            </h3>
            <EditableList
              cat="duty"
              items={list}
              edit={edit}
              ctx={ctx}
              addLabel=""
              noAdd
              render={(it) => <DutyView it={it} ctx={ctx} />}
            />
          </section>
        )
      })}
      {edit && (
        <div className="card">
          <p className="muted">仕事を足すときは、下のボタンで追加して、月を選びます。</p>
          <EditableList cat="duty" items={[]} edit ctx={ctx} addLabel="仕事を追加する（月を選べます）" render={() => null} />
        </div>
      )}
      <button className="btn outline" onClick={ctx.resetProgress}>
        ✓を全部はずす（新しい年度のはじめに）
      </button>
    </div>
  )
}

export function DutyView({ it, ctx }: { it: Item; ctx: Ctx }) {
  const steps = it.body.split('\n').filter((s) => s.trim())
  const done = steps.filter((_, i) => ctx.progress[`${it.id}:${i}`]).length
  return (
    <div>
      <b>{it.title}</b> <MineBadge it={it} />{' '}
      <span className="muted">
        {done}/{steps.length}
      </span>
      <ul className="steps">
        {steps.map((s, i) => (
          <li key={i}>
            <label className="check big">
              <input type="checkbox" checked={!!ctx.progress[`${it.id}:${i}`]} onChange={() => ctx.toggle(`${it.id}:${i}`)} />
              <span>{s}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ③ 入会関連
export function Join({ ctx }: { ctx: Ctx }) {
  const [edit, setEdit] = useState(false)
  return (
    <div>
      <ScreenHead title="入会関連" sub="新しく住み始めた方を、自治会へお誘いするときに。" ctx={ctx}>
        <div className="row wrap">
          <button className="btn primary" onClick={() => ctx.print('flyer')}>
            🖨 案内チラシをA4で印刷
          </button>
          <button className="btn primary" onClick={() => ctx.print('joinform')}>
            🖨 入会申込書をA4で印刷
          </button>
        </div>
        <EditToggle edit={edit} setEdit={setEdit} />
      </ScreenHead>
      <EditableList
        cat="join"
        items={of(ctx, 'join')}
        edit={edit}
        ctx={ctx}
        addLabel="項目を追加する"
        render={(it) => <Block it={it} />}
      />
    </div>
  )
}

function Block({ it }: { it: Item }) {
  const ordered = /流れ|手順/.test(it.title)
  const lines = it.body.split('\n').filter((l) => l.trim())
  return (
    <div>
      <b>{it.title}</b> <MineBadge it={it} />
      {ordered ? (
        <ol className="flow">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      ) : (
        <Lines text={it.body} />
      )}
    </div>
  )
}

// ④ 退会関連
export function Leave({ ctx }: { ctx: Ctx }) {
  const [edit, setEdit] = useState(false)
  const hand = of(ctx, 'handover')
  const done = hand.filter((h) => ctx.progress[`h:${h.id}`]).length
  return (
    <div>
      <ScreenHead title="退会関連" sub="退会の申し出を受けたとき、組長を交代するときに。" ctx={ctx}>
        <button className="btn primary" onClick={() => ctx.print('leaveform')}>
          🖨 退会届をA4で印刷
        </button>
        <EditToggle edit={edit} setEdit={setEdit} />
      </ScreenHead>
      <EditableList
        cat="leave"
        items={of(ctx, 'leave')}
        edit={edit}
        ctx={ctx}
        addLabel="項目を追加する"
        render={(it) => <Block it={it} />}
      />
      <h3 className="sec">
        引き継ぎチェック（組長を交代するとき） <span className="muted">{done}/{hand.length}</span>
      </h3>
      <EditableList
        cat="handover"
        items={hand}
        edit={edit}
        ctx={ctx}
        addLabel="チェック項目を追加する"
        render={(it) => (
          <label className="check big">
            <input type="checkbox" checked={!!ctx.progress[`h:${it.id}`]} onChange={() => ctx.toggle(`h:${it.id}`)} />
            <span>
              {it.title} <MineBadge it={it} />
            </span>
          </label>
        )}
      />
    </div>
  )
}

// ⑤ 自分の組のルール・備品の登録
export function Mine({ ctx }: { ctx: Ctx }) {
  const [edit, setEdit] = useState(false)
  const cur = fiscalYear()
  return (
    <div>
      <ScreenHead
        title="自分の組のルール・備品"
        sub={`${ctx.pkg.info.kumi || '自分の組'}だけの決まりごと・備品の置き場所・組長の輪番を、登録します。`}
        ctx={ctx}
      >
        <div className="row wrap">
          <button className="btn primary" onClick={() => ctx.go('import')}>
            📷 紙の資料から取り込む
          </button>
        </div>
        <EditToggle edit={edit} setEdit={setEdit} />
      </ScreenHead>

      <h3 className="sec">{CAT_LABEL.myrule}</h3>
      <EditableList
        cat="myrule"
        items={of(ctx, 'myrule')}
        edit={edit}
        ctx={ctx}
        addLabel="ルールを追加する"
        empty="まだありません。「編集する」から追加するか、紙の資料から取り込みます。"
        render={(it) => (
          <div>
            <b>{it.title}</b> <MineBadge it={it} always />
            <p className="line">{it.body}</p>
          </div>
        )}
      />

      <h3 className="sec">備品と保管場所</h3>
      <EditableList
        cat="equip"
        items={of(ctx, 'equip')}
        edit={edit}
        ctx={ctx}
        addLabel="備品を追加する"
        empty="まだありません。"
        render={(it) => (
          <div>
            <b>{it.title}</b> <MineBadge it={it} always />
            <p className="line">
              📍 {it.place || '（場所は未登録）'}　／　{it.count ?? 0} 個
            </p>
            {it.body && <p className="line muted">{it.body}</p>}
          </div>
        )}
      />

      <h3 className="sec">組長の輪番（{ctx.pkg.info.houses}軒）</h3>
      <EditableList
        cat="rotation"
        items={of(ctx, 'rotation').sort((a, b) => (a.year ?? 0) - (b.year ?? 0))}
        edit={edit}
        ctx={ctx}
        addLabel="輪番を追加する"
        empty="まだありません。"
        render={(it) => (
          <div className={`rot ${it.year === cur ? 'now' : ''}`}>
            <b>{it.title}</b>
            <span>
              {it.year}年度（{it.year ? reiwa(it.year) : ''}） {it.year === cur && <span className="badge now">今年度の組長</span>}
            </span>
          </div>
        )}
      />
    </div>
  )
}
