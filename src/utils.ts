export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** HH:MM */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** MM-DD HH:MM */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function minutesUntil(ts: number, now: number): number {
  return Math.ceil((ts - now) / 60000);
}

/** 剩余时间描述：已到点 / 还有 N 分钟 / 已超时 N 分钟 */
export function formatEta(eta: number, now: number): string {
  const mins = minutesUntil(eta, now);
  if (mins > 0) return `还有 ${mins} 分钟`;
  if (mins === 0) return "到点（仍在检修）";
  return `已超时 ${Math.abs(mins)} 分钟`;
}

export function formatEtaInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
