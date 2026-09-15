export const STORAGE_KEY = 'dengdeng_points_v1';
export const SCHEMA_VERSION = 1;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function createSeedState() {
  const now = Date.now();
  const T = (name, points, extra) =>
    Object.assign({ id: uid(), name, mode: 'normal', points, levels: [] }, extra || {});
  const cat = (name, rewards, penalties) => ({ id: uid(), name, rewards, penalties });
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: [
      cat('生活习惯', [
        T('主动洗漱', 2),
        T('整理书包、课桌', 1),
        T('进门换鞋，七步洗手', 2),
        T('吃饭认真、不挑食', 1),
        T('按时睡觉、起床', 2),
        T('午睡', 3, { mode: 'level', levels: [
          { label: '1小时', points: 3 }, { label: '0.5-1小时', points: 2 }, { label: '0-0.5小时', points: 1 }
        ]}),
        T('主动做家务', 2),
        T('每日运动15-30分钟', 3),
        T('徒步1公里', 1)
      ], [
        T('不主动洗漱', 2),
        T('小嘴巴舔咬东西多于3次', 5),
        T('不主动整理书包、课桌', 1),
        T('不冲洗厕所', 2),
        T('吃饭不认真、挑食', 2),
        T('吃饭超过30分钟离开座位', 1),
        T('睡觉起床拖拉磨蹭', 1),
        T('乱扔东西、垃圾', 3),
        T('不尊老爱幼', 3),
        T('没完成运动任务', 3)
      ]),
      cat('学习习惯', [
        T('认真完成各科作业', 2),
        T('复习今日所学内容', 2),
        T('预习明日要学课程', 3),
        T('练钢琴认真', 2),
        T('每日练字15分钟', 2),
        T('坐姿、握笔姿势标准', 5),
        T('学习不无故离开座位', 5)
      ], [
        T('不认真完成各科作业', 5),
        T('没有复习今日所学', 1),
        T('没有预习明日课程', 2),
        T('没有练琴', 1),
        T('没有进行每日练字', 1),
        T('坐姿、握笔不标准', 2),
        T('做作业好动、不认真', 5)
      ]),
      cat('学习科目', [
        T('口算题100道', 2),
        T('阅读理解1篇', 3),
        T('看图写话1篇', 5),
        T('摘抄好词好句30个', 3)
      ], [
        T('看书姿势、环境错误', 2)
      ]),
      cat('学习成绩', [
        T('单元测试成绩', 5, { mode: 'level', levels: [
          { label: '100分', points: 5 }, { label: '95分', points: 2 }
        ]}),
        T('获得学校奖状', 10),
        T('课堂听写、默写满分', 5),
        T('被老师点名表扬一次', 2)
      ], [
        T('单元测试85分以下', 3),
        T('单元测试70分以下', 5),
        T('单元测试不及格', 10),
        T('被老师点名批评', 10),
        T('表现差，老师找家长', 15)
      ]),
      cat('性格养成', [
        T('一天不发脾气', 3),
        T('主动和认识的人打招呼', 2),
        T('遇到难题想办法解决', 5)
      ], [
        T('乱发脾气', 3),
        T('和长辈顶嘴', 5),
        T('说脏话', 5),
        T('撒谎，屡教不改', 10)
      ])
    ],
    goods: [
      { id: uid(), name: '手机/电视 1分钟', points: 2, emoji: '📱' },
      { id: uid(), name: '看电视 20分钟', points: 40, emoji: '📺' },
      { id: uid(), name: '零食 5元以内', points: 30, emoji: '🍬' },
      { id: uid(), name: '零食 10元以内', points: 60, emoji: '🍫' },
      { id: uid(), name: '小愿望 20元以内', points: 60, emoji: '⭐' },
      { id: uid(), name: '游乐场', points: 100, emoji: '🎢' },
      { id: uid(), name: '礼物 30元以内', points: 90, emoji: '🎁' },
      { id: uid(), name: '礼物 50元以内', points: 150, emoji: '🎀' },
      { id: uid(), name: '开启新电脑游戏', points: 200, emoji: '🎮' },
      { id: uid(), name: '周末自由支配一天', points: 200, emoji: '🛋️' },
      { id: uid(), name: '外出简餐', points: 60, emoji: '🍜' },
      { id: uid(), name: '吃大餐', points: 200, emoji: '🍱' },
      { id: uid(), name: '短途旅行', points: 600, emoji: '🚗' },
      { id: uid(), name: '长途旅行', points: 3000, emoji: '✈️' }
    ],
    ledger: [],
    createdAt: now,
    updatedAt: now
  };
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function validTask(t) {
  if (!isPlainObject(t)) return '任务不是对象';
  if (typeof t.id !== 'string' || !t.id) return '任务缺少 id';
  if (typeof t.name !== 'string' || !t.name) return '任务缺少名称';
  if (t.mode !== 'normal' && t.mode !== 'level') return '任务 mode 非法：' + t.mode;
  if (typeof t.points !== 'number' || !(t.points > 0)) return '任务分值必须为正数';
  if (t.mode === 'level') {
    if (!Array.isArray(t.levels) || !t.levels.length) return '分档任务缺少档位';
    for (const l of t.levels) {
      if (!isPlainObject(l) || typeof l.label !== 'string' || !l.label) return '档位缺少名称';
      if (typeof l.points !== 'number' || !(l.points > 0)) return '档位分值必须为正数';
    }
  }
  return null;
}

export function validateState(s) {
  if (!isPlainObject(s)) return { ok: false, error: '数据不是对象' };
  if (s.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: '数据版本不支持：' + s.schemaVersion };
  if (!Array.isArray(s.categories)) return { ok: false, error: '缺少 categories' };
  for (const c of s.categories) {
    if (!isPlainObject(c) || typeof c.id !== 'string' || typeof c.name !== 'string') {
      return { ok: false, error: '分类字段缺失' };
    }
    if (!Array.isArray(c.rewards) || !Array.isArray(c.penalties)) {
      return { ok: false, error: '分类缺少任务列表' };
    }
    for (const t of [...c.rewards, ...c.penalties]) {
      const err = validTask(t);
      if (err) return { ok: false, error: err };
    }
  }
  if (!Array.isArray(s.goods)) return { ok: false, error: '缺少 goods' };
  for (const g of s.goods) {
    if (!isPlainObject(g) || typeof g.id !== 'string' || typeof g.name !== 'string') {
      return { ok: false, error: '商品字段缺失' };
    }
    if (typeof g.points !== 'number' || !(g.points > 0)) return { ok: false, error: '商品分值必须为正数' };
    if (typeof g.emoji !== 'string') return { ok: false, error: '商品缺少 emoji 字段' };
  }
  if (!Array.isArray(s.ledger)) return { ok: false, error: '缺少 ledger' };
  for (const r of s.ledger) {
    if (!isPlainObject(r)) return { ok: false, error: '流水不是对象' };
    if (typeof r.id !== 'string' || !r.id) return { ok: false, error: '流水缺少 id' };
    if (r.type !== 'in' && r.type !== 'out') return { ok: false, error: '流水 type 非法' };
    if (typeof r.points !== 'number' || !(r.points > 0)) return { ok: false, error: '流水分值必须为正数' };
    if (r.source !== 'task' && r.source !== 'exchange') return { ok: false, error: '流水 source 非法' };
    if (typeof r.title !== 'string' || !r.title) return { ok: false, error: '流水缺少标题' };
    if (typeof r.date !== 'string' || !DATE_RE.test(r.date)) return { ok: false, error: '流水日期格式非法' };
    if (typeof r.ts !== 'number') return { ok: false, error: '流水缺少时间戳' };
  }
  return { ok: true };
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validateState(parsed).ok) return parsed;
    }
  } catch (e) { /* 回退到种子数据 */ }
  const fresh = createSeedState();
  saveState(fresh, storage);
  return fresh;
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    state.updatedAt = Date.now();
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || '保存失败' };
  }
}

export function buildExport(state) {
  return {
    app: 'dengdeng-points',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state
  };
}

export function parseImport(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: '不是有效的 JSON 文件' };
  }
  if (!isPlainObject(payload) || payload.app !== 'dengdeng-points') {
    return { ok: false, error: '不是蹬蹬积分的备份文件' };
  }
  const v = validateState(payload.state);
  if (!v.ok) return v;
  return { ok: true, state: payload.state };
}
