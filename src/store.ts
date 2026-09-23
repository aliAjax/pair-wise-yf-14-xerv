import type {
  AppState,
  Cue,
  Fixture,
  FixtureCategory,
  LogEntry,
  PatrolTicket,
  PendingBlock,
  PendingCue,
} from "./types";
import { fmtClock } from "./format";

const MIN = 60_000;

/* ---------------- 种子数据 ---------------- */

function seedFixtures(): Fixture[] {
  const rows: Array<[string, string, string, string, string, number, FixtureCategory, number, number]> = [
    // 编号, 通道, 色片, 焦点, 亮度, 类别, x, y
    ["F01", "FOH-01", "CH 001", "R02 淡琥珀", "台口中区", 80, "面光", 30, 112],
    ["F02", "FOH-02", "CH 002", "R02 淡琥珀", "台口左侧", 75, "面光", 50, 112],
    ["F03", "FOH-03", "CH 003", "R05 暖粉", "台口右侧", 75, "面光", 70, 112],
    ["F04", "SL-L1", "CH 021", "R80 冷蓝", "左侧天桥", 65, "侧光", 7, 42],
    ["F05", "SL-R1", "CH 022", "R80 冷蓝", "右侧天桥", 65, "侧光", 93, 42],
    ["F06", "SL-L2", "CH 023", "R26 暖红", "左侧下场门", 60, "侧光", 7, 72],
    ["F07", "BO-01", "CH 041", "R79 深蓝", "天幕前区", 70, "逆光", 35, 12],
    ["F08", "BO-02", "CH 042", "R79 深蓝", "天幕前区", 70, "逆光", 65, 12],
    ["F09", "FX-01", "CH 060", "无（图案片）", "水池效果", 50, "效果光", 50, 56],
    ["F10", "FX-02", "CH 061", "R88 紫", "追光备用位", 90, "效果光", 82, 80],
  ];
  return rows.map(([id, code, channel, gel, focus, intensity, category, x, y]) => ({
    id,
    code,
    channel,
    gel,
    focus,
    intensity,
    category,
    x,
    y,
  }));
}

function seedCues(): Cue[] {
  return [
    { id: "C1", label: "Cue 07", name: "左侧独白", note: "暖红侧光压场", version: "版本A", fixtureIds: ["F06", "F01"] },
    { id: "C2", label: "Cue 12", name: "冷蓝侧光", note: "二幕开场", version: "版本A", fixtureIds: ["F04", "F05"] },
    { id: "C3", label: "Cue 18", name: "追光入场", note: "需演员走位确认", version: "版本A", fixtureIds: ["F10"] },
    { id: "C4", label: "Cue 24", name: "暖色谢幕", note: "全台面光80%", version: "版本B", fixtureIds: ["F01", "F02", "F03"] },
    { id: "C5", label: "Cue 31", name: "天幕夜景", note: "深蓝逆光加水纹", version: "版本B", fixtureIds: ["F07", "F08", "F09"] },
  ];
}

export function seedState(): AppState {
  const now = Date.now();
  const ticket: PatrolTicket = {
    id: "XD-001",
    fixtureId: "F05",
    reason: "灯珠闪烁，更换光源",
    technician: "王师傅",
    createdAt: now - 20 * MIN,
    eta: now + 40 * MIN,
    status: "active",
    extensions: [],
  };
  const recovered: PatrolTicket = {
    id: "XD-000",
    fixtureId: "F09",
    reason: "图案轮卡滞",
    technician: "李师傅",
    createdAt: now - 3 * 60 * MIN,
    eta: now - 2 * 60 * MIN,
    status: "recovered",
    recoveredAt: now - 132 * MIN,
    extensions: [],
  };
  const pending: PendingCue = {
    id: "PQ-001",
    cueId: "C2",
    createdAt: now - 5 * MIN,
    blocks: [{ fixtureId: "F05", ticketId: "XD-001" }],
    status: "pending",
  };
  return {
    showName: "《夜航》彩排场",
    versionNote: "版本B：谢幕面光整体提亮 5%，Cue 31 水纹速度减半。",
    fixtures: seedFixtures(),
    cues: seedCues(),
    tickets: [ticket, recovered],
    pending: [pending],
    scene: null,
    log: [
      { at: now - 20 * MIN, text: "暗场发单 XD-001：SL-R1 灯珠闪烁，王师傅值班处理", tone: "warn" },
      { at: now - 5 * MIN, text: "触发 Cue 12 触及检修灯具 SL-R1，转入待确认", tone: "warn" },
    ],
    seq: 2,
  };
}

/* ---------------- 派生查询 ---------------- */

export function activeTicketOf(tickets: PatrolTicket[], fixtureId: string): PatrolTicket | undefined {
  return tickets.find((t) => t.fixtureId === fixtureId && t.status === "active");
}

export function downFixtureIds(tickets: PatrolTicket[]): Set<string> {
  return new Set(tickets.filter((t) => t.status === "active").map((t) => t.fixtureId));
}

export function fixtureById(state: AppState, id: string): Fixture | undefined {
  return state.fixtures.find((f) => f.id === id);
}

export function cueById(state: AppState, id: string): Cue | undefined {
  return state.cues.find((c) => c.id === id);
}

/** 当前仍卡住该待确认条目的巡台单（未恢复的） */
export function activeBlocksOf(state: AppState, p: PendingCue): PendingBlock[] {
  return p.blocks.filter((b) => {
    const t = state.tickets.find((tk) => tk.id === b.ticketId);
    return t?.status === "active";
  });
}

/* ---------------- Action ---------------- */

export type Action =
  | { type: "triggerCue"; cueId: string }
  | { type: "signPending"; pendingId: string; signedBy: string }
  | { type: "releasePending"; pendingId: string }
  | { type: "executePending"; pendingId: string }
  | { type: "dismissPending"; pendingId: string }
  | { type: "createTicket"; fixtureId: string; eta: number; technician: string; reason: string }
  | { type: "extendTicket"; ticketId: string; newEta: number; by: string }
  | { type: "recoverTicket"; ticketId: string }
  | { type: "addFixture"; fixture: Omit<Fixture, "id" | "x" | "y"> }
  | { type: "addCue"; name: string; note: string; version: string; fixtureIds: string[] }
  | { type: "updateShow"; showName: string; versionNote: string }
  | { type: "clearScene" };

function pushLog(log: LogEntry[], text: string, tone: LogEntry["tone"], at: number): LogEntry[] {
  return [{ at, text, tone }, ...log].slice(0, 20);
}

function nextId(state: AppState, prefix: string): [string, number] {
  return [`${prefix}-${String(state.seq).padStart(3, "0")}`, state.seq + 1];
}

const CATEGORY_SPOTS: Record<FixtureCategory, { x: number; y: number }> = {
  面光: { x: 50, y: 112 },
  侧光: { x: 7, y: 56 },
  逆光: { x: 50, y: 12 },
  效果光: { x: 50, y: 60 },
};

export function reducer(state: AppState, action: Action): AppState {
  const now = Date.now();
  switch (action.type) {
    case "triggerCue": {
      const cue = cueById(state, action.cueId);
      if (!cue) return state;
      if (state.pending.some((p) => p.cueId === cue.id)) return state; // 已在待确认队列
      const down = downFixtureIds(state.tickets);
      const blocks: PendingBlock[] = cue.fixtureIds
        .filter((fid) => down.has(fid))
        .map((fid) => ({ fixtureId: fid, ticketId: activeTicketOf(state.tickets, fid)!.id }));
      if (blocks.length === 0) {
        return {
          ...state,
          scene: { cueId: cue.id, firedAt: now, via: "normal" },
          log: pushLog(state.log, `触发 ${cue.label} · ${cue.name}`, "ok", now),
        };
      }
      const [id, seq] = nextId(state, "PQ");
      const names = blocks.map((b) => fixtureById(state, b.fixtureId)?.code ?? b.fixtureId).join("、");
      const entry: PendingCue = { id, cueId: cue.id, createdAt: now, blocks, status: "pending" };
      return {
        ...state,
        seq,
        pending: [entry, ...state.pending],
        log: pushLog(state.log, `触发 ${cue.label} 触及检修灯具 ${names}，转入待确认`, "warn", now),
      };
    }

    case "signPending": {
      const p = state.pending.find((x) => x.id === action.pendingId);
      if (!p || p.status !== "pending") return state;
      const active = activeBlocksOf(state, p);
      if (active.length === 0) return state; // 已全部恢复，应直接执行
      const snapshot: Record<string, number> = {};
      for (const b of active) {
        const t = state.tickets.find((tk) => tk.id === b.ticketId);
        if (t) snapshot[t.id] = t.eta;
      }
      const cue = cueById(state, p.cueId);
      const signedBy = action.signedBy.trim() || "值班师傅";
      return {
        ...state,
        pending: state.pending.map((x) =>
          x.id === p.id
            ? { ...x, status: "signed", signedBy, signedAt: now, signSnapshot: snapshot, invalidated: false }
            : x
        ),
        log: pushLog(state.log, `${signedBy} 签字：${cue?.label ?? p.cueId} 可放行一次`, "info", now),
      };
    }

    case "releasePending": {
      const p = state.pending.find((x) => x.id === action.pendingId);
      if (!p || p.status !== "signed") return state;
      // 防御：签字后若工单被延长，旧签字不能放行
      const stale = activeBlocksOf(state, p).some((b) => {
        const t = state.tickets.find((tk) => tk.id === b.ticketId);
        return t && p.signSnapshot?.[t.id] !== t.eta;
      });
      if (stale) {
        return {
          ...state,
          pending: state.pending.map((x) =>
            x.id === p.id
              ? { ...x, status: "pending", signedBy: undefined, signedAt: undefined, signSnapshot: undefined, invalidated: true }
              : x
          ),
          log: pushLog(state.log, `巡台单已延长，${cueById(state, p.cueId)?.label ?? p.cueId} 旧签字作废，需重新确认`, "warn", now),
        };
      }
      const cue = cueById(state, p.cueId);
      const names = activeBlocksOf(state, p)
        .map((b) => fixtureById(state, b.fixtureId)?.code ?? b.fixtureId)
        .join("、");
      return {
        ...state,
        pending: state.pending.filter((x) => x.id !== p.id),
        scene: { cueId: p.cueId, firedAt: now, via: "release" },
        log: pushLog(
          state.log,
          `签字放行：${cue?.label ?? p.cueId} 执行一次（${names} 仍未恢复，下次触发重新判断）`,
          "warn",
          now
        ),
      };
    }

    case "executePending": {
      const p = state.pending.find((x) => x.id === action.pendingId);
      if (!p) return state;
      const cue = cueById(state, p.cueId);
      if (!cue) return state;
      // 按“当时”的恢复情况重新判断
      const down = downFixtureIds(state.tickets);
      const blocks: PendingBlock[] = cue.fixtureIds
        .filter((fid) => down.has(fid))
        .map((fid) => ({ fixtureId: fid, ticketId: activeTicketOf(state.tickets, fid)!.id }));
      if (blocks.length === 0) {
        return {
          ...state,
          pending: state.pending.filter((x) => x.id !== p.id),
          scene: { cueId: cue.id, firedAt: now, via: "normal" },
          log: pushLog(state.log, `${cue.label} 灯具已恢复，正常执行`, "ok", now),
        };
      }
      const names = blocks.map((b) => fixtureById(state, b.fixtureId)?.code ?? b.fixtureId).join("、");
      return {
        ...state,
        pending: state.pending.map((x) =>
          x.id === p.id
            ? { ...x, blocks, status: "pending", signedBy: undefined, signedAt: undefined, signSnapshot: undefined }
            : x
        ),
        log: pushLog(state.log, `${cue.label} 仍有检修灯具 ${names}，继续待确认`, "warn", now),
      };
    }

    case "dismissPending": {
      const p = state.pending.find((x) => x.id === action.pendingId);
      if (!p) return state;
      const cue = cueById(state, p.cueId);
      return {
        ...state,
        pending: state.pending.filter((x) => x.id !== p.id),
        log: pushLog(state.log, `取消 ${cue?.label ?? p.cueId} 本次触发`, "info", now),
      };
    }

    case "createTicket": {
      const fixture = fixtureById(state, action.fixtureId);
      if (!fixture || activeTicketOf(state.tickets, fixture.id)) return state; // 该灯已有进行中的单
      const [id, seq] = nextId(state, "XD");
      const ticket: PatrolTicket = {
        id,
        fixtureId: fixture.id,
        reason: action.reason.trim() || "临时检修",
        technician: action.technician.trim() || "值班师傅",
        createdAt: now,
        eta: action.eta,
        status: "active",
        extensions: [],
      };
      return {
        ...state,
        seq,
        tickets: [ticket, ...state.tickets],
        log: pushLog(
          state.log,
          `暗场发单 ${id}：${fixture.code} ${ticket.reason}，预计 ${fmtClock(ticket.eta)} 恢复（${ticket.technician}）`,
          "warn",
          now
        ),
      };
    }

    case "extendTicket": {
      const t = state.tickets.find((x) => x.id === action.ticketId);
      if (!t || t.status !== "active") return state;
      if (action.newEta <= t.eta || action.newEta <= now) return state; // 延长必须晚于原预计与当前时间
      const by = action.by.trim() || t.technician;
      const tickets = state.tickets.map((x) =>
        x.id === t.id
          ? { ...x, eta: action.newEta, extensions: [...x.extensions, { at: now, fromEta: t.eta, toEta: action.newEta, by }] }
          : x
      );
      // 维修延长：已签字的待确认条目旧签字作废，退回待确认
      const pending = state.pending.map((p) => {
        if (p.status !== "signed") return p;
        if (!p.blocks.some((b) => b.ticketId === t.id)) return p;
        if (p.signSnapshot?.[t.id] === action.newEta) return p;
        return { ...p, status: "pending" as const, signedBy: undefined, signedAt: undefined, signSnapshot: undefined, invalidated: true };
      });
      const fixture = fixtureById(state, t.fixtureId);
      return {
        ...state,
        tickets,
        pending,
        log: pushLog(
          state.log,
          `${t.id}（${fixture?.code ?? ""}）维修延长至 ${fmtClock(action.newEta)}，相关待确认Cue需重新签字`,
          "warn",
          now
        ),
      };
    }

    case "recoverTicket": {
      const t = state.tickets.find((x) => x.id === action.ticketId);
      if (!t || t.status !== "active") return state;
      const fixture = fixtureById(state, t.fixtureId);
      return {
        ...state,
        tickets: state.tickets.map((x) => (x.id === t.id ? { ...x, status: "recovered", recoveredAt: now } : x)),
        log: pushLog(state.log, `${t.id} ${fixture?.code ?? ""} 已恢复（${t.technician}）`, "ok", now),
      };
    }

    case "addFixture": {
      const [id, seq] = nextId(state, "F");
      const spot = CATEGORY_SPOTS[action.fixture.category];
      const count = state.fixtures.filter((f) => f.category === action.fixture.category).length;
      const fixture: Fixture = {
        ...action.fixture,
        id,
        x: Math.min(96, Math.max(4, spot.x + ((count % 5) - 2) * 12)),
        y: Math.min(126, Math.max(6, spot.y + (Math.floor(count / 5) % 2) * 8)),
      };
      return {
        ...state,
        seq,
        fixtures: [...state.fixtures, fixture],
        log: pushLog(state.log, `新增灯具 ${fixture.code}（${fixture.category}）`, "info", now),
      };
    }

    case "addCue": {
      if (action.fixtureIds.length === 0 || !action.name.trim()) return state;
      const [id, seq] = nextId(state, "C");
      const maxNo = state.cues.reduce((m, c) => {
        const n = parseInt(c.label.replace(/\D/g, ""), 10);
        return Number.isFinite(n) ? Math.max(m, n) : m;
      }, 0);
      const cue: Cue = {
        id,
        label: `Cue ${String(maxNo + 1).padStart(2, "0")}`,
        name: action.name.trim(),
        note: action.note.trim() || "—",
        version: action.version.trim() || "版本A",
        fixtureIds: action.fixtureIds,
      };
      return {
        ...state,
        seq,
        cues: [...state.cues, cue],
        log: pushLog(state.log, `新增 ${cue.label} · ${cue.name}`, "info", now),
      };
    }

    case "updateShow":
      return { ...state, showName: action.showName, versionNote: action.versionNote };

    case "clearScene":
      if (!state.scene) return state;
      return { ...state, scene: null, log: pushLog(state.log, "收光，转入暗场", "info", now) };

    default:
      return state;
  }
}

/* ---------------- 持久化 ---------------- */

const STORAGE_KEY = "hxyfront-62002:state:v1";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as AppState;
    const seed = seedState();
    // 防御性合并，避免旧版本字段缺失
    return {
      ...seed,
      ...parsed,
      fixtures: Array.isArray(parsed.fixtures) ? parsed.fixtures : seed.fixtures,
      cues: Array.isArray(parsed.cues) ? parsed.cues : seed.cues,
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : seed.tickets,
      pending: Array.isArray(parsed.pending) ? parsed.pending : seed.pending,
      log: Array.isArray(parsed.log) ? parsed.log : seed.log,
    };
  } catch {
    return seedState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 存储不可用时静默降级 */
  }
}
