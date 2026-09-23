import { useMemo, useState } from "react";
import type { Fixture, PatrolTicket } from "../types";
import { formatDateTime, formatEta, formatEtaInput } from "../utils";

interface Props {
  tickets: PatrolTicket[];
  fixtures: Fixture[];
  now: number;
  selectedFixtureId: string | null;
  onSelectFixture: (id: string | null) => void;
  onCreate: (data: { fixtureId: string; eta: number; technician: string; reason: string }) => void;
  onExtend: (ticketId: string, eta: number, note: string) => void;
  onRecover: (ticketId: string) => void;
}

export default function PatrolPanel({
  tickets,
  fixtures,
  now,
  selectedFixtureId,
  onSelectFixture,
  onCreate,
  onExtend,
  onRecover,
}: Props) {
  const defaultEta = useMemo(() => formatEtaInput(now + 20 * 60000), []);
  const [fixtureId, setFixtureId] = useState("");
  const [eta, setEta] = useState(defaultEta);
  const [technician, setTechnician] = useState("");
  const [reason, setReason] = useState("");

  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [newEta, setNewEta] = useState("");
  const [extendNote, setExtendNote] = useState("");

  const effectiveFixtureId = selectedFixtureId ?? fixtureId;
  const alreadyActive = tickets.find((t) => t.fixtureId === effectiveFixtureId && t.status === "active");

  function submit() {
    if (!effectiveFixtureId || !technician.trim() || !eta) return;
    onCreate({
      fixtureId: effectiveFixtureId,
      eta: new Date(eta).getTime(),
      technician: technician.trim(),
      reason: reason.trim() || "暗场巡台检修",
    });
    setReason("");
    onSelectFixture(null);
  }

  function startExtend(t: PatrolTicket) {
    setExtendingId(t.id);
    setNewEta(formatEtaInput(t.eta + 15 * 60000));
    setExtendNote("");
  }

  function submitExtend(ticketId: string) {
    if (!newEta) return;
    onExtend(ticketId, new Date(newEta).getTime(), extendNote.trim());
    setExtendingId(null);
  }

  const active = tickets.filter((t) => t.status === "active");
  const history = tickets.filter((t) => t.status === "recovered");

  return (
    <div className="patrol-wrap">
      <form
        className="patrol-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3>暗场发巡台单</h3>
        <label>
          <span>灯具（也可直接点舞台图选择）</span>
          <select
            value={effectiveFixtureId}
            onChange={(e) => {
              onSelectFixture(null);
              setFixtureId(e.target.value);
            }}
          >
            <option value="">选择灯具编号…</option>
            {fixtures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id}（CH{f.channel} · {f.type} · {f.focus}）
              </option>
            ))}
          </select>
        </label>
        {alreadyActive && <p className="extend-note">该灯已有未恢复的巡台单 {alreadyActive.id}，重复发单前请先恢复或延长原单。</p>}
        <div className="form-row">
          <label>
            <span>预计恢复时间</span>
            <input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
          </label>
          <label>
            <span>值班师傅</span>
            <input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="如：周师傅" />
          </label>
        </div>
        <label>
          <span>故障情况</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：灯泡闪烁，开箱检修" />
        </label>
        <button className="primary" type="submit" disabled={!effectiveFixtureId || !technician.trim() || Boolean(alreadyActive)}>
          发出巡台单
        </button>
      </form>

      <div className="ticket-section">
        <h3>
          检修中 <span className="count">{active.length}</span>
        </h3>
        {active.length === 0 && <p className="muted">当前没有检修中的灯具。</p>}
        {active.map((t) => {
          const f = fixtures.find((x) => x.id === t.fixtureId);
          const extended = t.changes.length > 0;
          return (
            <article key={t.id} className={`ticket-card ${extended ? "extended" : ""}`}>
              <header>
                <b>{t.fixtureId}</b>
                <span className="muted">
                  CH{f?.channel} · 单 {t.id}
                </span>
                <span className="badge danger">不能用</span>
              </header>
              <p className="ticket-reason">{t.reason}</p>
              <p className="ticket-meta">
                值班 <b>{t.technician}</b> · {formatDateTime(t.createdAt)} 发单
              </p>
              <p className="ticket-eta">
                预计 {formatDateTime(t.eta)} 恢复 · {formatEta(t.eta, now)}
              </p>
              {extended && (
                <ul className="change-log">
                  {t.changes.map((c, i) => (
                    <li key={i}>
                      {formatDateTime(c.at)} 延长至 {formatDateTime(c.eta)}
                      {c.note ? `（${c.note}）` : ""} —— 待确认 Cue 的旧签字已作废
                    </li>
                  ))}
                </ul>
              )}

              {extendingId === t.id ? (
                <div className="extend-form">
                  <input
                    type="datetime-local"
                    value={newEta}
                    onChange={(e) => setNewEta(e.target.value)}
                  />
                  <input
                    value={extendNote}
                    onChange={(e) => setExtendNote(e.target.value)}
                    placeholder="延长原因（如：配件需更换）"
                  />
                  <button className="warn-btn" onClick={() => submitExtend(t.id)}>
                    确认延长
                  </button>
                  <button onClick={() => setExtendingId(null)}>取消</button>
                </div>
              ) : (
                <div className="ticket-actions">
                  <button className="warn-btn" onClick={() => startExtend(t)}>
                    维修延长
                  </button>
                  <button className="ok-btn" onClick={() => onRecover(t.id)}>
                    已恢复
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="ticket-section">
          <h3>已恢复存档</h3>
          {history
            .slice()
            .reverse()
            .map((t) => (
              <p key={t.id} className="history-line">
                <b>{t.fixtureId}</b> · 单 {t.id} · {t.technician} · {formatDateTime(t.createdAt)} 发单 →{" "}
                {t.recoveredAt ? formatDateTime(t.recoveredAt) : "—"} 恢复
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
