import type { Cue, Fixture, PatrolTicket } from "../types";

interface Props {
  cue: Cue | null;
  fixtures: Fixture[];
  tickets: PatrolTicket[];
  held: boolean;
}

export default function ScenePreview({ cue, fixtures, tickets, held }: Props) {
  const activeTicketByFixture = new Map(
    tickets.filter((t) => t.status === "active").map((t) => [t.fixtureId, t]),
  );
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));

  const entries = cue
    ? Object.entries(cue.levels)
        .map(([fid, level]) => ({ fixture: fixtureById.get(fid)!, level, ticket: activeTicketByFixture.get(fid) }))
        .filter((e) => e.fixture)
    : [];

  return (
    <div className={`scene-preview ${held ? "is-held" : ""}`}>
      <div className="stage-glow">
        {entries.map(({ fixture, level, ticket }) => (
          <div
            key={fixture.id}
            className={`glow-light ${ticket ? "out" : ""}`}
            style={{
              left: `${fixture.x}%`,
              top: `${fixture.y}%`,
              opacity: ticket ? 0.12 : Math.max(0.12, level / 100),
              boxShadow: ticket ? "none" : `0 0 ${Math.max(10, level / 3)}px ${Math.max(6, level / 5)}px rgba(253, 224, 77, 0.85)`,
            }}
            title={ticket ? `${fixture.id} 暂时不能用（单 ${ticket.id}）` : `${fixture.id} ${level}%`}
          />
        ))}
        <span className="stage-label">{cue ? `${cue.id} ${cue.name}` : "尚未触发任何 Cue"}</span>
        {held && <span className="stage-held-tag">⛔ 待确认，未真正上场</span>}
      </div>

      {cue && (
        <div className="preview-levels">
          {entries.map(({ fixture, level, ticket }) => (
            <div key={fixture.id} className={`preview-row ${ticket ? "out" : ""}`}>
              <span className="preview-id">{fixture.id}</span>
              <div className="preview-bar">
                <i style={{ width: `${level}%` }} />
              </div>
              <b>{level}%</b>
              {ticket && <span className="badge danger">暂时不能用 · 单{ticket.id}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
