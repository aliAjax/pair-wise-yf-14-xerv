export type FixtureType = "面光" | "侧光" | "逆光" | "效果光";

export interface Fixture {
  /** 灯具编号，如 FOH-03 */
  id: string;
  /** 通道号 */
  channel: number;
  type: FixtureType;
  /** 色片 */
  gel: string;
  /** 焦点位置 */
  focus: string;
  /** 舞台灯位图坐标（0-100） */
  x: number;
  y: number;
}

export interface Cue {
  id: string;
  order: number;
  name: string;
  note: string;
  /** 本次 Cue 涉及灯具 -> 亮度预设（%） */
  levels: Record<string, number>;
}

export interface EtaChange {
  at: number;
  eta: number;
  note?: string;
}

/** 暗场巡台单 */
export interface PatrolTicket {
  id: string;
  fixtureId: string;
  createdAt: number;
  /** 预计恢复时间 */
  eta: number;
  /** 值班师傅 */
  technician: string;
  reason: string;
  status: "active" | "recovered";
  recoveredAt?: number;
  /** 维修延长记录 */
  changes: EtaChange[];
}

export interface HoldBlock {
  fixtureId: string;
  ticketId: string;
  /** 建待确认时看到的预计恢复时间 */
  etaAtHold: number;
  /** 师傅最近一次签字确认过的恢复时间；延期后必须重新确认 */
  seenEta: number;
  /** 最近签字的值班师傅 */
  seenBy?: string;
}

/** 停在“待确认”的一次 Cue 触发 */
export interface Hold {
  id: string;
  cueId: string;
  at: number;
  blocks: HoldBlock[];
}

/** 单次放行的签字记录（只对当次触发有效） */
export interface ReleaseEntry {
  id: string;
  cueId: string;
  at: number;
  signatures: {
    fixtureId: string;
    ticketId: string;
    /** 签字时单子上的预计恢复时间，留痕用 */
    eta: number;
    by: string;
  }[];
}

export interface PersistState {
  showName: string;
  note: string;
  tickets: PatrolTicket[];
  holds: Hold[];
  releases: ReleaseEntry[];
  lastFiredCueId: string | null;
  pointer: number;
}
