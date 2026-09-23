interface Props {
  fixtureCount: number;
  downCount: number;
  cueCount: number;
  sceneLabel: string;
  pendingCount: number;
}

export default function MetricsBar({ fixtureCount, downCount, cueCount, sceneLabel, pendingCount }: Props) {
  const items: Array<[string, string | number, boolean?]> = [
    ["灯具数量", fixtureCount],
    ["检修中", downCount, downCount > 0],
    ["Cue数量", cueCount],
    ["当前场景", sceneLabel],
    ["待确认Cue", pendingCount, pendingCount > 0],
  ];
  return (
    <section className="metrics">
      {items.map(([label, value, alert]) => (
        <article key={label} className={alert ? "alert" : ""}>
          <small>{label}</small>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
