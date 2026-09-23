import { useState } from "react";
import type { Cue, Fixture, PatrolTicket, SceneState } from "../types";

interface Props {
  cues: Cue[];
  fixtures: Fixture[];
  activeTickets: Map<string, PatrolTicket>;
  pendingCueIds: Set<string>;
  scene: SceneState | null;
  onTrigger: (cueId: string) => void;
  onAdd: (name: string, note: string, version: string, fixtureIds: string[]) => void;
}

/** Cue 列表 + 新增 Cue */
export default function CuePanel({ cues, fixtures, activeTickets, pendingCueIds, scene, onTrigger, onAdd }: Props) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [version, setVersion] = useState("版本A");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    if (!name.trim() || picked.size === 0) return;
    onAdd(name, note, version, Array.from(picked));
    setName("");
    setNote("");
    setPicked(new Set());
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>触发顺序</p>
          <h2>Cue 列表</h2>
        </div>
      </div>
      <div className="cue-list">
        {cues.map((cue) => {
          const isPending = pendingCueIds.has(cue.id);
          const isLive = scene?.cueId === cue.id;
          const downCount = cue.fixtureIds.filter((id) => activeTickets.has(id)).length;
          return (
            <article key={cue.id} className={isPending ? "cue-row blocked" : "cue-row"}>
              <div className="cue-main">
                <strong>{cue.label}</strong>
                <span>{cue.name}</span>
                {isLive && <span className="badge ok">当前场景</span>}
                {downCount > 0 && <span className="badge danger">{downCount} 盏检修中</span>}
              </div>
              <p>
                {cue.note} · {cue.version} · 灯具 {cue.fixtureIds.length} 盏
              </p>
              <button
                className={isPending ? "mini" : "mini primary-outline"}
                disabled={isPending}
                onClick={() => onTrigger(cue.id)}
                title={isPending ? "该 Cue 已在待确认队列" : downCount > 0 ? "将触及检修灯具，触发后转入待确认" : "立即触发"}
              >
                {isPending ? "待确认中" : "触发"}
              </button>
            </article>
          );
        })}
      </div>

      <details className="add-box">
        <summary>新增 Cue</summary>
        <div className="field-grid">
          <label>
            <span>场景名称</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 冷蓝侧光" />
          </label>
          <label>
            <span>演出版本</span>
            <input value={version} onChange={(e) => setVersion(e.target.value)} />
          </label>
        </div>
        <label>
          <span>备注</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如 二幕开场" />
        </label>
        <div className="pick-fixtures">
          <span>选择灯具</span>
          <div className="chips">
            {fixtures.map((f) => (
              <button
                key={f.id}
                type="button"
                className={picked.has(f.id) ? "chip active" : "chip"}
                onClick={() => togglePick(f.id)}
              >
                {f.code}
              </button>
            ))}
          </div>
        </div>
        <button className="primary" onClick={submit} disabled={!name.trim() || picked.size === 0}>
          保存 Cue
        </button>
      </details>
    </section>
  );
}
