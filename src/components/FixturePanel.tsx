import { useState } from "react";
import type { Fixture, FixtureCategory, PatrolTicket } from "../types";

const CATEGORIES: FixtureCategory[] = ["面光", "侧光", "逆光", "效果光"];
export type CategoryFilter = "全部" | FixtureCategory;

interface Props {
  fixtures: Fixture[];
  activeTickets: Map<string, PatrolTicket>;
  catFilter: CategoryFilter;
  onlyDown: boolean;
  onCatFilter: (c: CategoryFilter) => void;
  onOnlyDown: (v: boolean) => void;
  onPick: (fixtureId: string) => void;
  onAdd: (fixture: Omit<Fixture, "id" | "x" | "y">) => void;
}

/** 灯具筛选 + 灯位清单 + 新增灯具 */
export default function FixturePanel({
  fixtures,
  activeTickets,
  catFilter,
  onlyDown,
  onCatFilter,
  onOnlyDown,
  onPick,
  onAdd,
}: Props) {
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState("");
  const [gel, setGel] = useState("");
  const [focus, setFocus] = useState("");
  const [intensity, setIntensity] = useState("75");
  const [category, setCategory] = useState<FixtureCategory>("面光");

  const submit = () => {
    if (!code.trim()) return;
    onAdd({
      code: code.trim(),
      channel: channel.trim() || "CH —",
      gel: gel.trim() || "无",
      focus: focus.trim() || "待定",
      intensity: Math.max(0, Math.min(100, Number(intensity) || 0)),
      category,
    });
    setCode("");
    setChannel("");
    setGel("");
    setFocus("");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>灯位清单</p>
          <h2>灯具筛选</h2>
        </div>
      </div>
      <div className="chips">
        {(["全部", ...CATEGORIES] as CategoryFilter[]).map((c) => (
          <button key={c} className={catFilter === c ? "chip active" : "chip"} onClick={() => onCatFilter(c)}>
            {c}
          </button>
        ))}
        <label className="down-toggle">
          <input type="checkbox" checked={onlyDown} onChange={(e) => onOnlyDown(e.target.checked)} />
          仅看检修中
        </label>
      </div>

      <div className="fixture-list">
        {fixtures.length === 0 && <p className="empty">没有符合筛选条件的灯具</p>}
        {fixtures.map((f) => {
          const t = activeTickets.get(f.id);
          return (
            <article key={f.id} className={t ? "fixture-row down" : "fixture-row"}>
              <div className="fixture-main">
                <strong>{f.code}</strong>
                <span className="tag">{f.category}</span>
                {t && <span className="badge danger">检修中 · {t.technician}</span>}
              </div>
              <p>
                {f.channel} · {f.gel} · 焦点 {f.focus} · 亮度 {f.intensity}%
              </p>
              <button className="mini" disabled={!!t} onClick={() => onPick(f.id)}>
                {t ? "已在检修" : "发巡台单"}
              </button>
            </article>
          );
        })}
      </div>

      <details className="add-box">
        <summary>新增灯具</summary>
        <div className="field-grid">
          <label>
            <span>灯具编号</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="如 FOH-04" />
          </label>
          <label>
            <span>通道号</span>
            <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="如 CH 004" />
          </label>
          <label>
            <span>色片</span>
            <input value={gel} onChange={(e) => setGel(e.target.value)} placeholder="如 R02 淡琥珀" />
          </label>
          <label>
            <span>焦点位置</span>
            <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="如 台口中区" />
          </label>
          <label>
            <span>亮度预设（%）</span>
            <input type="number" min={0} max={100} value={intensity} onChange={(e) => setIntensity(e.target.value)} />
          </label>
          <label>
            <span>光位类别</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as FixtureCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <button className="primary" onClick={submit} disabled={!code.trim()}>
          保存灯具
        </button>
      </details>
    </section>
  );
}
