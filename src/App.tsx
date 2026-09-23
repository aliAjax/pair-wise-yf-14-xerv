import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles.css";
import StageMap from "./components/StageMap";
import CueList from "./components/CueList";
import PendingPanel, { blockState } from "./components/PendingPanel";
import PatrolPanel from "./components/PatrolPanel";
import ScenePreview from "./components/ScenePreview";
import { FIXTURES, INITIAL_CUES } from "./data";
import type { Cue, Hold, HoldBlock, PatrolTicket, PersistState } from "./types";
import { usePersistentState } from "./usePersistentState";

const STORAGE_KEY = "lighting-cue-board-v1";
const TYPES = ["面光", "侧光", "逆光", "效果光"] as const;

function makeInitial(): PersistState {
  const now = Date.now();
  return {
    showName: "《雾中回响》联排 · 版本B",
    note: "2026 秋季联排用。追光入场（CUE-18）需演员走位确认；谢幕面光按 80% 版本B 执行。",
    tickets: [
      {
        id: "PT-001",
        fixtureId: "SL-12",
        createdAt: now - 35 * 60000,
        eta: now + 15 * 60000,
        technician: "周师傅",
        reason: "右钢蓝侧光频闪，开箱检查镇流器",
        status: "active",
        changes: [],
      },
      {
        id: "PT-000",
        fixtureId: "FX-32",
        createdAt: now - 3 * 60 * 60000,
        eta: now - 2 * 60 * 60000,
        technician: "陈师傅",
        reason: "天排染色灯色片脱落，已补装",
        status: "recovered",
        recoveredAt: now - 100 * 60000,
        changes: [],
      },
    ],
    holds: [],
    releases: [],
    lastFiredCueId: null,
    pointer: 0,
  };
}

let ticketSeq = 100;
let holdSeq = 0;

function buildBlocks(cue: Cue, tickets: PatrolTicket[]): HoldBlock[] {
  return Object.keys(cue.levels).flatMap((fid) => {
    // 只要巡台单还是 active，就算“尚未恢复”（到点未恢复同样拦截）
    const ticket = tickets.find((t) => t.fixtureId === fid && t.status === "active");
    if (!ticket) return [];
    return [{ fixtureId: fid, ticketId: ticket.id, etaAtHold: ticket.eta, seenEta: -1 }];
  });
}

/** 用最新巡台单重建拦停块，仍有效的签字（恢复时间没变）保留 */
function mergeBlocks(oldBlocks: HoldBlock[], fresh: HoldBlock[]): HoldBlock[] {
  return fresh.map((b) => {
    const old = oldBlocks.find((o) => o.ticketId === b.ticketId && o.seenEta === b.etaAtHold);
    return old ? { ...b, seenEta: old.seenEta, seenBy: old.seenBy } : b;
  });
}

function App() {
  const [state, setState] = usePersistentState<PersistState>(STORAGE_KEY, makeInitial);
  const [now, setNow] = useState(() => Date.now());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set(TYPES));
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const activeTicketByFixture = useMemo(() => {
    const m = new Map<string, PatrolTicket>();
    state.tickets.filter((t) => t.status === "active").forEach((t) => m.set(t.fixtureId, t));
    return m;
  }, [state.tickets]);

  const unavailableFixtures = useMemo(
    () => new Set(state.tickets.filter((t) => t.status === "active").map((t) => t.fixtureId)),
    [state.tickets],
  );

  const visibleFixtures = useMemo(
    () =>
      FIXTURES.filter((f) =>
        showUnavailableOnly ? unavailableFixtures.has(f.id) : typeFilter.has(f.type),
      ),
    [typeFilter, showUnavailableOnly, unavailableFixtures],
  );

  const dimmedInScene = useMemo(() => {
    // 有待确认时预览被拦停的 Cue，否则预览最近真正上场的 Cue
    const heldCue = state.holds.length > 0 ? INITIAL_CUES.find((c) => c.id === state.holds[0].cueId) : undefined;
    const cue = heldCue ?? INITIAL_CUES.find((c) => c.id === state.lastFiredCueId);
    return new Set(cue ? Object.keys(cue.levels) : []);
  }, [state.holds, state.lastFiredCueId]);

  const heldPreviewCueId = state.holds.length > 0 ? state.holds[0].cueId : null;
  const currentCue =
    INITIAL_CUES.find((c) => c.id === (heldPreviewCueId ?? state.lastFiredCueId)) ?? null;
  const nextCue = INITIAL_CUES[state.pointer] ?? null;

  /** 触发 Cue：碰到尚未恢复的灯先停待确认；已有待确认则按当前恢复情况重新判定 */
  const triggerCue = useCallback(
    (cueId: string) => {
      setState((s) => {
        const cue = INITIAL_CUES.find((c) => c.id === cueId);
        if (!cue) return s;
        const blocks = buildBlocks(cue, s.tickets);
        if (blocks.length === 0) {
          const firedIndex = INITIAL_CUES.findIndex((c) => c.id === cueId);
          return {
            ...s,
            holds: s.holds.filter((h) => h.cueId !== cueId),
            lastFiredCueId: cueId,
            pointer: firedIndex >= s.pointer ? firedIndex + 1 : s.pointer,
          };
        }
        // 已有待确认：按当前巡台单重新判定，仍有效的签字保留
        const existing = s.holds.find((h) => h.cueId === cueId);
        const hold: Hold = {
          id: existing?.id ?? `H-${++holdSeq}-${Date.now()}`,
          cueId,
          at: existing?.at ?? Date.now(),
          blocks: existing ? mergeBlocks(existing.blocks, blocks) : blocks,
        };
        return { ...s, holds: [...s.holds.filter((h) => h.cueId !== cueId), hold] };
      });
    },
    [setState],
  );

  /** 师傅按当前恢复时间签字（逐张单子确认） */
  const signHold = useCallback(
    (holdId: string, by: string) => {
      setState((s) => ({
        ...s,
        holds: s.holds.map((h) =>
          h.id !== holdId
            ? h
            : {
                ...h,
                blocks: h.blocks.map((b) => {
                  const ticket = s.tickets.find((t) => t.id === b.ticketId);
                  const st = blockState(ticket, b.etaAtHold, b.seenEta);
                  // 维修延长后旧签字不能沿用，只有当前仍待签的块才更新
                  if (st !== "extended" && st !== "waiting") return b;
                  return { ...b, seenEta: ticket!.eta, seenBy: by };
                }),
              },
        ),
      }));
    },
    [setState],
  );

  /** 单次放行：只放行这一次，下次触发重新判断 */
  const releaseHold = useCallback(
    (holdId: string) => {
      setState((s) => {
        const hold = s.holds.find((h) => h.id === holdId);
        if (!hold) return s;
        const allReady = hold.blocks.every((b) => {
          const st = blockState(s.tickets.find((t) => t.id === b.ticketId), b.etaAtHold, b.seenEta);
          return st === "signed" || st === "recoverable";
        });
        if (!allReady) return s;
        const release = {
          id: `R-${Date.now()}`,
          cueId: hold.cueId,
          at: Date.now(),
          signatures: hold.blocks
            .filter((b) => b.seenEta !== -1)
            .map((b) => ({
              fixtureId: b.fixtureId,
              ticketId: b.ticketId,
              eta: b.seenEta,
              by: b.seenBy ?? "值班师傅",
            })),
        };
        const firedIndex = INITIAL_CUES.findIndex((c) => c.id === hold.cueId);
        return {
          ...s,
          holds: s.holds.filter((h) => h.id !== holdId),
          releases: [...s.releases, release],
          lastFiredCueId: hold.cueId,
          pointer: firedIndex >= s.pointer ? firedIndex + 1 : s.pointer,
        };
      });
    },
    [setState],
  );

  /** 按当时恢复情况重新判定：灯都恢复了就直接触发，否则刷新拦截信息（旧签字按延长规则失效） */
  const recheckHold = useCallback(
    (holdId: string) => {
      setState((s) => {
        const hold = s.holds.find((h) => h.id === holdId);
        if (!hold) return s;
        const cue = INITIAL_CUES.find((c) => c.id === hold.cueId);
        if (!cue) return s;
        const blocks = buildBlocks(cue, s.tickets);
        if (blocks.length === 0) {
          const firedIndex = INITIAL_CUES.findIndex((c) => c.id === hold.cueId);
          return {
            ...s,
            holds: s.holds.filter((h) => h.id !== holdId),
            lastFiredCueId: hold.cueId,
            pointer: firedIndex >= s.pointer ? firedIndex + 1 : s.pointer,
          };
        }
        return {
          ...s,
          holds: s.holds.map((h) =>
            h.id !== holdId
              ? h
              : {
                  ...h,
                  blocks: mergeBlocks(hold.blocks, blocks),
                },
          ),
        };
      });
    },
    [setState],
  );

  const createTicket = useCallback(
    (data: { fixtureId: string; eta: number; technician: string; reason: string }) => {
      setState((s) => ({
        ...s,
        tickets: [
          ...s.tickets,
          {
            id: `PT-${String(++ticketSeq).padStart(3, "0")}`,
            fixtureId: data.fixtureId,
            createdAt: Date.now(),
            eta: data.eta,
            technician: data.technician,
            reason: data.reason,
            status: "active",
            changes: [],
          },
        ],
      }));
    },
    [setState],
  );

  /** 维修延长：更新恢复时间，待确认 Cue 里对应签字立即失效并提示重新确认 */
  const extendTicket = useCallback(
    (ticketId: string, eta: number, note: string) => {
      setState((s) => ({
        ...s,
        tickets: s.tickets.map((t) =>
          t.id !== ticketId
            ? t
            : { ...t, eta, changes: [...t.changes, { at: Date.now(), eta, note }] },
        ),
      }));
    },
    [setState],
  );

  /** 恢复：若待确认 Cue 拦的灯都恢复了，自动按“恢复”解除并触发 */
  const recoverTicket = useCallback(
    (ticketId: string) => {
      setState((s) => {
        const tickets = s.tickets.map((t) =>
          t.id === ticketId ? { ...t, status: "recovered" as const, recoveredAt: Date.now() } : t,
        );
        let holds = s.holds;
        let { lastFiredCueId, pointer, releases } = s;
        const resolvedCueIds: string[] = [];
        holds = holds.flatMap((h) => {
          const cue = INITIAL_CUES.find((c) => c.id === h.cueId);
          const remaining = cue ? buildBlocks(cue, tickets) : [];
          if (remaining.length === 0) {
            resolvedCueIds.push(h.cueId);
            return [];
          }
          return [{ ...h, blocks: mergeBlocks(h.blocks, remaining) }];
        });
        // 多个待确认同时解除时，按 Cue 顺序触发最后的
        if (resolvedCueIds.length > 0) {
          const lastId = resolvedCueIds[resolvedCueIds.length - 1];
          lastFiredCueId = lastId;
          const idx = INITIAL_CUES.findIndex((c) => c.id === lastId);
          if (idx >= pointer) pointer = idx + 1;
          releases = [
            ...releases,
            {
              id: `R-${Date.now()}`,
              cueId: lastId,
              at: Date.now(),
              signatures: [],
            },
          ];
        }
        return { ...s, tickets, holds, lastFiredCueId, pointer, releases };
      });
    },
    [setState],
  );

  function toggleType(t: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function resetAll() {
    if (!window.confirm("清空全部巡台单、待确认与放行记录，恢复演示数据？")) return;
    ticketSeq = 100;
    setState(makeInitial());
  }

  const heldCueIds = new Set(state.holds.map((h) => h.cueId));

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62002 · 暗场巡台联动版</p>
        <h1>剧场灯光 Cue 表管理</h1>
        <span>
          排练临时停灯检修时发巡台单；触发 Cue 碰到尚未恢复的灯具先停在待确认，师傅单次放行；维修延长后待确认重新显示延迟，旧签字不沿用。舞台图、筛选与场景预览同步标出暂时不能用的灯，记录在本机保留。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>灯具数量</small>
          <strong>{FIXTURES.length}</strong>
        </article>
        <article>
          <small>Cue 数量</small>
          <strong>{INITIAL_CUES.length}</strong>
        </article>
        <article>
          <small>检修中灯具</small>
          <strong className={unavailableFixtures.size > 0 ? "metric-danger" : ""}>
            {unavailableFixtures.size}
          </strong>
        </article>
        <article>
          <small>待确认 Cue</small>
          <strong className={state.holds.length > 0 ? "metric-warn" : ""}>{state.holds.length}</strong>
        </article>
      </section>

      <section className="workspace workspace-3col">
        <aside className="panel">
          <h2>灯具筛选</h2>
          <div className="chips">
            {TYPES.map((t) => (
              <button
                key={t}
                className={typeFilter.has(t) ? "chip-on" : ""}
                onClick={() => toggleType(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showUnavailableOnly}
              onChange={(e) => setShowUnavailableOnly(e.target.checked)}
            />
            <span>只看暂时不能用的灯（{unavailableFixtures.size}）</span>
          </label>
          <p className="muted small">
            带 <b className="text-danger">黄黑条纹 ⛝</b> 标记的为检修中灯具，点击舞台图上的灯可直接发巡台单。
          </p>
          <div className="stage-panel">
            <StageMap
              fixtures={visibleFixtures}
              activeTicketByFixture={activeTicketByFixture}
              dimmed={dimmedInScene}
              selectedFixtureId={selectedFixtureId}
              typeFilter={
                showUnavailableOnly
                  ? new Set(TYPES)
                  : new Set(TYPES.filter((t) => typeFilter.has(t)))
              }
              onPick={(id) => setSelectedFixtureId((cur) => (cur === id ? null : id))}
            />
          </div>
        </aside>

        <section className="panel">
          <div className="heading">
            <div>
              <p>GO 台</p>
              <h2>Cue 触发顺序</h2>
            </div>
            {nextCue ? (
              <button className="primary" onClick={() => triggerCue(nextCue.id)}>
                GO → {nextCue.id}
              </button>
            ) : (
              <button
                onClick={() =>
                  setState((s) => ({ ...s, pointer: 0 }))
                }
              >
                回到首个 Cue
              </button>
            )}
          </div>
          <CueList
            cues={INITIAL_CUES}
            fixtures={FIXTURES}
            holds={state.holds}
            releases={state.releases}
            tickets={state.tickets}
            pointer={state.pointer}
            lastFiredCueId={state.lastFiredCueId}
            now={now}
            onTrigger={triggerCue}
          />
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>当前场景</p>
              <h2>场景预览</h2>
            </div>
          </div>
          <ScenePreview
            cue={currentCue}
            fixtures={FIXTURES}
            tickets={state.tickets}
            held={currentCue ? heldCueIds.has(currentCue.id) : false}
          />
        </section>
      </section>

      <section className="workspace workspace-2col">
        <section className="panel">
          <div className="heading">
            <div>
              <p>暗场流程</p>
              <h2>待确认 / 单次放行</h2>
            </div>
          </div>
          <PendingPanel
            holds={state.holds}
            releases={state.releases}
            tickets={state.tickets}
            cues={INITIAL_CUES}
            fixtures={FIXTURES}
            now={now}
            onSign={signHold}
            onRelease={releaseHold}
            onRecheck={recheckHold}
          />
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>停灯检修</p>
              <h2>巡台单</h2>
            </div>
          </div>
          <PatrolPanel
            tickets={state.tickets}
            fixtures={FIXTURES}
            now={now}
            selectedFixtureId={selectedFixtureId}
            onSelectFixture={setSelectedFixtureId}
            onCreate={createTicket}
            onExtend={extendTicket}
            onRecover={recoverTicket}
          />
        </section>
      </section>

      <section className="panel version-panel">
        <div className="heading">
          <div>
            <p>演出版本</p>
            <h2>演出名称与备注</h2>
          </div>
          <button onClick={resetAll}>重置演示数据</button>
        </div>
        <label>
          <span>演出名称</span>
          <input value={state.showName} onChange={(e) => setState((s) => ({ ...s, showName: e.target.value }))} />
        </label>
        <label>
          <span>版本备注</span>
          <textarea
            rows={3}
            value={state.note}
            onChange={(e) => setState((s) => ({ ...s, note: e.target.value }))}
          />
        </label>
      </section>
    </main>
  );
}

export default App;
