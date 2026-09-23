import { useState } from "react";
import type { AppState, PendingCue } from "../types";
import { activeBlocksOf, cueById, fixtureById } from "../store";
import { fmtClock, fmtRemain } from "../format";

interface Props {
  state: AppState;
  now: number;
  onSign: (pendingId: string, signedBy: string) => void;
  onRelease: (pendingId: string) => void;
  onExecute: (pendingId: string) => void;
  onDismiss: (pendingId: string) => void;
}

/** 待确认队列：触发时触及未恢复灯具的 Cue 在此等候师傅处理 */
export default function PendingQueue({ state, now, onSign, onRelease, onExecute, onDismiss }: Props) {
  return (
    <section className="panel pending-panel">
      <div className="heading">
        <div>
          <p>检修拦截</p>
          <h2>待确认 Cue（{state.pending.length}）</h2>
        </div>
        <span className="hint">放行仅对本次触发有效，下次按当时恢复情况重新判断</span>
      </div>
      {state.pending.length === 0 ? (
        <p className="empty">暂无被检修灯具拦下的 Cue</p>
      ) : (
        <div className="pending-list">
          {state.pending.map((p) => (
            <PendingItem
              key={p.id}
              p={p}
              state={state}
              now={now}
              onSign={onSign}
              onRelease={onRelease}
              onExecute={onExecute}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PendingItem({
  p,
  state,
  now,
  onSign,
  onRelease,
  onExecute,
  onDismiss,
}: {
  p: PendingCue;
  state: AppState;
  now: number;
  onSign: (pendingId: string, signedBy: string) => void;
  onRelease: (pendingId: string) => void;
  onExecute: (pendingId: string) => void;
  onDismiss: (pendingId: string) => void;
}) {
  const cue = cueById(state, p.cueId);
  const activeBlocks = activeBlocksOf(state, p);
  const allRecovered = activeBlocks.length === 0;
  const firstTicket = activeBlocks[0]
    ? state.tickets.find((t) => t.id === activeBlocks[0].ticketId)
    : undefined;
  const [signer, setSigner] = useState("");

  return (
    <article className={`pending-item${p.status === "signed" ? " signed" : ""}`}>
      <div className="pending-head">
        <strong>
          {cue?.label ?? "?"} · {cue?.name ?? "未知场景"}
        </strong>
        <span className="hint">触发于 {fmtClock(p.createdAt)}</span>
        {p.status === "signed" ? (
          <span className="badge ok">已签字 · 待放行</span>
        ) : (
          <span className="badge warn">待确认</span>
        )}
      </div>

      {p.invalidated && p.status === "pending" && (
        <p className="banner danger">维修已延长，旧签字作废，请师傅按新的恢复时间重新签字。</p>
      )}

      <ul className="block-list">
        {p.blocks.map((b) => {
          const f = fixtureById(state, b.fixtureId);
          const t = state.tickets.find((tk) => tk.id === b.ticketId);
          if (!t) return null;
          const recovered = t.status !== "active";
          const overdue = !recovered && now > t.eta;
          return (
            <li key={b.ticketId} className={recovered ? "block recovered" : "block"}>
              <span className="block-name">
                {f?.code ?? b.fixtureId}
                <em>巡台单 {t.id}</em>
              </span>
              <span className="block-info">
                {t.technician} · {t.reason}
              </span>
              {recovered ? (
                <span className="badge ok">已恢复 {t.recoveredAt ? fmtClock(t.recoveredAt) : ""}</span>
              ) : (
                <span className={overdue ? "badge danger" : "badge warn"}>
                  {overdue ? `已超时 ${fmtRemain(now - t.eta)}` : `预计还需 ${fmtRemain(t.eta - now)}`}
                  {t.extensions.length > 0 && ` · 已延长×${t.extensions.length}`}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {allRecovered ? (
        <div className="pending-actions">
          <span className="badge ok">灯具已全部恢复</span>
          <button className="primary" onClick={() => onExecute(p.id)}>
            执行此 Cue
          </button>
          <button className="mini" onClick={() => onDismiss(p.id)}>
            取消触发
          </button>
        </div>
      ) : p.status === "pending" ? (
        <div className="pending-actions">
          <input
            className="signer-input"
            value={signer}
            onChange={(e) => setSigner(e.target.value)}
            placeholder={firstTicket ? `签字人（默认 ${firstTicket.technician}）` : "签字人"}
          />
          <button
            className="primary"
            onClick={() => onSign(p.id, signer.trim() || firstTicket?.technician || "值班师傅")}
          >
            师傅签字
          </button>
          <button className="mini" onClick={() => onDismiss(p.id)}>
            取消触发
          </button>
        </div>
      ) : (
        <div className="pending-actions">
          <span className="hint">
            {p.signedBy} 签于 {p.signedAt ? fmtClock(p.signedAt) : ""}
          </span>
          <button className="primary release" onClick={() => onRelease(p.id)}>
            放行这一次
          </button>
          <button className="mini" onClick={() => onDismiss(p.id)}>
            取消触发
          </button>
        </div>
      )}
    </article>
  );
}
