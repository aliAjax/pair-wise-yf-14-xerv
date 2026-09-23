import type { Fixture, FixtureCategory, PatrolTicket } from "../types";

export const CATEGORY_COLORS: Record<FixtureCategory, string> = {
  面光: "#f59e0b",
  侧光: "#06b6d4",
  逆光: "#7c3aed",
  效果光: "#db2777",
};

interface Props {
  fixtures: Fixture[];
  activeTickets: Map<string, PatrolTicket>;
  matches: (f: Fixture) => boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** 舞台平面灯位图：上为天幕/后区，台下为台口与观众席面光桥 */
export default function StageMap({ fixtures, activeTickets, matches, selectedId, onSelect }: Props) {
  return (
    <section className="panel stage-panel">
      <div className="heading">
        <div>
          <p>舞台平面图</p>
          <h2>灯位图</h2>
        </div>
        <span className="hint">点击灯具可发巡台单</span>
      </div>
      <svg viewBox="0 0 100 134" className="stage-map" role="img" aria-label="舞台灯位图">
        {/* 观众席 · 面光桥 */}
        <rect x="3" y="106" width="94" height="24" rx="2" className="foh-zone" />
        <text x="50" y="124" textAnchor="middle" className="map-label">
          观众席 · 面光桥
        </text>
        {/* 舞台 */}
        <rect x="3" y="4" width="94" height="96" rx="2" className="stage-box" />
        <text x="50" y="11" textAnchor="middle" className="map-label">
          天幕 / 后区
        </text>
        <text x="50" y="96" textAnchor="middle" className="map-label">
          台口
        </text>
        {/* 台口线 */}
        <line x1="3" y1="103" x2="97" y2="103" className="apron-line" />
        {fixtures.map((f) => {
          const ticket = activeTickets.get(f.id);
          const dim = !matches(f);
          return (
            <g
              key={f.id}
              className={`fixture-dot${dim ? " dim" : ""}`}
              onClick={() => onSelect(f.id)}
            >
              <title>
                {f.code} · {f.category} · {f.channel}
                {ticket ? ` · 检修中（${ticket.technician}）` : ""}
              </title>
              {ticket && <circle cx={f.x} cy={f.y} r="5.4" className="down-ring" />}
              {selectedId === f.id && <circle cx={f.x} cy={f.y} r="4.6" className="select-ring" />}
              <circle cx={f.x} cy={f.y} r="3.2" fill={CATEGORY_COLORS[f.category]} />
              {ticket && (
                <text x={f.x} y={f.y - 6.6} textAnchor="middle" className="down-flag">
                  检
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {(Object.keys(CATEGORY_COLORS) as FixtureCategory[]).map((c) => (
          <span key={c}>
            <i style={{ background: CATEGORY_COLORS[c] }} />
            {c}
          </span>
        ))}
        <span>
          <i className="legend-down" />
          检修中
        </span>
      </div>
    </section>
  );
}
