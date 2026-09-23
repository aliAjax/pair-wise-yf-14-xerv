import { useState } from "react";
import type { AppState, PatrolTicket } from "../types";
import { fixtureById } from "../store";
import { fmtClock, fmtDateTime, fmtRemain, toLocalInputValue } from "../format";

interface Props {
  state: AppState;
  now: number;
  selectedFixtureId: string | null;
  onSelectFixture: (id: string) => void;
  onCreate: (fixtureId: string, eta: number, technician: string, reason: string) => void;
  onExtend: (ticketId: string, newEta: number, by: string) => void;
  onRecover: (ticketId: string) => void;
}

const MIN = 60_000;

/** 巡台单：暗场发单登记检修，跟踪预计恢复时间与值班师傅 */
export default function TicketsPanel({
  state,
  now,
  selectedFixtureId,
  onSelectFixture,
  onCreate,
  onExtend,
  onRecover,
}: Props) {
  const [eta, setEta] = useState(() => toLocalInputValue(now + 30 * MIN));
  const [technician, setTechnician] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const active = state.tickets.filter((t) => t.status === "active");
  const recovered = state.tickets.filter((t) => t.status === "recovered");
  const available = state.fixtures.filter((f) => !active.some((t) => t.fixtureId === f.id));
  const selectedBusy =
    selectedFixtureId !== null && !available.some((f) => f.id === selectedFixtureId);

  const bump = (mins: number) => setEta(toLocalInputValue(Date.now() + mins * MIN));

  const submit = () => {
    if (!selectedFixtureId) {
      setError("请先选择要检修的灯具");
      return;
    }
    const etaTs = new Date(eta).getTime();
    if (!Number.isFinite(etaTs) || etaTs <= Date.now()) {
      setError("预计恢复时间需晚于当前时间");
      return;
    }
    onCreate(selectedFixtureId, etaTs, technician, reason);
    setReason("");
    setError("");
    setEta(toLocalInputValue(Date.now() + 30 * MIN));
  };

  return (
    <section className="panel tickets-panel">
      <div className="heading">
        <div>
          <p>暗场检修</p>
          <h2>巡台单</h2>
        </div>
        <span className="hint">页面重开后记录仍在</span>
      </div>

      <div className="ticket-grid">
        <div className="ticket-form">
          <h3>发巡台单</h3>
          <label>
            <span>灯具（仅列未在检修的）</span>
            <select value={selectedFixtureId ?? ""} onChange={(e) => onSelectFixture(e.target.value)}>
              <option value="" disabled>
                选择灯具
              </option>
              {available.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} · {f.category} · {f.focus}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>预计恢复时间</span>
            <input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
          </label>
          <div className="chips">
            <button type="button" className="chip" onClick={() => bump(15)}>
              +15分
            </button>
            <button type="button" className="chip" onClick={() => bump(30)}>
              +30分
            </button>
            <button type="button" className="chip" onClick={() => bump(60)}>
              +60分
            </button>
          </div>
          <label>
            <span>值班师傅</span>
            <input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="如 王师傅" />
          </label>
          <label>
            <span>检修原因</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如 灯珠闪烁，更换光源" />
          </label>
          {selectedBusy && <p className="banner danger">该灯具已有进行中的巡台单，请先完成或恢复它。</p>}
          {error && <p className="banner danger">{error}</p>}
          <button className="primary" onClick={submit} disabled={!selectedFixtureId || selectedBusy}>
            发巡台单
          </button>
        </div>

        <div className="ticket-active">
          <h3>进行中（{active.length}）</h3>
          {active.length === 0 && <p className="empty">当前没有检修中的灯具</p>}
          {active.map((t) => (
            <ActiveTicketRow key={t.id} t={t} state={state} now={now} onExtend={onExtend} onRecover={onRecover} />
          ))}
          {recovered.length > 0 && (
            <>
              <h3 className="history-title">已恢复记录</h3>
              <ul className="ticket-history">
                {recovered.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <span className="badge ok">已恢复</span>
                    {t.id} · {fixtureById(state, t.fixtureId)?.code} · {t.technician} · 恢复于{" "}
                    {t.recoveredAt ? fmtDateTime(t.recoveredAt) : "—"}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ActiveTicketRow({
  t,
  state,
  now,
  onExtend,
  onRecover,
}: {
  t: PatrolTicket;
  state: AppState;
  now: number;
  onExtend: (ticketId: string, newEta: number, by: string) => void;
  onRecover: (ticketId: string) => void;
}) {
  const [extending, setExtending] = useState(false);
  const [eta, setEta] = useState(() => toLocalInputValue(t.eta + 30 * MIN));
  const [by, setBy] = useState(t.technician);
  const [error, setError] = useState("");

  const fixture = fixtureById(state, t.fixtureId);
  const overdue = now > t.eta;

  const confirmExtend = () => {
    const ts = new Date(eta).getTime();
    if (!Number.isFinite(ts) || ts <= t.eta || ts <= Date.now()) {
      setError("延长后的时间需晚于原预计时间与当前时间");
      return;
    }
    onExtend(t.id, ts, by);
    setExtending(false);
    setError("");
  };

  return (
    <article className="ticket-row">
      <div className="ticket-head">
        <strong>{t.id}</strong>
        <span className="tag">{fixture?.code}</span>
        {t.extensions.length > 0 && <span className="badge warn">已延长×{t.extensions.length}</span>}
        <span className={overdue ? "badge danger" : "badge warn"}>
          {overdue ? `已超时 ${fmtRemain(now - t.eta)}` : `剩余 ${fmtRemain(t.eta - now)}`}
        </span>
      </div>
      <p>
        {t.reason} · 值班 {t.technician} · 发单 {fmtClock(t.createdAt)} · 预计 {fmtDateTime(t.eta)} 恢复
      </p>
      {extending ? (
        <div className="extend-box">
          <label>
            <span>新的预计恢复时间</span>
            <input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
          </label>
          <label>
            <span>登记人</span>
            <input value={by} onChange={(e) => setBy(e.target.value)} />
          </label>
          {error && <p className="banner danger">{error}</p>}
          <div className="chips">
            <button className="chip active" onClick={confirmExtend}>
              确认延长
            </button>
            <button className="chip" onClick={() => setExtending(false)}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="chips">
          <button
            className="chip"
            onClick={() => {
              setEta(toLocalInputValue(Math.max(t.eta, Date.now()) + 30 * MIN));
              setExtending(true);
            }}
          >
            维修延长
          </button>
          <button className="chip" onClick={() => onRecover(t.id)}>
            标记已恢复
          </button>
        </div>
      )}
    </article>
  );
}
