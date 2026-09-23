import type { Fixture, FixtureType, PatrolTicket } from "../types";

interface Props {
  fixtures: Fixture[];
  activeTicketByFixture: Map<string, PatrolTicket>;
  dimmed: Set<string>;
  selectedFixtureId: string | null;
  typeFilter: Set<FixtureType>;
  onPick: (fixtureId: string) => void;
}

const TYPE_COLOR: Record<FixtureType, string> = {
  面光: "#f59e0b",
  侧光: "#06b6d4",
  逆光: "#ef4444",
  效果光: "#7c3aed",
};

export default function StageMap({
  fixtures,
  activeTicketByFixture,
  dimmed,
  selectedFixtureId,
  typeFilter,
  onPick,
}: Props) {
  return (
    <svg className="stage-map" viewBox="0 0 100 100" role="img" aria-label="舞台平面灯位图">
      <defs>
        <pattern id="out-pattern" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#1f2937" opacity="0.55" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#fbbf24" strokeWidth="1.6" />
        </pattern>
      </defs>

      {/* 舞台框 */}
      <rect x="2" y="2" width="96" height="96" rx="3" fill="#0f172a" />
      <text x="50" y="6.4" textAnchor="middle" fontSize="2.4" fill="#94a3b8">
        观众席 · 台口
      </text>
      <line x1="8" y1="20" x2="92" y2="20" stroke="#334155" strokeWidth="0.3" strokeDasharray="1.2 1.2" />
      <text x="50" y="99" textAnchor="middle" fontSize="2.2" fill="#64748b">
        后景 / 天排
      </text>

      {fixtures.map((f) => {
        const ticket = activeTicketByFixture.get(f.id);
        const outOfService = Boolean(ticket);
        const isDimmed = dimmed.has(f.id);
        const selected = selectedFixtureId === f.id;
        const filteredOut = !typeFilter.has(f.type);
        const color = TYPE_COLOR[f.type];

        return (
          <g
            key={f.id}
            className={`stage-fixture ${selected ? "selected" : ""} ${filteredOut ? "filtered-out" : ""}`}
            onClick={() => onPick(f.id)}
            role="button"
            aria-label={`${f.id}${outOfService ? " 暂时不能用" : ""}`}
          >
            <title>{`${f.id} CH${f.channel} · ${f.type} · ${f.gel} · 焦点：${f.focus}${
              ticket ? ` · 巡台单 ${ticket.id}` : ""
            }`}</title>
            {isDimmed && <circle cx={f.x} cy={f.y} r="5.2" fill={color} opacity="0.25" />}
            <circle
              cx={f.x}
              cy={f.y}
              r="3.1"
              fill={outOfService ? "#475569" : color}
              stroke={selected ? "#fde047" : "#e2e8f0"}
              strokeWidth={selected ? 0.9 : 0.4}
            />
            {outOfService && <circle cx={f.x} cy={f.y} r="3.1" fill="url(#out-pattern)" />}
            <text x={f.x} y={f.y + 6.6} textAnchor="middle" fontSize="2.1" fill={outOfService ? "#fca5a5" : "#cbd5e1"}>
              {f.id}
            </text>
            {outOfService && (
              <g>
                <circle cx={f.x + 3.6} cy={f.y - 3.4} r="1.9" fill="#f59e0b" stroke="#0f172a" strokeWidth="0.3" />
                <text x={f.x + 3.6} y={f.y - 2.5} textAnchor="middle" fontSize="2.6" fontWeight="700" fill="#111827">
                  !
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
