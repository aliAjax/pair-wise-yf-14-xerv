export type FixtureCategory = "面光" | "侧光" | "逆光" | "效果光";

export interface Fixture {
  id: string;
  code: string; // 灯具编号，如 FOH-03
  channel: string; // 通道号
  gel: string; // 色片
  focus: string; // 焦点位置
  intensity: number; // 亮度预设 %
  category: FixtureCategory;
  x: number; // 舞台图坐标 0-100
  y: number; // 舞台图坐标 0-130（>100 为观众席面光桥）
}

export interface Cue {
  id: string;
  label: string; // 如 "Cue 12"
  name: string;
  note: string;
  version: string; // 演出版本
  fixtureIds: string[];
}

export interface TicketExtension {
  at: number;
  fromEta: number;
  toEta: number;
  by: string;
}

/** 巡台单：暗场检修登记 */
export interface PatrolTicket {
  id: string; // 单号，如 XD-004
  fixtureId: string;
  reason: string; // 检修原因
  technician: string; // 值班师傅
  createdAt: number; // 发单时间
  eta: number; // 预计恢复时间
  status: "active" | "recovered";
  recoveredAt?: number;
  extensions: TicketExtension[];
}

/** 待确认条目里被卡住的灯具及其对应巡台单 */
export interface PendingBlock {
  fixtureId: string;
  ticketId: string;
}

/** 触发时被检修灯具拦下的 Cue */
export interface PendingCue {
  id: string;
  cueId: string;
  createdAt: number;
  blocks: PendingBlock[];
  status: "pending" | "signed";
  signedBy?: string;
  signedAt?: number;
  /** 签字时各巡台单的预计恢复时间快照，用于检测“维修延长、旧签字作废” */
  signSnapshot?: Record<string, number>;
  /** 签字后因维修延长被作废过 */
  invalidated?: boolean;
}

export interface SceneState {
  cueId: string;
  firedAt: number;
  via: "normal" | "release"; // release = 签字放行的一次
}

export interface LogEntry {
  at: number;
  text: string;
  tone: "info" | "warn" | "ok";
}

export interface AppState {
  showName: string;
  versionNote: string;
  fixtures: Fixture[];
  cues: Cue[];
  tickets: PatrolTicket[];
  pending: PendingCue[];
  scene: SceneState | null;
  log: LogEntry[];
  seq: number;
}
