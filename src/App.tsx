import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import "./styles.css";
import { downFixtureIds, loadState, reducer, saveState } from "./store";
import type { Action } from "./store";
import type { Fixture, LogEntry, PatrolTicket } from "./types";
import { fmtClock } from "./format";
import MetricsBar from "./components/MetricsBar";
import StageMap from "./components/StageMap";
import ScenePreview from "./components/ScenePreview";
import ShowInfo from "./components/ShowInfo";
import FixturePanel, { type CategoryFilter } from "./components/FixturePanel";
import CuePanel from "./components/CuePanel";
import PendingQueue from "./components/PendingQueue";
import TicketsPanel from "./components/TicketsPanel";

const PROJECT_ID = "hxyfront-62002";

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [now, setNow] = useState(() => Date.now());
  const [catFilter, setCatFilter] = useState<CategoryFilter>("全部");
  const [onlyDown, setOnlyDown] = useState(false);
  const [ticketFixtureId, setTicketFixtureId] = useState<string | null>(null);
  const ticketsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeTickets = useMemo(() => {
    const map = new Map<string, PatrolTicket>();
    for (const t of state.tickets) if (t.status === "active") map.set(t.fixtureId, t);
    return map;
  }, [state.tickets]);

  const down = useMemo(() => downFixtureIds(state.tickets), [state.tickets]);

  const matches = (f: Fixture) =>
    (catFilter === "全部" || f.category === catFilter) && (!onlyDown || down.has(f.id));

  const filteredFixtures = state.fixtures.filter(matches);
  const pendingCueIds = useMemo(() => new Set(state.pending.map((p) => p.cueId)), [state.pending]);

  const sceneCue = state.scene ? state.cues.find((c) => c.id === state.scene!.cueId) : undefined;
  const fixtureOf = (id: string) => state.fixtures.find((f) => f.id === id);

  const pickFixtureForTicket = (id: string) => {
    setTicketFixtureId(id);
    ticketsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const act = (a: Action) => dispatch(a);

  return (
    <main className="app">
      <section className="hero">
        <p>{PROJECT_ID} · Port 62002 · {state.showName}</p>
        <h1>剧场灯光 Cue 表管理</h1>
        <span>
          暗场可发巡台单登记检修灯具、预计恢复时间与值班师傅；触发 Cue 触及未恢复灯具时先停在待确认，
          师傅签字后仅放行本次，工单延长则旧签字自动作废。舞台图、筛选与场景预览均会标出暂时不能用的灯。
        </span>
      </section>

      <MetricsBar
        fixtureCount={state.fixtures.length}
        downCount={down.size}
        cueCount={state.cues.length}
        sceneLabel={sceneCue ? sceneCue.label : "暗场"}
        pendingCount={state.pending.length}
      />

      <PendingQueue
        state={state}
        now={now}
        onSign={(id, signedBy) => act({ type: "signPending", pendingId: id, signedBy })}
        onRelease={(id) => act({ type: "releasePending", pendingId: id })}
        onExecute={(id) => act({ type: "executePending", pendingId: id })}
        onDismiss={(id) => act({ type: "dismissPending", pendingId: id })}
      />

      <section className="stage-row">
        <StageMap
          fixtures={state.fixtures}
          activeTickets={activeTickets}
          matches={matches}
          selectedId={ticketFixtureId}
          onSelect={pickFixtureForTicket}
        />
        <div className="side-col">
          <ScenePreview
            scene={state.scene}
            cue={sceneCue}
            fixtureOf={fixtureOf}
            activeTickets={activeTickets}
            onClear={() => act({ type: "clearScene" })}
          />
          <ShowInfo
            showName={state.showName}
            versionNote={state.versionNote}
            onSave={(showName, versionNote) => act({ type: "updateShow", showName, versionNote })}
          />
        </div>
      </section>

      <section className="data-row">
        <FixturePanel
          fixtures={filteredFixtures}
          activeTickets={activeTickets}
          catFilter={catFilter}
          onlyDown={onlyDown}
          onCatFilter={setCatFilter}
          onOnlyDown={setOnlyDown}
          onPick={pickFixtureForTicket}
          onAdd={(fixture) => act({ type: "addFixture", fixture })}
        />
        <CuePanel
          cues={state.cues}
          fixtures={state.fixtures}
          activeTickets={activeTickets}
          pendingCueIds={pendingCueIds}
          scene={state.scene}
          onTrigger={(cueId) => act({ type: "triggerCue", cueId })}
          onAdd={(name, note, version, fixtureIds) => act({ type: "addCue", name, note, version, fixtureIds })}
        />
      </section>

      <div ref={ticketsRef}>
        <TicketsPanel
          state={state}
          now={now}
          selectedFixtureId={ticketFixtureId}
          onSelectFixture={setTicketFixtureId}
          onCreate={(fixtureId, eta, technician, reason) => {
            act({ type: "createTicket", fixtureId, eta, technician, reason });
            setTicketFixtureId(null);
          }}
          onExtend={(ticketId, newEta, by) => act({ type: "extendTicket", ticketId, newEta, by })}
          onRecover={(ticketId) => act({ type: "recoverTicket", ticketId })}
        />
      </div>

      <section className="panel">
        <div className="heading">
          <div>
            <p>历史记录</p>
            <h2>近期工作台</h2>
          </div>
        </div>
        <ul className="log-list">
          {state.log.map((entry: LogEntry, i: number) => (
            <li key={`${entry.at}-${i}`}>
              <i className={`log-dot ${entry.tone}`} />
              <time>{fmtClock(entry.at)}</time>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
