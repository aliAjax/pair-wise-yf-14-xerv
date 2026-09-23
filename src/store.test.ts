import { reducer, seedState, activeBlocksOf } from "./store";
import type { AppState } from "./types";

declare const process: { exitCode: number };

let passed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`ok - ${name}`);
  } else {
    console.error(`FAIL - ${name}`);
    process.exitCode = 1;
  }
}

// 种子：F05 挂 XD-001（active），Cue 12 含 F04+F05，已有 PQ-001 拦 Cue 12
let s: AppState = seedState();

// 1. 触发触及检修灯具的 Cue -> 待确认
s = reducer(s, { type: "triggerCue", cueId: "C3" }); // Cue 18 -> F10 正常
check("正常 Cue 直接执行", s.scene?.cueId === "C3" && s.scene.via === "normal");
s = reducer(s, { type: "triggerCue", cueId: "C2" }); // 已有待确认，不重复
check("同一 Cue 不重复进待确认", s.pending.filter((p) => p.cueId === "C2").length === 1);
s = reducer(s, { type: "triggerCue", cueId: "C5" }); // Cue 31 -> F07/F08/F09，F09 已恢复
check("已恢复灯具不再拦截", s.scene?.cueId === "C5" && !s.pending.some((p) => p.cueId === "C5"));

// 2. 签字 -> 放行一次
const pq = s.pending.find((p) => p.cueId === "C2")!;
s = reducer(s, { type: "signPending", pendingId: pq.id, signedBy: "王师傅" });
const signed = s.pending.find((p) => p.id === pq.id)!;
check("签字后状态为 signed 且有 ETA 快照", signed.status === "signed" && signed.signSnapshot?.["XD-001"] !== undefined);
s = reducer(s, { type: "releasePending", pendingId: pq.id });
check("放行后执行该 Cue（via=release）", s.scene?.cueId === "C2" && s.scene.via === "release");
check("放行后待确认条目消失", !s.pending.some((p) => p.id === pq.id));

// 3. 下一次触发仍按当时恢复情况判断（F05 仍未恢复 -> 再次拦截）
s = reducer(s, { type: "triggerCue", cueId: "C2" });
check("放行仅一次，下次触发重新拦截", s.pending.some((p) => p.cueId === "C2" && p.status === "pending"));

// 4. 签字后维修延长 -> 旧签字作废
const pq2 = s.pending.find((p) => p.cueId === "C2")!;
s = reducer(s, { type: "signPending", pendingId: pq2.id, signedBy: "王师傅" });
const oldEta = s.tickets.find((t) => t.id === "XD-001")!.eta;
s = reducer(s, { type: "extendTicket", ticketId: "XD-001", newEta: oldEta + 30 * 60_000, by: "王师傅" });
const afterExt = s.pending.find((p) => p.id === pq2.id)!;
check("延长后签字作废退回 pending", afterExt.status === "pending" && afterExt.invalidated === true);
// 作废后不能按旧签字放行：先正常触发别的 Cue 切走场景
s = reducer(s, { type: "triggerCue", cueId: "C3" });
check("正常 Cue 切到 C3", s.scene?.cueId === "C3");
s = reducer(s, { type: "releasePending", pendingId: pq2.id });
check("旧签字不能放行", s.pending.some((p) => p.id === pq2.id) && s.scene?.cueId === "C3");
// 延长不能早于原 ETA
const eta2 = s.tickets.find((t) => t.id === "XD-001")!.eta;
s = reducer(s, { type: "extendTicket", ticketId: "XD-001", newEta: oldEta, by: "王师傅" });
check("延长必须晚于原预计时间", s.tickets.find((t) => t.id === "XD-001")!.eta === eta2);

// 5. 恢复后可直接执行
s = reducer(s, { type: "recoverTicket", ticketId: "XD-001" });
check("工单标记已恢复", s.tickets.find((t) => t.id === "XD-001")!.status === "recovered");
const stillThere = s.pending.find((p) => p.id === pq2.id)!;
check("恢复后待确认条目无活跃阻塞", activeBlocksOf(s, stillThere).length === 0);
s = reducer(s, { type: "executePending", pendingId: pq2.id });
check("恢复后正常执行", s.scene?.cueId === "C2" && s.scene.via === "normal" && !s.pending.some((p) => p.id === pq2.id));

// 6. 执行时若又有新工单 -> 重新拦截
s = reducer(s, { type: "createTicket", fixtureId: "F04", eta: Date.now() + 3600_000, technician: "李师傅", reason: "测试" });
s = reducer(s, { type: "triggerCue", cueId: "C2" }); // F04+F05，F04 新检修
const pq3 = s.pending.find((p) => p.cueId === "C2")!;
check("新工单再次拦截同一 Cue", !!pq3 && pq3.blocks.some((b) => b.fixtureId === "F04"));
// 同一灯具不能重复发单
const before = s.tickets.length;
s = reducer(s, { type: "createTicket", fixtureId: "F04", eta: Date.now() + 7200_000, technician: "x", reason: "y" });
check("同一灯具仅一张进行中工单", s.tickets.length === before);

console.log(passed >= 12 ? "ALL PASSED" : "SOME FAILED");
