import { create } from 'zustand';
import apiRequest from '../lib/apiRequest';

// 이벤트 → 원시 스탯 증분 매핑
// (2점/3점/자유투는 성공 시 시도(fga/threepa/fta)도 함께 +1)
// tone: success(파랑, 슛 성공) / good(파랑, 긍정 스탯) / miss(빨강, 슛 실패) / bad(빨강, 부정 스탯)
export const EVENT_DEFS = {
  make2: { label: '2점 성공', labelEn: '2PT', tone: 'success', made: 2, deltas: { fgm: 1, fga: 1 } },
  miss2: { label: '2점 시도', labelEn: '2PT Att', tone: 'miss', deltas: { fga: 1 } },
  make3: { label: '3점 성공', labelEn: '3PT', tone: 'success', made: 3, deltas: { fgm: 1, fga: 1, threepm: 1, threepa: 1 } },
  miss3: { label: '3점 시도', labelEn: '3PT Att', tone: 'miss', deltas: { fga: 1, threepa: 1 } },
  makeFt: { label: '자유투 성공', labelEn: 'FT', tone: 'success', made: 1, deltas: { ftm: 1, fta: 1 } },
  missFt: { label: '자유투 시도', labelEn: 'FT Att', tone: 'miss', deltas: { fta: 1 } },
  oreb: { label: '공격 리바운드', labelEn: 'OFF REB', tone: 'good', deltas: { oreb: 1 } },
  dreb: { label: '수비 리바운드', labelEn: 'DEF REB', tone: 'good', deltas: { dreb: 1 } },
  ast: { label: '어시스트', labelEn: 'AST', tone: 'good', deltas: { ast: 1 } },
  stl: { label: '스틸', labelEn: 'STL', tone: 'good', deltas: { stl: 1 } },
  blk: { label: '블락', labelEn: 'BLK', tone: 'good', deltas: { blk: 1 } },
  turnover: { label: '턴오버', labelEn: 'TO', tone: 'bad', deltas: { turnover: 1 } },
  pf: { label: '파울', labelEn: 'PF', tone: 'bad', deltas: { pf: 1 } },
};

const STAT_FIELDS = [
  'fgm', 'fga', 'threepm', 'threepa', 'ftm', 'fta',
  'oreb', 'dreb', 'ast', 'stl', 'blk', 'turnover', 'pf',
];
const toInt = (v) => parseInt(v) || 0;
export const blankStat = () => STAT_FIELDS.reduce((o, f) => ((o[f] = 0), o), {});

// 원시 스탯 → 표시용 파생값 (pts/reb)
export const statPoints = (s) => {
  if (!s) return 0;
  const twopm = Math.max(toInt(s.fgm) - toInt(s.threepm), 0);
  return twopm * 2 + toInt(s.threepm) * 3 + toInt(s.ftm);
};
export const statReb = (s) => (s ? toInt(s.oreb) + toInt(s.dreb) : 0);

// 여러 스탯 합산
export const sumStats = (list) => {
  const acc = blankStat();
  for (const s of list) for (const f of STAT_FIELDS) acc[f] += toInt(s?.[f]);
  return acc;
};

// squadStats({ [quarter]: { [userId]: stat } }) → 스쿼드 총 득점
export const squadPoints = (squadStats) => {
  let total = 0;
  for (const q of Object.keys(squadStats || {})) {
    for (const uid of Object.keys(squadStats[q] || {})) total += statPoints(squadStats[q][uid]);
  }
  return total;
};

// 선수의 전 쿼터 합산 스탯
export const playerTotal = (squadStats, userId) => {
  const list = [];
  for (const q of Object.keys(squadStats || {})) if (squadStats[q]?.[userId]) list.push(squadStats[q][userId]);
  return sumStats(list);
};

// 선수가 성공시킨 슛 값 시퀀스 (쿼터 순서 → 입력 순서), 예: [2,2,2,3,1,1]
export const playerMakes = (squadStats, userId) => {
  const out = [];
  const quarters = Object.keys(squadStats || {}).sort((a, b) => Number(a) - Number(b));
  for (const q of quarters) {
    const arr = squadStats[q]?.[userId]?.makes;
    if (Array.isArray(arr)) out.push(...arr);
  }
  return out;
};

// ── localStorage helpers (오프라인/새로고침 대비 즉시 저장) ──
const statsKey = (matchId, squadId) => `live:${matchId}:squad:${squadId}`;
const ctxKey = (matchId) => `live:${matchId}:ctx`;
const readLS = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeLS = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* quota 등 무시 */
  }
};

let saveTimer = null;
let qmTimer = null;

const useLiveGameStore = create((set, get) => ({
  matchId: null,
  meta: null, // { title, quarterCount, squads:[{squadId,label,members:[]}] }
  quarterMinutes: [], // 쿼터별 시간(분) 배열
  savedQuarters: [], // DB에 확정 저장된 쿼터 번호 목록
  allStats: {}, // { [squadId]: squadStats }  (스코어보드용, 마지막 GET 기준)
  mySquadId: null,
  currentQuarter: 1,
  squadStats: {}, // 내 스쿼드 { [quarter]: { [userId]: stat } }
  eventLog: [], // { userId, quarter, deltas }
  loading: false,
  saving: false,

  // 드래프트 로드 (서버 우선, 실패 시 localStorage 폴백)
  loadDraft: async (matchId) => {
    set({ loading: true, matchId });
    let data = null;
    try {
      const res = await apiRequest('get', `/team/live/${matchId}`);
      data = res?.data || null;
    } catch {
      data = null;
    }

    const ctx = readLS(ctxKey(matchId)) || {};
    if (!data) {
      // 오프라인 폴백: meta는 없지만 저장된 스탯이라도 복구
      set({ loading: false });
      return false;
    }

    const allStats = {};
    for (const s of data.squads) allStats[s.squadId] = s.stats || {};

    let mySquadId = ctx.mySquadId ?? null;
    if (mySquadId != null && !data.squads.some((s) => String(s.squadId) === String(mySquadId))) {
      mySquadId = null;
    }
    const currentQuarter = Math.min(Math.max(toInt(ctx.currentQuarter) || 1, 1), data.quarterCount || 1);

    // 쿼터별 시간(분) — 배열 보장(구버전 스칼라 대비)
    const qm = Array.isArray(data.quarterMinutes)
      ? data.quarterMinutes
      : Array.from({ length: data.quarterCount || 1 }, () => toInt(data.quarterMinutes) || 10);

    // 내 스쿼드 스탯: 서버 값을 기준으로, 없으면 localStorage 폴백
    let squadStats = {};
    if (mySquadId != null) {
      const server = allStats[mySquadId];
      const hasServer = server && Object.values(server).some((q) => q && Object.keys(q).length);
      squadStats = hasServer ? server : readLS(statsKey(matchId, mySquadId)) || server || {};
    }

    set({
      meta: {
        title: data.title,
        quarterCount: data.quarterCount,
        startedAt: data.startedAt,
        squads: data.squads.map((s) => ({ squadId: s.squadId, label: s.label, members: s.members })),
      },
      quarterMinutes: qm,
      savedQuarters: Array.isArray(data.savedQuarters) ? data.savedQuarters : [],
      allStats,
      mySquadId,
      currentQuarter,
      squadStats,
      eventLog: [],
      loading: false,
    });
    return true;
  },

  // 스코어보드 갱신 (타 스쿼드 점수)
  refreshScoreboard: async () => {
    const { matchId, mySquadId, squadStats } = get();
    if (!matchId) return;
    try {
      const res = await apiRequest('get', `/team/live/${matchId}`);
      const data = res?.data;
      if (!data) return;
      const allStats = {};
      for (const s of data.squads) allStats[s.squadId] = s.stats || {};
      // 내 스쿼드는 로컬 편집본이 최신이므로 유지
      if (mySquadId != null) allStats[mySquadId] = squadStats;
      set({ allStats });
    } catch {
      /* 무시 */
    }
  },

  setMySquad: (squadId) => {
    const { matchId, allStats } = get();
    const server = allStats[squadId] || {};
    const hasServer = Object.values(server).some((q) => q && Object.keys(q).length);
    const squadStats = hasServer ? server : readLS(statsKey(matchId, squadId)) || {};
    writeLS(ctxKey(matchId), { mySquadId: squadId, currentQuarter: get().currentQuarter });
    set({ mySquadId: squadId, squadStats });
  },

  // 담당 스쿼드 선택 해제 → 스쿼드 선택 화면으로 (다른 스쿼드 기록 수정용)
  clearMySquad: () => {
    const { matchId, currentQuarter } = get();
    if (matchId != null) writeLS(ctxKey(matchId), { mySquadId: null, currentQuarter });
    set({ mySquadId: null, squadStats: {} });
  },

  setQuarter: (q) => {
    const { matchId, mySquadId } = get();
    if (matchId != null) writeLS(ctxKey(matchId), { mySquadId, currentQuarter: q });
    set({ currentQuarter: q });
  },

  // 특정 쿼터 시간(분) 변경 (+/- 스텝) → Redis 디바운스 저장
  setQuarterMinutes: (quarter, minutes) => {
    const { matchId, quarterMinutes } = get();
    const val = Math.min(Math.max(toInt(minutes) || 1, 1), 60);
    const next = [...quarterMinutes];
    next[quarter - 1] = val;
    set({ quarterMinutes: next });
    if (matchId == null) return;
    if (qmTimer) clearTimeout(qmTimer);
    qmTimer = setTimeout(async () => {
      try {
        await apiRequest('put', `/team/live/${matchId}/quarter-minutes`, { quarterMinutes: get().quarterMinutes });
      } catch {
        /* 다음 로드에서 서버값으로 보정 */
      }
    }, 600);
  },

  // 선수에게 이벤트 적용 (현재 쿼터). sign: +1 추가 / -1 빼기(잘못 누른 기록 취소)
  applyEvent: (userId, eventType, sign = 1) => {
    const def = EVENT_DEFS[eventType];
    if (!def) return;
    const dir = sign < 0 ? -1 : 1;
    const { squadStats, currentQuarter, eventLog } = get();
    const q = currentQuarter;
    const next = { ...squadStats, [q]: { ...(squadStats[q] || {}) } };
    const cur = { ...(next[q][userId] || blankStat()) };
    for (const [field, delta] of Object.entries(def.deltas)) {
      cur[field] = Math.max(toInt(cur[field]) + delta * dir, 0);
    }
    if (def.made) {
      const makes = [...(cur.makes || [])];
      if (dir > 0) makes.push(def.made); // 성공 슛 시퀀스 추가
      else {
        const idx = makes.lastIndexOf(def.made); // 해당 값의 성공 슛 하나 제거
        if (idx >= 0) makes.splice(idx, 1);
      }
      cur.makes = makes;
    }
    next[q][userId] = cur;
    set({
      squadStats: next,
      eventLog: [...eventLog, { userId, quarter: q, eventType, deltas: def.deltas, made: def.made, dir }],
    });
    get()._persist();
  },

  undo: () => {
    const { squadStats, eventLog } = get();
    if (eventLog.length === 0) return;
    const last = eventLog[eventLog.length - 1];
    const q = last.quarter;
    const dir = last.dir ?? 1;
    const next = { ...squadStats, [q]: { ...(squadStats[q] || {}) } };
    const cur = { ...(next[q][last.userId] || blankStat()) };
    for (const [field, delta] of Object.entries(last.deltas)) {
      cur[field] = Math.max(toInt(cur[field]) - delta * dir, 0);
    }
    if (last.made) {
      const makes = [...(cur.makes || [])];
      if (dir > 0) {
        const idx = makes.lastIndexOf(last.made);
        if (idx >= 0) makes.splice(idx, 1);
      } else {
        makes.push(last.made);
      }
      cur.makes = makes;
    }
    next[q][last.userId] = cur;
    set({ squadStats: next, eventLog: eventLog.slice(0, -1) });
    get()._persist();
  },

  // localStorage 즉시 + Redis 디바운스 저장
  _persist: () => {
    const { matchId, mySquadId, squadStats } = get();
    if (matchId == null || mySquadId == null) return;
    writeLS(statsKey(matchId, mySquadId), squadStats);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => get().flushSave(), 800);
  },

  // Redis 강제 저장 (디바운스 대기 없이)
  flushSave: async () => {
    const { matchId, mySquadId, squadStats } = get();
    if (matchId == null || mySquadId == null) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({ saving: true });
    try {
      await apiRequest('put', `/team/live/${matchId}/squad/${mySquadId}`, { stats: squadStats });
    } catch {
      /* 오프라인이어도 localStorage에 보존됨 */
    } finally {
      set({ saving: false });
    }
  },

  // 현재(또는 지정) 쿼터만 DB에 확정 저장. 경기 종료는 사용자가 명시적으로(finish)
  saveQuarter: async (quarter) => {
    const { matchId, currentQuarter } = get();
    if (matchId == null) return null;
    const q = quarter || currentQuarter;
    await get().flushSave();
    const res = await apiRequest('post', `/team/live/${matchId}/quarter/${q}/save`, {});
    const data = res?.data || null;
    if (data?.savedQuarters) set({ savedQuarters: data.savedQuarters });
    return data;
  },

  finish: async () => {
    const { matchId } = get();
    if (matchId == null) return null;
    await get().flushSave();
    const res = await apiRequest('post', `/team/live/${matchId}/finish`, {});
    get().reset();
    return res?.data || null;
  },

  discard: async () => {
    const { matchId } = get();
    if (matchId == null) return;
    try {
      await apiRequest('delete', `/team/live/${matchId}`);
    } finally {
      try {
        localStorage.removeItem(ctxKey(matchId));
      } catch {
        /* 무시 */
      }
      get().reset();
    }
  },

  reset: () =>
    set({
      matchId: null,
      meta: null,
      quarterMinutes: [],
      savedQuarters: [],
      allStats: {},
      mySquadId: null,
      currentQuarter: 1,
      squadStats: {},
      eventLog: [],
      loading: false,
      saving: false,
    }),
}));

export default useLiveGameStore;
