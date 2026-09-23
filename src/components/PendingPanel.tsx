import { useState } from "react";
import type { Cue, Fixture, Hold, PatrolTicket, ReleaseEntry } from "../types";
import { formatDateTime, formatEta, formatTime } from "../utils";

interface Props {
  holds: Hold[];
  releases: ReleaseEntry[];
  tickets: PatrolTicket[];
  cues: Cue[];
  fixtures: Fixture[];
  now: number;
  onSign: (holdId: string, by: string) => void;
  onRelease: (holdId: string) => void;
  onRecheck: (holdId: string) => void;
}

type BlockState = "extended" | "waiting" | "signed" | "recoverable";

export function blockState(ticket: PatrolTicket | undefined, etaAtHold: number, seenEta: number): BlockState {
  if (!ticket || ticket.status === "recovered") return "recoverable";
  if (ticket.eta !== etaAtHold && seenEta !== ticket.eta) return "extended";
  if (seenEta !== ticket.eta) return "waiting";
  return "signed";
}

const STATE_TEXT: Record<BlockState, string> = {
  extended: "维修延长 · 旧签字作废，需重新确认",
  waiting: "尚未恢复 · 待值班师傅确认",
  signed: "师傅已按当前恢复时间签字",
  recoverable: "灯已恢复 · 可直接放行",
};

const STATE_CLS: Record<BlockState, string> = {
  extended: "danger",
  waiting: "warn",
  signed: "ok",
  recoverable: "ok",
};

export default function PendingPanel({
  holds,
  releases,
  tickets,
  cues,
  fixtures,
  now,
  onSign,
  onRelease,
  onRecheck,
}: Props) {
  const [signName, setSignName] = useState<Record<string, string>>({});
  const ticketById = new Map(tickets.map((t) => [t.id, t]));
  const cueById = new Map(cues.map((c) => [c.id, c]));
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));

  if (holds.length === 0 && releases.length === 0) {
    return (
      <div className="empty-hint">
        目前没有停在待确认的 Cue。触发 Cue 时若碰到尚未恢复的灯具，会在这里列出灯号与巡台单。
      </div>
    );
  }

  return (
    <div className="pending-wrap">
      {holds.map((hold) => {
        const cue = cueById.get(hold.cueId);
        const states = hold.blocks.map((b) =>
          blockState(ticketById.get(b.ticketId), b.etaAtHold, b.seenEta),
        );
        const needSign = hold.blocks.filter((_, i) => states[i] === "extended" || states[i] === "waiting");
        const ready = needSign.length === 0;
        const name = signName[hold.id] ?? hold.blocks.map((b) => ticketById.get(b.ticketId)?.technician).find(Boolean) ?? "";
        const hasExtended = states.includes("extended");

        return (
          <article key={hold.id} className={`hold-card ${hasExtended ? "has-extended" : ""}`}>
            <header>
              <div>
                <h3>
                  待确认 · {cue?.id} {cue?.name}
                </h3>
                <p>{formatDateTime(hold.at)} 触发拦停 —— 放行仅对这一次有效，下次触发按当时恢复情况重新判断</p>
              </div>
              <span className={`badge ${ready ? "ok" : "warn"}`}>{ready ? "可以放行" : "等待师傅处理"}</span>
            </header>

            <ul className="hold-list">
              {hold.blocks.map((b, i) => {
                const t = ticketById.get(b.ticketId);
                const st = states[i];
                const f = fixtureById.get(b.fixtureId);
                return (
                  <li key={b.fixtureId} className={`hold-row status-${st}`}>
                    <div className="hold-row-main">
                      <b>{b.fixtureId}</b>
                      <span className="muted">
                        CH{f?.channel} · {f?.type} · 巡台单 {b.ticketId} · 值班 {t?.technician ?? "—"}
                      </span>
                      <span className={`badge ${STATE_CLS[st]}`}>{STATE_TEXT[st]}</span>
                    </div>
                    <div className="hold-row-eta">
                      {t && t.status === "active" && (
                        <>
                          <span>登记时预计 {formatTime(b.etaAtHold)}</span>
                          <span className={t.eta !== b.etaAtHold ? "eta-changed" : ""}>
                            现在预计 {formatTime(t.eta)}（{formatEta(t.eta, now)}）
                          </span>
                        </>
                      )}
                      {t?.status === "recovered" && <span>已于 {t.recoveredAt ? formatTime(t.recoveredAt) : "—"} 恢复</span>}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hold-actions">
              <input
                value={name}
                onChange={(e) => setSignName((m) => ({ ...m, [hold.id]: e.target.value }))}
                placeholder="值班师傅姓名"
                className="sign-input"
              />
              <button
                disabled={needSign.length === 0 || !name.trim()}
                onClick={() => {
                  onSign(hold.id, name.trim());
                }}
              >
                签字确认当前恢复时间
              </button>
              <button className="primary" disabled={!ready} onClick={() => onRelease(hold.id)}>
                单次放行本次 Cue
              </button>
              <button onClick={() => onRecheck(hold.id)}>按当前情况重新判定</button>
            </div>
            {hasExtended && (
              <p className="extend-note">⚠ 维修已延长：以上灯号的恢复时间有更新，之前的签字不再有效，请重新确认后再放行。</p>
            )}
          </article>
        );
      })}

      {releases.length > 0 && (
        <div className="release-log">
          <h4>放行留痕（仅当次有效，不继承到下一次触发）</h4>
          {releases
            .slice()
            .reverse()
            .map((r) => (
              <p key={r.id}>
                {formatDateTime(r.at)} · {r.cueId} 单次放行 ·{" "}
                {r.signatures.map((s) => `${s.fixtureId}/${s.by}签于${formatTime(s.eta)}`).join("；")}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
