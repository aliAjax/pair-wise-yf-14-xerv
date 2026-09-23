import type { Cue, Fixture, Hold, PatrolTicket, ReleaseEntry } from "../types";
import { formatEta, formatTime } from "../utils";

interface Props {
  cues: Cue[];
  fixtures: Fixture[];
  holds: Hold[];
  releases: ReleaseEntry[];
  tickets: PatrolTicket[];
  pointer: number;
  lastFiredCueId: string | null;
  now: number;
  onTrigger: (cueId: string) => void;
}

const HOLD_STATUS: Record<string, { label: string; cls: string }> = {
  extended: { label: "维修延长 · 需重新确认", cls: "danger" },
  waiting: { label: "等待恢复", cls: "warn" },
  recoverable: { label: "故障灯已恢复 · 可直接放行", cls: "ok" },
};

function blockStatus(ticket: PatrolTicket, etaAtHold: number, seenEta: number, now: number) {
  if (ticket.status === "recovered") return "recoverable";
  if (ticket.eta !== etaAtHold || ticket.eta !== seenEta) return "extended";
  if (ticket.eta <= now) return "waiting";
  return "waiting";
}

export default function CueList({
  cues,
  fixtures,
  holds,
  releases,
  tickets,
  pointer,
  lastFiredCueId,
  now,
  onTrigger,
}: Props) {
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
  const ticketById = new Map(tickets.map((t) => [t.id, t]));
  const holdsByCue = new Map(holds.map((h) => [h.cueId, h]));
  const releasesByCue = new Map<
    string,
    ReleaseEntry[]
  >();
  for (const r of releases) {
    const list = releasesByCue.get(r.cueId) ?? [];
    list.push(r);
    releasesByCue.set(r.cueId, list);
  }

  return (
    <div className="cue-list">
      {cues.map((cue, index) => {
        const hold = holdsByCue.get(cue.id);
        const cueReleases = releasesByCue.get(cue.id) ?? [];
        const isNext = index === pointer;
        const fired = lastFiredCueId === cue.id;
        const levels = Object.entries(cue.levels);
        const activeBlockers = levels
          .map(([fid]) => tickets.find((t) => t.fixtureId === fid && t.status === "active"))
          .filter((t): t is PatrolTicket => Boolean(t));

        return (
          <article key={cue.id} className={`cue-card ${hold ? "is-held" : ""} ${fired ? "is-fired" : ""}`}>
            <div className="cue-head">
              <div>
                <span className="cue-order">Q{cue.order}</span>
                <h3>
                  {cue.id} · {cue.name}
                </h3>
                <p className="cue-note">{cue.note}</p>
              </div>
              <div className="cue-side">
                {hold &&
                  Array.from(
                    new Set(
                      hold.blocks.map((b) =>
                        blockStatus(ticketById.get(b.ticketId)!, b.etaAtHold, b.seenEta, now),
                      ),
                    ),
                  ).map((s) => (
                    <span key={s} className={`badge ${HOLD_STATUS[s].cls}`}>
                      {HOLD_STATUS[s].label}
                    </span>
                  ))}
                {isNext && !hold && <span className="badge info">下一个</span>}
                {fired && <span className="badge ok">已触发</span>}
                {cueReleases.length > 0 && (
                  <span className="badge ghost">单次放行 ×{cueReleases.length}</span>
                )}
                <button
                  className={hold ? "warn-btn" : "primary small"}
                  onClick={() => onTrigger(cue.id)}
                >
                  {hold ? "再次判定" : "触发 Cue"}
                </button>
              </div>
            </div>

            <div className="cue-levels">
              {levels.map(([fid, level]) => {
                const f = fixtureById.get(fid);
                const ticket = tickets.find((t) => t.fixtureId === fid && t.status === "active");
                return (
                  <span key={fid} className={`level-chip ${ticket ? "blocked" : ""}`}>
                    {fid}
                    <small>CH{f?.channel}</small>
                    <b>{level}%</b>
                    {ticket && (
                      <em title={ticket.reason}>
                        ⛔ 单{ticket.id}（{formatEta(ticket.eta, now)}，{ticket.technician}）
                      </em>
                    )}
                  </span>
                );
              })}
            </div>

            {hold && (
              <div className="hold-inline">
                <p>停在待确认：本 Cue 涉及以下尚未恢复的灯具（{formatTime(hold.at)} 拦停）</p>
                <ul>
                  {hold.blocks.map((b) => {
                    const t = ticketById.get(b.ticketId);
                    if (!t) return null;
                    const status = blockStatus(t, b.etaAtHold, b.seenEta, now);
                    return (
                      <li key={b.fixtureId} className={`hold-block status-${status}`}>
                        <b>{b.fixtureId}</b>
                        <span>
                          巡台单 {t.id} · {t.technician} · 登记时预计 {formatTime(b.etaAtHold)} 恢复
                        </span>
                        <span className={`badge ${HOLD_STATUS[status].cls}`}>
                          {HOLD_STATUS[status].label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {activeBlockers.length === 0 && levels.length > 0 && (
              <p className="cue-clear">涉及灯具当前均可正常使用</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
