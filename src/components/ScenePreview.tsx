import type { Cue, Fixture, PatrolTicket, SceneState } from "../types";
import { fmtClock } from "../format";

interface Props {
  scene: SceneState | null;
  cue: Cue | undefined;
  fixtureOf: (id: string) => Fixture | undefined;
  activeTickets: Map<string, PatrolTicket>;
  onClear: () => void;
}

/** 当前场景预览：展示最后执行的 Cue 及其灯具，检修中的灯具会被标出 */
export default function ScenePreview({ scene, cue, fixtureOf, activeTickets, onClear }: Props) {
  return (
    <section className="panel scene-panel">
      <div className="heading">
        <div>
          <p>当前场景</p>
          <h2>场景预览</h2>
        </div>
        {scene && (
          <button onClick={onClear} title="收光，转入暗场">
            收光转暗场
          </button>
        )}
      </div>
      {!scene || !cue ? (
        <div className="dark-scene">
          <strong>暗场</strong>
          <p>舞台暂未执行 Cue。暗场期间可登记巡台单，安排临时检修。</p>
        </div>
      ) : (
        <div className="scene-live">
          <div className="scene-title">
            <strong>
              {cue.label} · {cue.name}
            </strong>
            {scene.via === "release" && <span className="badge warn">签字放行一次</span>}
          </div>
          <p className="scene-meta">
            执行于 {fmtClock(scene.firedAt)} · {cue.version} · {cue.note}
          </p>
          <div className="scene-fixtures">
            {cue.fixtureIds.map((fid) => {
              const f = fixtureOf(fid);
              if (!f) return null;
              const t = activeTickets.get(fid);
              return (
                <span key={fid} className={`fixture-chip${t ? " down" : ""}`}>
                  {f.code}
                  {t && <em>检修中</em>}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
