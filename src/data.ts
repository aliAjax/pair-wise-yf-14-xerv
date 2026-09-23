import type { Cue, Fixture } from "./types";

export const FIXTURES: Fixture[] = [
  // 面光 FOH
  { id: "FOH-01", channel: 1, type: "面光", gel: "L201 全CTO", focus: "舞台前区左", x: 14, y: 10 },
  { id: "FOH-02", channel: 2, type: "面光", gel: "L201 全CTO", focus: "舞台前区中", x: 50, y: 8 },
  { id: "FOH-03", channel: 3, type: "面光", gel: "L205 半CTO", focus: "上场门口（追光入场）", x: 86, y: 10 },
  // 侧光
  { id: "SL-11", channel: 11, type: "侧光", gel: "L117 钢蓝", focus: "二幕演区左", x: 6, y: 42 },
  { id: "SL-12", channel: 12, type: "侧光", gel: "L117 钢蓝", focus: "二幕演区右", x: 94, y: 42 },
  { id: "SL-13", channel: 13, type: "侧光", gel: "L161 冷蓝", focus: "台中高位侧光", x: 6, y: 64 },
  { id: "SL-14", channel: 14, type: "侧光", gel: "L161 冷蓝", focus: "台中高位侧光", x: 94, y: 64 },
  // 逆光
  { id: "BR-21", channel: 21, type: "逆光", gel: "L027 大红", focus: "全台逆光", x: 20, y: 88 },
  { id: "BR-22", channel: 22, type: "逆光", gel: "L027 大红", focus: "全台逆光", x: 50, y: 90 },
  { id: "BR-23", channel: 23, type: "逆光", gel: "L027 大红", focus: "全台逆光", x: 80, y: 88 },
  // 效果光
  { id: "FX-31", channel: 31, type: "效果光", gel: "L120 深蓝", focus: "天排染色", x: 30, y: 96 },
  { id: "FX-32", channel: 32, type: "效果光", gel: "L120 深蓝", focus: "天排染色", x: 70, y: 96 },
];

export const INITIAL_CUES: Cue[] = [
  {
    id: "CUE-01",
    order: 1,
    name: "开场暗场",
    note: "观众入场，仅保留天排微亮",
    levels: { "FX-31": 8, "FX-32": 8 },
  },
  {
    id: "CUE-12",
    order: 2,
    name: "冷蓝侧光",
    note: "二幕开场",
    levels: { "SL-11": 65, "SL-12": 65, "SL-13": 40, "SL-14": 40, "BR-22": 20 },
  },
  {
    id: "CUE-18",
    order: 3,
    name: "追光入场",
    note: "FOH-03，焦点门口；需演员走位确认",
    levels: { "FOH-03": 100, "FOH-02": 15 },
  },
  {
    id: "CUE-20",
    order: 4,
    name: "红逆高潮",
    note: "全台逆光起",
    levels: { "BR-21": 90, "BR-22": 90, "BR-23": 90, "SL-13": 25, "SL-14": 25 },
  },
  {
    id: "CUE-24",
    order: 5,
    name: "暖色谢幕",
    note: "全台面光 80%，版本B",
    levels: { "FOH-01": 80, "FOH-02": 80, "FOH-03": 80, "BR-22": 30 },
  },
];
