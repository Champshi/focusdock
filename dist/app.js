const STORAGE_KEY = "focusdock-demo-v1";
const STATE_VERSION = 2;
const MODULE_COLORS = ["#65e6dc", "#74a7ff", "#ffbd67", "#a98cff", "#72dda5", "#ff7668"];

const ENCOURAGEMENTS = [
  ["做得漂亮。", "你又把一个计划变成了事实。"],
  ["稳稳推进。", "不必一次完成所有事，今天这一项已经足够具体。"],
  ["这一步很扎实。", "完成比完美更重要，你已经为下一步腾出了空间。"],
  ["节奏保持得很好。", "真正可靠的进步，往往就是这样一点点累积起来。"],
  ["任务已落地。", "现在可以安心休息一下，再决定下一项。"]
];

let state = loadState();
let activeTaskFilter = "all";
let activePeriod = "day";
let activeDateKey = localDateKey();
let tickCounter = 0;
let noteSaveTimer = null;
let monitorActiveSeconds = 0;

function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localInputValue(date) {
  const value = new Date(date);
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function todayAt(hours, minutes) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function offsetFromNow(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function dailyNoteTemplate(dateKey = localDateKey()) {
  return `# ${dateKey}\n\n## 今日三件事\n- [ ] \n- [ ] \n- [ ] \n\n## 学习记录\n\n## 晚间复盘\n完成：\n阻碍：\n明天调整：\n`;
}

function createInitialState() {
  const todayKey = localDateKey();
  const initialNote = `# ${todayKey}\n\n## 今日三件事\n- [ ] 完成 Dynamic Programming 练习\n- [ ] 整理统计学 Lecture 4 笔记\n- [ ] 慢跑与拉伸\n\n## 学习记录\n### COMP9123\n状态转移要先写清楚“当前状态代表什么”，再决定遍历顺序。\n\n## 晚间复盘\n完成：\n阻碍：\n明天调整：\n`;
  return {
    version: STATE_VERSION,
    lastActiveDateKey: todayKey,
    tasks: [
      {
        id: "dp",
        title: "完成 Dynamic Programming 练习",
        module: "COMP9123",
        kind: "study",
        startAt: todayAt(13, 30),
        dueAt: offsetFromNow(210),
        plannedMinutes: 60,
        actualSeconds: 2232,
        progress: 62,
        done: false,
        note: "重点检查状态转移方程与边界条件。",
        rewarded: false
      },
      {
        id: "stats",
        title: "整理统计学 Lecture 4 笔记",
        module: "STAT5003",
        kind: "study",
        startAt: todayAt(15, 0),
        dueAt: offsetFromNow(520),
        plannedMinutes: 50,
        actualSeconds: 1080,
        progress: 35,
        done: false,
        note: "整理假设检验流程并补两个例题。",
        rewarded: false
      },
      {
        id: "reading",
        title: "阅读 Database Design Chapter 6",
        module: "COMP5310",
        kind: "study",
        startAt: todayAt(16, 20),
        dueAt: offsetFromNow(1440),
        plannedMinutes: 45,
        actualSeconds: 0,
        progress: 0,
        done: false,
        note: "",
        rewarded: false
      },
      {
        id: "run",
        title: "慢跑与拉伸",
        module: "健康",
        kind: "life",
        startAt: todayAt(18, 30),
        dueAt: offsetFromNow(720),
        plannedMinutes: 40,
        actualSeconds: 0,
        progress: 0,
        done: false,
        note: "轻松跑，不追配速。",
        rewarded: false
      },
      {
        id: "review",
        title: "复习昨日错题",
        module: "COMP9123",
        kind: "study",
        startAt: todayAt(9, 0),
        dueAt: todayAt(11, 0),
        plannedMinutes: 30,
        actualSeconds: 1920,
        progress: 100,
        done: true,
        completedAt: todayAt(9, 44),
        note: "",
        rewarded: true
      },
      {
        id: "email",
        title: "回复小组项目邮件",
        module: "行政",
        kind: "life",
        startAt: todayAt(10, 0),
        dueAt: todayAt(12, 0),
        plannedMinutes: 15,
        actualSeconds: 720,
        progress: 100,
        done: true,
        completedAt: todayAt(10, 18),
        note: "",
        rewarded: true
      },
      {
        id: "plan",
        title: "制定本周学习计划",
        module: "每周规划",
        kind: "planning",
        startAt: todayAt(8, 30),
        dueAt: todayAt(10, 0),
        plannedMinutes: 20,
        actualSeconds: 1140,
        progress: 100,
        done: true,
        completedAt: todayAt(8, 51),
        note: "",
        rewarded: true
      }
    ],
    timer: {
      taskId: "dp",
      running: false,
      elapsedSeconds: 2232,
      lastStartedAt: null
    },
    apps: [
      { id: "vscode", name: "Visual Studio Code", short: "VS", minutes: 72, category: "study", color: "#74a7ff" },
      { id: "safari", name: "Safari", short: "S", minutes: 41, category: "study", color: "#65e6dc" },
      { id: "preview", name: "Preview", short: "P", minutes: 22, category: "study", color: "#ffbd67" },
      { id: "messages", name: "Messages", short: "M", minutes: 12, category: "distract", color: "#72dda5" },
      { id: "music", name: "Music", short: "♪", minutes: 6, category: "neutral", color: "#a98cff" }
    ],
    appMonitor: { running: false, elapsedSeconds: 0 },
    appUsageHistory: {},
    settings: { dailyGoalMinutes: 240, rewardMode: true, reminderMode: true },
    points: 86,
    rewards: [
      { id: "coffee", name: "一杯喜欢的咖啡", description: "完成一个扎实的学习上午后兑换。", cost: 30, symbol: "☕", color: "#ffbd67" },
      { id: "game", name: "无负担游戏之夜", description: "把今晚完整留给休息和娱乐。", cost: 80, symbol: "⌘", color: "#a98cff" },
      { id: "rest", name: "一日休息券", description: "提前安排一整天，不背负任务欠账。", cost: 120, symbol: "☀", color: "#65e6dc" },
      { id: "buffet", name: "一顿自助餐", description: "为一个阶段性里程碑认真庆祝。", cost: 300, symbol: "♨", color: "#ff7668" }
    ],
    ledger: [
      { id: "l1", label: "复习昨日错题", detail: "按时完成", points: 10, at: todayAt(9, 44) },
      { id: "l2", label: "制定本周学习计划", detail: "提前完成", points: 15, at: todayAt(8, 51) },
      { id: "l3", label: "昨日学习目标", detail: "达到目标的 112%", points: 5, at: new Date(Date.now() - 86_400_000).toISOString() }
    ],
    rewardedGoalDates: [localDateKey(new Date(Date.now() - 86_400_000))],
    remindersSeen: {},
    dailyNotes: { [todayKey]: initialNote },
    dailyNote: initialNote
  };
}

function dateKeyFromValue(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

function inferStateDate(savedState) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(savedState.lastActiveDateKey || "")) return savedState.lastActiveDateKey;
  const selected = savedState.tasks?.find((task) => task.id === savedState.timer?.taskId);
  const selectedKey = dateKeyFromValue(selected?.startAt);
  if (selectedKey) return selectedKey;
  const counts = new Map();
  (savedState.tasks || []).forEach((task) => {
    const key = dateKeyFromValue(task.startAt);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] || localDateKey();
}

function archiveAppUsage(savedState, dateKey) {
  if (!dateKey || savedState.appUsageHistory?.[dateKey]) return;
  const entries = (savedState.apps || []).filter((app) => Number(app.minutes) > 0).map((app) => ({
    id: app.id,
    name: app.name,
    minutes: Number(app.minutes) || 0,
    category: app.category
  }));
  if (entries.length) savedState.appUsageHistory[dateKey] = entries;
}

function rollStateToDate(savedState, nextDateKey) {
  const previousDateKey = inferStateDate(savedState);
  if (previousDateKey === nextDateKey) {
    savedState.lastActiveDateKey = nextDateKey;
    return false;
  }

  archiveAppUsage(savedState, previousDateKey);
  savedState.apps.forEach((app) => { app.minutes = 0; });
  savedState.appMonitor = { running: false, elapsedSeconds: 0 };
  savedState.dailyNotes[previousDateKey] ||= savedState.dailyNote || dailyNoteTemplate(previousDateKey);
  savedState.dailyNotes[nextDateKey] ||= dailyNoteTemplate(nextDateKey);
  savedState.dailyNote = savedState.dailyNotes[nextDateKey];
  savedState.lastActiveDateKey = nextDateKey;
  savedState.lastRollover = {
    from: previousDateKey,
    to: nextDateKey,
    at: new Date().toISOString(),
    overdueCount: savedState.tasks.filter((task) => !task.done && !task.archived && dateKeyFromValue(task.startAt) < nextDateKey).length
  };
  return true;
}

function normalizeState(savedState) {
  const defaults = createInitialState();
  const previousDateKey = inferStateDate(savedState);
  const normalized = {
    ...defaults,
    ...savedState,
    version: STATE_VERSION,
    lastActiveDateKey: previousDateKey,
    tasks: Array.isArray(savedState.tasks) ? savedState.tasks : [],
    apps: Array.isArray(savedState.apps) ? savedState.apps : defaults.apps,
    rewards: Array.isArray(savedState.rewards) ? savedState.rewards : defaults.rewards,
    ledger: Array.isArray(savedState.ledger) ? savedState.ledger : [],
    rewardedGoalDates: Array.isArray(savedState.rewardedGoalDates) ? savedState.rewardedGoalDates : [],
    remindersSeen: savedState.remindersSeen && typeof savedState.remindersSeen === "object" ? savedState.remindersSeen : {},
    settings: { ...defaults.settings, ...(savedState.settings || {}) },
    timer: { ...defaults.timer, ...(savedState.timer || {}) },
    appMonitor: { ...defaults.appMonitor, ...(savedState.appMonitor || {}) },
    appUsageHistory: savedState.appUsageHistory && typeof savedState.appUsageHistory === "object" ? savedState.appUsageHistory : {},
    dailyNotes: savedState.dailyNotes && typeof savedState.dailyNotes === "object" ? savedState.dailyNotes : {}
  };

  normalized.tasks.forEach((task) => {
    if (!task.kind) task.kind = task.module?.startsWith("生活") ? "life" : task.module === "规划" ? "planning" : "study";
    task.archived = Boolean(task.archived);
  });
  normalized.dailyNotes[previousDateKey] ||= savedState.dailyNote || dailyNoteTemplate(previousDateKey);
  normalized.dailyNote = normalized.dailyNotes[previousDateKey];

  const selectedTask = normalized.tasks.find((task) => task.id === normalized.timer.taskId);
  normalized.timer.elapsedSeconds = Number(selectedTask?.actualSeconds) || Number(normalized.timer.elapsedSeconds) || 0;
  normalized.timer.running = false;
  normalized.timer.lastStartedAt = null;
  normalized.appMonitor.running = false;
  rollStateToDate(normalized, localDateKey());

  const currentTask = normalized.tasks.find((task) => task.id === normalized.timer.taskId);
  if (!currentTask || currentTask.done || currentTask.archived || dateKeyFromValue(currentTask.startAt) !== localDateKey()) {
    normalized.timer.taskId = null;
    normalized.timer.elapsedSeconds = 0;
  }
  return normalized;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved);
    if (!parsed || ![1, STATE_VERSION].includes(parsed.version) || !Array.isArray(parsed.tasks)) return createInitialState();
    const normalized = normalizeState(parsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return createInitialState();
  }
}

function saveState() {
  state.version = STATE_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDuration(minutes, compact = false) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (!hours) return compact ? `${remainder}m` : `${remainder} 分钟`;
  if (!remainder) return compact ? `${hours}h` : `${hours} 小时`;
  return compact ? `${hours}h ${remainder}m` : `${hours} 小时 ${remainder} 分钟`;
}

function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTime(iso) {
  if (!iso) return "未安排";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function formatShortDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function formatDay(iso) {
  if (!iso) return "未安排";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(iso));
}

function taskActualMinutes(task) {
  return (Number(task.actualSeconds) || 0) / 60;
}

function taskDateKey(task) {
  return dateKeyFromValue(task?.startAt);
}

function tasksForDate(dateKey = localDateKey()) {
  return state.tasks.filter((task) => !task.archived && taskDateKey(task) === dateKey);
}

function todayTasks() {
  return tasksForDate(localDateKey());
}

function overdueTasks() {
  const todayKey = localDateKey();
  return state.tasks.filter((task) => !task.done && !task.archived && taskDateKey(task) && taskDateKey(task) < todayKey);
}

function scheduledTasks() {
  const todayKey = localDateKey();
  return state.tasks.filter((task) => !task.archived && taskDateKey(task) && taskDateKey(task) > todayKey);
}

function historicalTasks() {
  const todayKey = localDateKey();
  return state.tasks.filter((task) => task.archived || (task.done && taskDateKey(task) && taskDateKey(task) < todayKey));
}

function totalActualMinutes(tasks = todayTasks(), studyOnly = true) {
  return tasks.filter((task) => !studyOnly || task.kind === "study").reduce((sum, task) => sum + taskActualMinutes(task), 0);
}

function totalPlannedMinutes(tasks = todayTasks(), studyOnly = false) {
  return tasks.filter((task) => !studyOnly || task.kind === "study").reduce((sum, task) => sum + Number(task.plannedMinutes || 0), 0);
}

function weightedProgress(tasks = todayTasks()) {
  const planned = totalPlannedMinutes(tasks);
  if (!planned) return 0;
  return Math.round(tasks.reduce((sum, task) => sum + task.progress * task.plannedMinutes, 0) / planned);
}

function getCurrentTask() {
  const currentTasks = todayTasks();
  const selected = currentTasks.find((task) => task.id === state.timer.taskId);
  return (selected && !selected.done ? selected : null) || currentTasks.find((task) => !task.done) || null;
}

function currentTimerSeconds(atTime = Date.now()) {
  if (!state.timer.running || !state.timer.lastStartedAt) return state.timer.elapsedSeconds;
  return state.timer.elapsedSeconds + Math.max(0, Math.floor((atTime - state.timer.lastStartedAt) / 1000));
}

function syncTimerToTask(atTime = Date.now()) {
  const task = state.tasks.find((item) => item.id === state.timer.taskId);
  if (!task) return;
  task.actualSeconds = currentTimerSeconds(atTime);
}

function groupTaskData(tasks = todayTasks()) {
  const grouped = new Map();
  tasks.filter((task) => task.kind === "study").forEach((task) => {
    const key = task.module || "其他";
    if (!grouped.has(key)) grouped.set(key, { module: key, planned: 0, actual: 0 });
    const entry = grouped.get(key);
    entry.planned += Number(task.plannedMinutes || 0);
    entry.actual += taskActualMinutes(task);
  });
  return [...grouped.values()].sort((a, b) => b.actual - a.actual).slice(0, 6);
}

function dateKeyOffset(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function currentWeekStartKey() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - mondayOffset);
  return localDateKey(now);
}

function tasksInPeriod(period) {
  const todayKey = localDateKey();
  if (period === "day") return todayTasks();
  if (period === "week") {
    const startKey = currentWeekStartKey();
    const endKey = dateKeyOffset(startKey, 7);
    return state.tasks.filter((task) => taskDateKey(task) >= startKey && taskDateKey(task) < endKey);
  }
  const monthPrefix = todayKey.slice(0, 7);
  return state.tasks.filter((task) => taskDateKey(task)?.startsWith(monthPrefix));
}

function trendData(period, tasks = tasksInPeriod(period)) {
  if (period === "day") {
    const buckets = [0, 4, 8, 12, 16, 20].map((hour) => ({ label: String(hour).padStart(2, "0"), value: 0 }));
    tasks.filter((task) => task.kind === "study").forEach((task) => {
      const hour = new Date(task.startAt).getHours();
      const index = Math.min(buckets.length - 1, Math.floor(hour / 4));
      buckets[index].value += taskActualMinutes(task);
    });
    return buckets;
  }
  if (period === "week") {
    const startKey = currentWeekStartKey();
    const labels = ["一", "二", "三", "四", "五", "六", "日"];
    return labels.map((label, index) => {
      const key = dateKeyOffset(startKey, index);
      const value = tasks.filter((task) => task.kind === "study" && taskDateKey(task) === key).reduce((sum, task) => sum + taskActualMinutes(task), 0);
      return { label, value };
    });
  }
  const weeksInMonth = 5;
  return Array.from({ length: weeksInMonth }, (_, index) => {
    const value = tasks.filter((task) => task.kind === "study" && Math.floor((new Date(task.startAt).getDate() - 1) / 7) === index).reduce((sum, task) => sum + taskActualMinutes(task), 0);
    return { label: `W${index + 1}`, value };
  });
}

function studyAppStats() {
  const total = state.apps.reduce((sum, app) => sum + app.minutes, 0);
  const study = state.apps.filter((app) => app.category === "study").reduce((sum, app) => sum + app.minutes, 0);
  const distracting = state.apps.filter((app) => app.category === "distract").reduce((sum, app) => sum + app.minutes, 0);
  return { total, study, distracting, purity: total ? Math.round((study / total) * 100) : 0 };
}

function setTodayLabel() {
  const date = new Date();
  const formatted = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(date);
  document.querySelector("#todayLabel").textContent = `今天 · ${formatted}`;
  document.querySelector("#noteDateTitle").textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function showToast(title, message, type = "default") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p>`;
  document.querySelector("#toastRegion").append(toast);
  window.setTimeout(() => toast.remove(), 5200);
}

function showEncouragement(task, earnedPoints) {
  const index = Math.abs(task.title.length + state.ledger.length) % ENCOURAGEMENTS.length;
  const [title, message] = ENCOURAGEMENTS[index];
  document.querySelector("#encouragementTitle").textContent = title;
  document.querySelector("#encouragementMessage").textContent = `${task.title}已完成。${message}`;
  document.querySelector("#pointsEarned").textContent = earnedPoints > 0 ? `+${earnedPoints} 积分` : "今日进度已更新";
  safeShowModal(document.querySelector("#encouragementDialog"));
}

function safeShowModal(dialog) {
  if (!dialog.open) dialog.showModal();
}

function renderSummary() {
  syncTimerToTask();
  const currentTasks = todayTasks();
  const actual = totalActualMinutes(currentTasks);
  const dailyGoal = state.settings.dailyGoalMinutes;
  const goalPercent = dailyGoal ? Math.round((actual / dailyGoal) * 100) : 0;
  const progress = weightedProgress(currentTasks);
  const completed = currentTasks.filter((task) => task.done).length;
  const remaining = currentTasks.length - completed;
  const nextReward = [...state.rewards].sort((a, b) => a.cost - b.cost).find((reward) => reward.cost > state.points) || state.rewards[0];
  const gap = Math.max(0, nextReward.cost - state.points);

  document.querySelector("#todayMinutes").textContent = formatDuration(actual, true);
  document.querySelector("#todayGoalBar").style.width = `${Math.min(100, goalPercent)}%`;
  document.querySelector("#todayGoalPercent").textContent = `${goalPercent}%`;
  document.querySelector("#overallProgress").textContent = `${progress}%`;
  document.querySelector("#completedCount").textContent = completed;
  document.querySelector("#remainingCount").textContent = remaining;
  document.querySelector("#pointsBalance").textContent = state.points;
  document.querySelector("#pointsToReward").textContent = gap ? `${gap} pts` : "可兑换";
  document.querySelector("#rewardGlanceGap").textContent = gap ? `${gap} 积分` : "现在可兑换";
  document.querySelector("#rewardGlanceBar").style.width = `${Math.min(100, Math.round((state.points / nextReward.cost) * 100))}%`;
  const weekTasks = tasksInPeriod("week");
  const weeklyPlanned = totalPlannedMinutes(weekTasks, true);
  const weeklyActual = totalActualMinutes(weekTasks, true);
  const weeklyPercent = weeklyPlanned ? Math.round((weeklyActual / weeklyPlanned) * 100) : 0;
  document.querySelector("#weeklyRhythm").textContent = `${Math.min(999, weeklyPercent)}%`;
  document.querySelector("#weeklyRhythmHint").textContent = weeklyPlanned
    ? `本周实际 ${formatDuration(weeklyActual, true)} / 计划 ${formatDuration(weeklyPlanned, true)}`
    : "本周还没有学习计划";

  const overdueCount = overdueTasks().length;
  const notice = document.querySelector("#dayBoundaryNotice");
  notice.hidden = overdueCount === 0;
  if (overdueCount) {
    document.querySelector("#dayBoundaryTitle").textContent = `有 ${overdueCount} 项过往计划尚未完成`;
    document.querySelector("#dayBoundaryMessage").textContent = "它们已移入逾期区，不会计入今天的时间和完成度。";
  }
}

function renderFocus() {
  syncTimerToTask();
  const task = getCurrentTask();
  if (!task) {
    const hasTodayTasks = todayTasks().length > 0;
    document.querySelector("#focusModule").textContent = "TODAY";
    document.querySelector("#focusTaskTitle").textContent = hasTodayTasks ? "今天的任务都完成了" : "今天还没有计划";
    document.querySelector("#focusTaskMeta").textContent = hasTodayTasks ? "现在可以安心休息，或者添加一个轻量计划。" : "添加一个新计划，或从逾期区移入今天。";
    document.querySelector("#timerDisplay").textContent = "00:00";
    document.querySelector("#focusProgressBar").style.width = hasTodayTasks ? "100%" : "0%";
    document.querySelector("#focusProgressLabel").textContent = `${hasTodayTasks ? 100 : 0}% 今日清单`;
    const toggle = document.querySelector("#timerToggleButton");
    toggle.disabled = true;
    toggle.innerHTML = hasTodayTasks ? "✓ 已完成" : "<span aria-hidden=\"true\">▶</span>开始";
    document.querySelector("#finishFocusButton").disabled = true;
    const menuToggle = document.querySelector("#menuPauseButton");
    menuToggle.disabled = true;
    menuToggle.innerHTML = "<span aria-hidden=\"true\">▶</span>";
    menuToggle.setAttribute("aria-label", hasTodayTasks ? "今日计划已完成" : "今天还没有计划");
    const status = document.querySelector(".status-pill");
    status.innerHTML = `<i></i> ${hasTodayTasks ? "今日已完成" : "今日尚未开始"}`;
    status.classList.add("paused");
    document.querySelector("#menuBarText").textContent = hasTodayTasks ? "✓ 今日计划已完成" : "◫ 今天还没有计划";
    return;
  }
  document.querySelector("#timerToggleButton").disabled = false;
  document.querySelector("#finishFocusButton").disabled = false;
  document.querySelector("#menuPauseButton").disabled = false;
  if (state.timer.taskId !== task.id && !state.timer.running) {
    state.timer.taskId = task.id;
    state.timer.elapsedSeconds = Number(task.actualSeconds) || 0;
  }
  const elapsed = currentTimerSeconds();
  const timeAchievement = task.plannedMinutes ? Math.round((elapsed / 60 / task.plannedMinutes) * 100) : 0;
  document.querySelector("#focusModule").textContent = task.module;
  document.querySelector("#focusTaskTitle").textContent = task.title;
  document.querySelector("#focusTaskMeta").textContent = `计划 ${task.plannedMinutes} 分钟 · DDL ${formatShortDate(task.dueAt)}`;
  document.querySelector("#timerDisplay").textContent = formatClock(elapsed);
  document.querySelector("#focusProgressBar").style.width = `${Math.min(100, timeAchievement)}%`;
  document.querySelector("#focusProgressLabel").textContent = `${timeAchievement}% 时间目标 · 任务 ${task.progress}%`;
  const status = document.querySelector(".status-pill");
  status.innerHTML = `<i></i> ${state.timer.running ? "正在专注" : "计时已暂停"}`;
  status.classList.toggle("paused", !state.timer.running);
  const toggle = document.querySelector("#timerToggleButton");
  toggle.innerHTML = state.timer.running ? `<span aria-hidden="true">Ⅱ</span>暂停` : `<span aria-hidden="true">▶</span>继续`;
  document.querySelector("#menuBarText").textContent = `${state.timer.running ? "⏱" : "◫"} ${formatClock(elapsed)} · ${task.title}`;
  document.querySelector("#menuPauseButton").innerHTML = `<span aria-hidden="true">${state.timer.running ? "Ⅱ" : "▶"}</span>`;
  document.querySelector("#menuPauseButton").setAttribute("aria-label", state.timer.running ? "暂停当前计时" : "继续当前计时");
}

function renderTasks() {
  const currentTasks = todayTasks();
  const views = {
    all: { eyebrow: "TODAY", title: "今日计划", tasks: currentTasks },
    pending: { eyebrow: "TODAY · PENDING", title: "今日待完成", tasks: currentTasks.filter((task) => !task.done) },
    done: { eyebrow: "TODAY · DONE", title: "今日已完成", tasks: currentTasks.filter((task) => task.done) },
    overdue: { eyebrow: "OVERDUE", title: "逾期任务", tasks: overdueTasks() },
    scheduled: { eyebrow: "UPCOMING", title: "未来计划", tasks: scheduledTasks() },
    history: { eyebrow: "HISTORY", title: "历史记录", tasks: historicalTasks() }
  };
  const view = views[activeTaskFilter] || views.all;
  const filtered = [...view.tasks].sort((a, b) => activeTaskFilter === "history"
    ? new Date(b.completedAt || b.carriedForwardAt || b.startAt) - new Date(a.completedAt || a.carriedForwardAt || a.startAt)
    : new Date(a.startAt) - new Date(b.startAt));
  const container = document.querySelector("#taskList");
  document.querySelector("#taskPanelEyebrow").textContent = view.eyebrow;
  document.querySelector("#taskPanelTitle").textContent = view.title;
  if (!filtered.length) {
    const emptyCopy = activeTaskFilter === "overdue"
      ? ["没有逾期任务", "过往未完成计划会安全地保留在这里。"]
      : activeTaskFilter === "scheduled"
        ? ["没有未来计划", "设置未来日期的任务会显示在这里。"]
      : activeTaskFilter === "history"
        ? ["还没有历史记录", "完成或顺延的往日计划会显示在这里。"]
        : ["这里暂时没有任务", "添加今天的计划，或从逾期区顺延一项。"];
    container.innerHTML = `<div class="empty-state"><strong>${emptyCopy[0]}</strong><p>${emptyCopy[1]}</p></div>`;
    return;
  }
  container.innerHTML = filtered.map((task) => `
    <article class="task-row ${task.done ? "done" : ""} ${activeTaskFilter === "overdue" ? "overdue" : ""} ${task.archived ? "archived" : ""}" data-task-id="${escapeHTML(task.id)}">
      ${task.archived
        ? `<span class="task-check checked" aria-label="已顺延">↺</span>`
        : `<button class="task-check ${task.done ? "checked" : ""}" data-action="toggle-task" aria-label="${task.done ? "标记为未完成" : "标记为已完成"}">${task.done ? "✓" : ""}</button>`}
      <button class="task-copy task-edit-button" data-action="edit-task">
        <strong>${escapeHTML(task.title)}</strong>
        <small>${task.archived ? "已顺延 · " : ""}${taskKindLabel(task.kind)} · ${escapeHTML(taskModuleLabel(task))} · 计划 ${task.plannedMinutes} 分钟 · 实际 ${Math.round(taskActualMinutes(task))} 分钟</small>
      </button>
      <div class="task-side">
        <span class="task-time">${["overdue", "scheduled", "history"].includes(activeTaskFilter) ? formatDay(task.startAt) : formatTime(task.startAt)}</span>
        <span class="progress-chip">${task.progress}%</span>
        ${activeTaskFilter === "overdue"
          ? `<button class="carry-task-button" data-action="carry-task" aria-label="将${escapeHTML(task.title)}移至今天">移至今天</button>`
          : task.done || task.archived || ["scheduled", "history"].includes(activeTaskFilter) ? "" : `<button class="task-start" data-action="start-task" aria-label="开始${escapeHTML(task.title)}">▶</button>`}
      </div>
    </article>`).join("");
}

function renderUpcoming() {
  const pending = todayTasks().filter((task) => !task.done && task.id !== state.timer.taskId).sort((a, b) => new Date(a.startAt) - new Date(b.startAt)).slice(0, 3);
  document.querySelector("#upcomingTimeline").innerHTML = pending.length ? pending.map((task) => `
    <div class="timeline-item">
      <span class="timeline-time">${formatTime(task.startAt)}</span>
      <div class="timeline-copy"><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(task.module)} · ${task.plannedMinutes} 分钟</small></div>
    </div>`).join("") : `<div class="empty-state compact"><strong>没有后续计划</strong><p>今天可以从容收尾。</p></div>`;
}

function categoryLabel(category) {
  return { study: "学习相关", neutral: "中性", distract: "可能分心" }[category] || "未分类";
}

function taskKindLabel(kind) {
  return { study: "学习", life: "生活", planning: "规划" }[kind] || "学习";
}

function taskModuleLabel(task) {
  const module = String(task.module || "其他");
  if (task.kind === "life") return module.replace(/^生活\s*·\s*/, "");
  if (task.kind === "planning" && module === "规划") return "每周规划";
  return module;
}

function renderAppGlance() {
  const topApps = [...state.apps].sort((a, b) => b.minutes - a.minutes).slice(0, 3);
  document.querySelector("#appGlanceList").innerHTML = topApps.map((app) => `
    <div class="app-glance-row">
      <span class="app-icon" style="--app-color:${app.color}">${escapeHTML(app.short)}</span>
      <span><strong>${escapeHTML(app.name)}</strong><small>${categoryLabel(app.category)}</small></span>
      <span>${Math.round(app.minutes)}m</span>
    </div>`).join("");
  const stats = studyAppStats();
  document.querySelector(".insight-note p").innerHTML = `<strong>专注度 ${stats.purity}%</strong><br />学习类应用占被监测时间的大部分。`;
}

function renderAppUsage() {
  const stats = studyAppStats();
  document.querySelector("#studyAppTime").textContent = formatDuration(stats.study, true);
  document.querySelector("#distractingAppTime").textContent = formatDuration(stats.distracting, true);
  document.querySelector("#studyAppBar").style.width = `${Math.min(100, stats.purity)}%`;
  document.querySelector("#studyAppPercent").textContent = `${stats.purity}%`;
  document.querySelector("#analyticsFocusScore").textContent = `${stats.purity}%`;
  document.querySelector("#monitorStatus").textContent = state.appMonitor.running ? "采样中" : "未开始";
  document.querySelector("#monitorElapsed").textContent = formatClock(state.appMonitor.elapsedSeconds);
  document.querySelector("#appMonitorButton").innerHTML = state.appMonitor.running
    ? `<span aria-hidden="true">Ⅱ</span>暂停 Demo 采样`
    : `<span aria-hidden="true">▶</span>开始 Demo 采样`;

  document.querySelector("#appUsageTable").innerHTML = state.apps.map((app) => `
    <div class="app-table-row" data-app-id="${escapeHTML(app.id)}">
      <div class="app-identity">
        <span class="app-icon" style="--app-color:${app.color}">${escapeHTML(app.short)}</span>
        <span><strong>${escapeHTML(app.name)}</strong><small>${app.id === "focusdock" ? "当前网页前台采样" : "Demo 示例 / 手动记录"}</small></span>
      </div>
      <select class="category-select" data-action="classify-app" aria-label="${escapeHTML(app.name)}分类">
        <option value="study" ${app.category === "study" ? "selected" : ""}>学习相关</option>
        <option value="neutral" ${app.category === "neutral" ? "selected" : ""}>中性</option>
        <option value="distract" ${app.category === "distract" ? "selected" : ""}>可能分心</option>
      </select>
      <span class="app-minutes">${Math.round(app.minutes)}m</span>
      <div class="minute-stepper">
        <button data-action="adjust-app" data-delta="-5" aria-label="减少5分钟">−5</button>
        <button data-action="adjust-app" data-delta="5" aria-label="增加5分钟">＋5</button>
      </div>
    </div>`).join("");

  const maxMinutes = Math.max(1, ...state.apps.map((app) => app.minutes));
  document.querySelector("#appUsageChart").innerHTML = [...state.apps].sort((a, b) => b.minutes - a.minutes).map((app) => `
    <div class="horizontal-row">
      <div class="horizontal-row-head"><span>${escapeHTML(app.name)}</span><span>${Math.round(app.minutes)}m</span></div>
      <div class="horizontal-track"><span style="--bar-color:${app.color};width:${Math.max(2, (app.minutes / maxMinutes) * 100)}%"></span></div>
    </div>`).join("");
}

function analyticsData(period) {
  return groupTaskData(tasksInPeriod(period));
}

function renderAnalytics() {
  const periodTasks = tasksInPeriod(activePeriod);
  const data = analyticsData(activePeriod);
  const planned = data.reduce((sum, item) => sum + item.planned, 0);
  const actual = data.reduce((sum, item) => sum + item.actual, 0);
  const completion = weightedProgress(periodTasks);
  const taskLabel = `${periodTasks.filter((task) => task.done).length} / ${periodTasks.length} 项完成`;
  document.querySelector("#analyticsActual").textContent = formatDuration(actual, true);
  document.querySelector("#analyticsPlanned").textContent = `/ ${formatDuration(planned, true)}`;
  document.querySelector("#analyticsCompletion").textContent = `${completion}%`;
  document.querySelector("#analyticsTaskCount").textContent = taskLabel;
  document.querySelector("#analyticsDelta").textContent = actual >= planned ? `超过计划 ${formatDuration(actual - planned, true)}` : `距离计划 ${formatDuration(planned - actual, true)}`;
  renderBarChart(data);
  renderDonutChart(data);
  renderTrendChart(trendData(activePeriod, periodTasks));
}

function renderBarChart(data) {
  const max = Math.max(1, ...data.flatMap((item) => [item.planned, item.actual]));
  const container = document.querySelector("#moduleBarChart");
  container.style.setProperty("--bar-count", data.length);
  if (!data.length) {
    container.innerHTML = `<div class="empty-state"><strong>暂无可统计的学习任务</strong><p>添加计划并开始计时后，这里会自动生成图表。</p></div>`;
    return;
  }
  container.innerHTML = data.map((item) => `
    <div class="bar-group">
      <div class="bar-column plan" style="height:${Math.max(2, (item.planned / max) * 88)}%" data-value="计划 ${Math.round(item.planned)} 分钟"></div>
      <div class="bar-column actual" style="height:${Math.max(2, (item.actual / max) * 88)}%" data-value="实际 ${Math.round(item.actual)} 分钟"></div>
      <div class="bar-label" title="${escapeHTML(item.module)}">${escapeHTML(item.module)}</div>
    </div>`).join("");
}

function renderDonutChart(data) {
  const total = data.reduce((sum, item) => sum + item.actual, 0);
  let cursor = 0;
  const segments = data.map((item, index) => {
    const start = cursor;
    cursor += total ? (item.actual / total) * 100 : 0;
    return `${MODULE_COLORS[index % MODULE_COLORS.length]} ${start}% ${cursor}%`;
  });
  document.querySelector("#moduleDonut").style.background = total ? `conic-gradient(${segments.join(",")})` : "rgba(255,255,255,.06)";
  document.querySelector("#donutTotal").textContent = Math.round(total);
  document.querySelector("#donutLegend").innerHTML = data.map((item, index) => `
    <div class="donut-legend-item" style="--legend-color:${MODULE_COLORS[index % MODULE_COLORS.length]}">
      <i></i><span>${escapeHTML(item.module)}</span><strong>${total ? Math.round((item.actual / total) * 100) : 0}%</strong>
    </div>`).join("");
}

function renderTrendChart(data) {
  const width = 600;
  const height = 166;
  const insetX = 22;
  const insetY = 22;
  const max = Math.max(1, ...data.map((item) => item.value));
  const step = data.length > 1 ? (width - insetX * 2) / (data.length - 1) : 0;
  const points = data.map((item, index) => ({ ...item, x: insetX + index * step, y: height - insetY - (item.value / max) * (height - insetY * 2) }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${insetX},${height - insetY} ${polyline} ${points.at(-1).x},${height - insetY}`;
  document.querySelector("#trendChart").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#65e6dc" stop-opacity=".22"/><stop offset="1" stop-color="#65e6dc" stop-opacity="0"/></linearGradient></defs>
      <line x1="${insetX}" y1="${height - insetY}" x2="${width - insetX}" y2="${height - insetY}" stroke="rgba(170,205,234,.12)"/>
      <polygon points="${area}" fill="url(#trend-fill)"/>
      <polyline points="${polyline}" fill="none" stroke="#65e6dc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#0d1d30" stroke="#65e6dc" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${point.x}" y="${height - 4}" text-anchor="middle">${escapeHTML(point.label)}</text>`).join("")}
    </svg>`;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const average = data.reduce((sum, item) => sum + item.value, 0) / data.length;
  document.querySelector("#trendAverage").textContent = activePeriod === "day"
    ? `今日 ${formatDuration(total, true)}`
    : activePeriod === "month" ? `周均 ${formatDuration(average, true)}` : `日均 ${formatDuration(average, true)}`;
}

function renderRewards() {
  document.querySelector("#rewardBalanceLarge").textContent = state.points;
  document.querySelector("#rewardGrid").innerHTML = state.rewards.map((reward) => `
    <article class="reward-card">
      <div class="reward-card-symbol" style="--reward-color:${reward.color}">${escapeHTML(reward.symbol)}</div>
      <h3>${escapeHTML(reward.name)}</h3>
      <p>${escapeHTML(reward.description)}</p>
      <div class="reward-card-footer">
        <span class="reward-cost">${reward.cost} pts</span>
        <button class="redeem-button" data-reward-id="${escapeHTML(reward.id)}" ${state.points < reward.cost ? "disabled" : ""}>${state.points < reward.cost ? "积分不足" : "兑换"}</button>
      </div>
    </article>`).join("");

  const nextReward = [...state.rewards].sort((a, b) => a.cost - b.cost).find((reward) => reward.cost > state.points);
  if (nextReward) {
    document.querySelector("#levelProgressText").textContent = `${state.points} / ${nextReward.cost}`;
    document.querySelector("#levelProgressBar").style.width = `${Math.min(100, (state.points / nextReward.cost) * 100)}%`;
    document.querySelector("#levelHint").textContent = `再获得 ${nextReward.cost - state.points} 积分解锁${nextReward.name}`;
  } else {
    document.querySelector("#levelProgressText").textContent = `${state.points} 积分`;
    document.querySelector("#levelProgressBar").style.width = "100%";
    document.querySelector("#levelHint").textContent = "所有 Demo 奖励均可兑换";
  }
  document.querySelector("#pointsLedger").innerHTML = state.ledger.slice(0, 8).map((entry) => `
    <div class="ledger-row">
      <span><strong>${escapeHTML(entry.label)}</strong><small>${escapeHTML(entry.detail)} · ${formatShortDate(entry.at)}</small></span>
      <span class="ledger-points ${entry.points < 0 ? "negative" : ""}">${entry.points > 0 ? "+" : ""}${entry.points}</span>
    </div>`).join("");
}

function renderNotes() {
  const textarea = document.querySelector("#dailyNote");
  state.dailyNotes[localDateKey()] ||= dailyNoteTemplate();
  state.dailyNote = state.dailyNotes[localDateKey()];
  if (document.activeElement !== textarea) textarea.value = state.dailyNote;
  document.querySelector("#linkedTaskList").innerHTML = todayTasks().slice(0, 6).map((task, index) => `
    <div class="linked-task" style="--task-color:${MODULE_COLORS[index % MODULE_COLORS.length]}">
      <i></i><strong>${escapeHTML(task.title)}</strong><span>${task.progress}%</span>
    </div>`).join("") || `<div class="empty-state compact"><strong>今天暂无关联计划</strong><p>添加计划后会显示在这里。</p></div>`;
}

function renderAll() {
  renderSummary();
  renderFocus();
  renderTasks();
  renderUpcoming();
  renderAppGlance();
  renderAppUsage();
  renderAnalytics();
  renderRewards();
  renderNotes();
}

function openTaskDialog(task = null) {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60_000);
  document.querySelector("#taskDialogTitle").textContent = task ? "调整计划" : "添加计划";
  document.querySelector("#taskId").value = task?.id || "";
  document.querySelector("#taskTitle").value = task?.title || "";
  document.querySelector("#taskType").value = task?.kind || "study";
  document.querySelector("#taskModule").value = task?.module || "";
  document.querySelector("#taskStart").value = localInputValue(task?.startAt || now);
  document.querySelector("#taskDue").value = localInputValue(task?.dueAt || oneHourLater);
  document.querySelector("#taskPlanned").value = task?.plannedMinutes || 45;
  document.querySelector("#taskActual").value = task ? Math.round(taskActualMinutes(task)) : 0;
  document.querySelector("#taskProgress").value = task?.progress || 0;
  document.querySelector("#taskProgressOutput").textContent = `${task?.progress || 0}%`;
  document.querySelector("#taskNote").value = task?.note || "";
  document.querySelector("#deleteTaskButton").hidden = !task;
  safeShowModal(document.querySelector("#taskDialog"));
  document.querySelector("#taskTitle").focus();
}

function addLedger(label, detail, points) {
  state.ledger.unshift({ id: uid("ledger"), label, detail, points, at: new Date().toISOString() });
  state.points = Math.max(0, state.points + points);
}

function awardTask(task) {
  if (!state.settings.rewardMode || task.rewarded) return 0;
  let points = 10;
  let detail = "按时完成";
  const earlyHours = (new Date(task.dueAt).getTime() - Date.now()) / 3_600_000;
  if (earlyHours >= 24) {
    points += 5;
    detail = "提前至少 24 小时完成";
  } else if (earlyHours < 0) {
    detail = "完成逾期任务";
  }
  task.rewarded = true;
  addLedger(task.title, detail, points);
  return points;
}

function maybeAwardDailyGoal() {
  if (!state.settings.rewardMode) return 0;
  const key = localDateKey();
  if (state.rewardedGoalDates.includes(key)) return 0;
  if (totalActualMinutes() < state.settings.dailyGoalMinutes * 1.1) return 0;
  state.rewardedGoalDates.push(key);
  addLedger("今日学习目标", "达到目标的 110%", 5);
  showToast("获得每日超额奖励", "已达到学习目标的 110%，奖励 5 积分。", "reward");
  return 5;
}

function completeTask(task) {
  task.done = true;
  task.progress = 100;
  task.completedAt = new Date().toISOString();
  const earned = awardTask(task) + maybeAwardDailyGoal();
  if (state.timer.taskId === task.id) {
    pauseTimer();
    const next = todayTasks().find((item) => !item.done);
    state.timer.taskId = next?.id || null;
    state.timer.elapsedSeconds = next?.actualSeconds || 0;
  }
  saveState();
  renderAll();
  showEncouragement(task, earned);
}

function toggleTask(task) {
  if (!task.done) {
    completeTask(task);
    return;
  }
  task.done = false;
  task.progress = Math.min(95, task.progress);
  delete task.completedAt;
  saveState();
  renderAll();
  showToast("任务已恢复", "原有积分记录会保留，但再次完成不会重复计分。", "info");
}

function setTaskFilter(filter) {
  activeTaskFilter = ["all", "pending", "done", "overdue", "scheduled", "history"].includes(filter) ? filter : "all";
  document.querySelectorAll("[data-task-filter]").forEach((item) => item.classList.toggle("active", item.dataset.taskFilter === activeTaskFilter));
  renderTasks();
}

function carryTaskToToday(task) {
  if (!task || task.done || task.archived || !overdueTasks().some((item) => item.id === task.id)) return;
  const now = new Date();
  const due = new Date(now.getTime() + Math.max(1, Number(task.plannedMinutes) || 1) * 60_000);
  const carriedTask = {
    ...task,
    id: uid("task"),
    startAt: now.toISOString(),
    dueAt: due.toISOString(),
    actualSeconds: 0,
    progress: 0,
    done: false,
    archived: false,
    rewarded: false,
    carriedFromTaskId: task.id,
    note: `${task.note ? `${task.note}\n\n` : ""}从 ${formatDay(task.startAt)} 顺延；原记录为 ${task.progress}% / ${Math.round(taskActualMinutes(task))} 分钟。`
  };
  delete carriedTask.completedAt;
  delete carriedTask.carriedForwardAt;
  delete carriedTask.carriedForwardToTaskId;
  task.archived = true;
  task.carriedForwardAt = now.toISOString();
  task.carriedForwardToTaskId = carriedTask.id;
  state.tasks.unshift(carriedTask);
  saveState();
  renderAll();
  setTaskFilter("all");
  showToast("已移至今天", `${task.title}从现在开始重新计时；昨日进度已保留在历史记录。`, "success");
}

function startTask(task) {
  if (state.timer.running) pauseTimer();
  state.timer.taskId = task.id;
  state.timer.elapsedSeconds = Number(task.actualSeconds) || 0;
  state.timer.running = true;
  state.timer.lastStartedAt = Date.now();
  saveState();
  renderAll();
  showToast("开始专注", `${task.title} · 计划 ${task.plannedMinutes} 分钟`, "focus");
}

function pauseTimer() {
  if (!state.timer.running) return;
  state.timer.elapsedSeconds = currentTimerSeconds();
  state.timer.running = false;
  state.timer.lastStartedAt = null;
  syncTimerToTask();
  maybeAwardDailyGoal();
  saveState();
}

function toggleTimer() {
  const task = getCurrentTask();
  if (!task) return;
  if (state.timer.running) {
    pauseTimer();
    showToast("计时已暂停", "实际学习时间已经保存，可以稍后继续。", "info");
  } else {
    state.timer.elapsedSeconds = Number(task.actualSeconds) || 0;
    state.timer.running = true;
    state.timer.lastStartedAt = Date.now();
    saveState();
  }
  renderAll();
}

function saveTaskFromForm(event) {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const id = document.querySelector("#taskId").value;
  const existing = state.tasks.find((task) => task.id === id);
  const wasDone = existing?.done || false;
  const progress = Number(document.querySelector("#taskProgress").value);
  const values = {
    title: document.querySelector("#taskTitle").value.trim(),
    kind: document.querySelector("#taskType").value,
    module: document.querySelector("#taskModule").value.trim(),
    startAt: new Date(document.querySelector("#taskStart").value).toISOString(),
    dueAt: new Date(document.querySelector("#taskDue").value).toISOString(),
    plannedMinutes: Number(document.querySelector("#taskPlanned").value),
    actualSeconds: Number(document.querySelector("#taskActual").value) * 60,
    progress,
    done: progress >= 100,
    note: document.querySelector("#taskNote").value.trim()
  };

  let task;
  if (existing) {
    Object.assign(existing, values);
    task = existing;
    if (state.timer.taskId === task.id && !state.timer.running) state.timer.elapsedSeconds = task.actualSeconds;
  } else {
    task = { id: uid("task"), rewarded: false, ...values };
    state.tasks.unshift(task);
  }
  document.querySelector("#taskDialog").close();
  let earned = 0;
  if (!wasDone && task.done) {
    task.completedAt = new Date().toISOString();
    earned = awardTask(task);
  }
  maybeAwardDailyGoal();
  saveState();
  renderAll();
  if (!wasDone && task.done) showEncouragement(task, earned);
  else showToast(existing ? "计划已更新" : "计划已添加", "时间、进度和关联笔记已经保存。", "success");
}

function deleteCurrentTask() {
  const id = document.querySelector("#taskId").value;
  const task = state.tasks.find((item) => item.id === id);
  if (!task || !window.confirm(`确定删除“${task.title}”吗？`)) return;
  if (state.timer.taskId === id) pauseTimer();
  state.tasks = state.tasks.filter((item) => item.id !== id);
  if (state.timer.taskId === id) {
    state.timer.taskId = todayTasks().find((item) => !item.done)?.id || null;
    state.timer.elapsedSeconds = state.tasks.find((item) => item.id === state.timer.taskId)?.actualSeconds || 0;
  }
  document.querySelector("#taskDialog").close();
  saveState();
  renderAll();
  showToast("任务已删除", "相关计时不会再计入今日统计。", "info");
}

function navigate(viewName) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const active = panel.dataset.viewPanel === viewName;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("系统通知不可用", "到点提醒仍会以应用内弹窗显示。", "info");
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      new Notification("FocusDock 提醒已开启", { body: "DDL 和计划时间会在页面运行时提醒你。" });
      showToast("提醒已开启", "Demo 已发送一条测试通知。", "success");
    } else {
      showToast("未获得通知权限", "到点时仍会显示应用内提醒。", "info");
    }
  });
}

function checkReminders() {
  if (!state.settings.reminderMode) return;
  const now = Date.now();
  const todayKey = localDateKey();
  const overdue = overdueTasks();
  const overdueKey = `overdue-summary:${todayKey}`;
  if (overdue.length && !state.remindersSeen[overdueKey]) {
    state.remindersSeen[overdueKey] = true;
    showToast("有过往任务待处理", `${overdue.length} 项计划已放入逾期区；可以逐项移至今天，不会污染今日进度。`, "reminder");
  }
  todayTasks().filter((task) => !task.done).forEach((task) => {
    const due = new Date(task.dueAt).getTime();
    const minutesUntil = (due - now) / 60_000;
    const kind = minutesUntil <= 0 ? "due" : minutesUntil <= 15 ? "soon" : null;
    if (!kind) return;
    const key = `${task.id}:${kind}:${todayKey}`;
    if (state.remindersSeen[key]) return;
    state.remindersSeen[key] = true;
    const title = kind === "due" ? "DDL 已到" : "还有 15 分钟到 DDL";
    const message = kind === "due" ? `${task.title}还未完成。先做一个最小步骤，再决定是否调整计划。` : `${task.title}即将到期，建议现在收尾或重新安排。`;
    showToast(title, message, "reminder");
    if ("Notification" in window && Notification.permission === "granted") new Notification(`FocusDock · ${title}`, { body: message });
  });
  saveState();
}

function toggleAppMonitor() {
  state.appMonitor.running = !state.appMonitor.running;
  if (!state.apps.some((app) => app.id === "focusdock")) {
    state.apps.push({ id: "focusdock", name: "FocusDock Demo", short: "FD", minutes: 0, category: "study", color: "#65e6dc" });
  }
  saveState();
  renderAppUsage();
  renderAppGlance();
  showToast(state.appMonitor.running ? "Demo 采样已开始" : "Demo 采样已暂停", state.appMonitor.running ? "仅在本页面位于前台时累计时间。" : "采样时间已保存在当前浏览器。", "info");
}

function addAppRecord() {
  const name = window.prompt("输入应用名称，例如 Anki");
  if (!name?.trim()) return;
  const clean = name.trim().slice(0, 48);
  state.apps.push({ id: uid("app"), name: clean, short: clean.slice(0, 2).toUpperCase(), minutes: 0, category: "study", color: MODULE_COLORS[state.apps.length % MODULE_COLORS.length] });
  saveState();
  renderAll();
}

function redeemReward(reward) {
  if (state.points < reward.cost) return;
  if (!window.confirm(`使用 ${reward.cost} 积分兑换“${reward.name}”？`)) return;
  addLedger(reward.name, "兑换奖励", -reward.cost);
  saveState();
  renderAll();
  showToast("兑换成功", `${reward.name}已加入你的奖励记录。请真的去享受它。`, "reward");
}

function saveSettings(event) {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  state.settings.dailyGoalMinutes = Number(document.querySelector("#dailyGoalInput").value) || 240;
  state.settings.rewardMode = document.querySelector("#rewardModeInput").checked;
  state.settings.reminderMode = document.querySelector("#reminderModeInput").checked;
  saveState();
  document.querySelector("#settingsDialog").close();
  renderAll();
  showToast("设置已保存", "目标、提醒与奖励规则已经更新。", "success");
}

function openSettings() {
  document.querySelector("#dailyGoalInput").value = state.settings.dailyGoalMinutes;
  document.querySelector("#rewardModeInput").checked = state.settings.rewardMode;
  document.querySelector("#reminderModeInput").checked = state.settings.reminderMode;
  safeShowModal(document.querySelector("#settingsDialog"));
}

function exportData() {
  syncTimerToTask();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `focusdock-${localDateKey()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("数据已导出", "JSON 文件包含任务、笔记、应用使用和积分记录。", "success");
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (![1, STATE_VERSION].includes(parsed.version) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.apps)) throw new Error("invalid");
      state = normalizeState(parsed);
      activeDateKey = localDateKey();
      saveState();
      setTodayLabel();
      renderAll();
      document.querySelector("#settingsDialog").close();
      showToast("导入成功", "Demo 数据已经恢复。", "success");
    } catch {
      showToast("无法导入", "请选择由 FocusDock Demo 导出的有效 JSON 文件。", "reminder");
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!window.confirm("确定恢复初始 Demo 数据吗？你当前的本地修改将被清除。")) return;
  state = createInitialState();
  activeDateKey = localDateKey();
  activeTaskFilter = "all";
  saveState();
  document.querySelector("#settingsDialog").close();
  renderAll();
  showToast("Demo 已重置", "示例任务和统计已经恢复。", "info");
}

function insertIntoNote(text) {
  const textarea = document.querySelector("#dailyNote");
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value = `${textarea.value.slice(0, start)}${text}${textarea.value.slice(end)}`;
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
  persistNote();
}

function persistNote() {
  const status = document.querySelector("#autosaveStatus");
  status.innerHTML = `<i></i>正在保存…`;
  window.clearTimeout(noteSaveTimer);
  noteSaveTimer = window.setTimeout(() => {
    state.dailyNote = document.querySelector("#dailyNote").value;
    state.dailyNotes[localDateKey()] = state.dailyNote;
    saveState();
    status.innerHTML = `<i></i>已自动保存`;
  }, 420);
}

function focusTaskNote() {
  const task = getCurrentTask();
  navigate("notes");
  const heading = `\n### ${task?.module || "学习记录"} · ${task?.title || "新记录"}\n`;
  if (task && !state.dailyNote.includes(`### ${task.module} · ${task.title}`)) {
    state.dailyNote += `${heading}${task.note || ""}\n`;
    state.dailyNotes[localDateKey()] = state.dailyNote;
    saveState();
    renderNotes();
  }
  document.querySelector("#dailyNote").focus();
}

function wireEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  document.querySelectorAll("[data-jump]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.jump)));
  document.querySelectorAll("[data-task-filter]").forEach((button) => button.addEventListener("click", () => setTaskFilter(button.dataset.taskFilter)));
  document.querySelector("#showOverdueButton").addEventListener("click", () => setTaskFilter("overdue"));
  document.querySelectorAll("[data-period]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-period]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activePeriod = button.dataset.period;
    renderAnalytics();
  }));

  document.querySelector("#quickAddButton").addEventListener("click", () => openTaskDialog());
  document.querySelector("#taskProgress").addEventListener("input", (event) => { document.querySelector("#taskProgressOutput").textContent = `${event.target.value}%`; });
  document.querySelector("#taskForm").addEventListener("submit", saveTaskFromForm);
  document.querySelector("#deleteTaskButton").addEventListener("click", deleteCurrentTask);
  document.querySelector("#timerToggleButton").addEventListener("click", toggleTimer);
  document.querySelector("#menuPauseButton").addEventListener("click", toggleTimer);
  document.querySelector("#finishFocusButton").addEventListener("click", () => { const task = getCurrentTask(); if (task) completeTask(task); });
  document.querySelector("#focusNoteButton").addEventListener("click", focusTaskNote);
  document.querySelector("#notificationButton").addEventListener("click", requestNotifications);
  document.querySelector("#settingsButton").addEventListener("click", openSettings);
  document.querySelector("#settingsForm").addEventListener("submit", saveSettings);
  document.querySelector("#exportDataButton").addEventListener("click", exportData);
  document.querySelector("#importDataInput").addEventListener("change", (event) => importData(event.target.files[0]));
  document.querySelector("#resetDataButton").addEventListener("click", resetData);
  document.querySelector("#rewardRulesButton").addEventListener("click", () => safeShowModal(document.querySelector("#rulesDialog")));
  document.querySelector("#appMonitorButton").addEventListener("click", toggleAppMonitor);
  document.querySelector("#addAppButton").addEventListener("click", addAppRecord);
  document.querySelector("#dailyNote").addEventListener("input", persistNote);
  document.querySelectorAll("[data-note-insert]").forEach((button) => button.addEventListener("click", () => insertIntoNote(button.dataset.noteInsert)));
  document.querySelector("#insertReflectionButton").addEventListener("click", () => insertIntoNote("\n## 晚间复盘\n完成：\n阻碍：\n明天只调整：\n"));

  document.querySelector("#taskList").addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    const row = event.target.closest("[data-task-id]");
    if (!action || !row) return;
    const task = state.tasks.find((item) => item.id === row.dataset.taskId);
    if (!task) return;
    if (action === "toggle-task") toggleTask(task);
    if (action === "edit-task") openTaskDialog(task);
    if (action === "start-task") startTask(task);
    if (action === "carry-task") carryTaskToToday(task);
  });

  document.querySelector("#appUsageTable").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="adjust-app"]');
    const row = event.target.closest("[data-app-id]");
    if (!button || !row) return;
    const app = state.apps.find((item) => item.id === row.dataset.appId);
    if (!app) return;
    app.minutes = Math.max(0, app.minutes + Number(button.dataset.delta));
    saveState();
    renderAll();
  });

  document.querySelector("#appUsageTable").addEventListener("change", (event) => {
    if (event.target.dataset.action !== "classify-app") return;
    const row = event.target.closest("[data-app-id]");
    const app = state.apps.find((item) => item.id === row.dataset.appId);
    if (!app) return;
    app.category = event.target.value;
    saveState();
    renderAll();
  });

  document.querySelector("#rewardGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-reward-id]");
    if (!button) return;
    const reward = state.rewards.find((item) => item.id === button.dataset.rewardId);
    if (reward) redeemReward(reward);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.timer.running) {
      syncTimerToTask();
      state.timer.elapsedSeconds = currentTimerSeconds();
      state.timer.lastStartedAt = Date.now();
      saveState();
    }
  });

  window.addEventListener("beforeunload", () => {
    syncTimerToTask();
    saveState();
  });
}

function handleDateBoundary() {
  const nextDateKey = localDateKey();
  if (nextDateKey === activeDateKey) return false;
  const nextMidnight = new Date(`${dateKeyOffset(activeDateKey, 1)}T00:00:00`).getTime();
  syncTimerToTask(Math.min(Date.now(), nextMidnight));
  state.timer.running = false;
  state.timer.lastStartedAt = null;
  state.timer.taskId = null;
  state.timer.elapsedSeconds = 0;
  rollStateToDate(state, nextDateKey);
  activeDateKey = nextDateKey;
  activeTaskFilter = "all";
  saveState();
  setTodayLabel();
  renderAll();
  document.querySelectorAll("[data-task-filter]").forEach((item) => item.classList.toggle("active", item.dataset.taskFilter === "all"));
  showToast("新的一天已开始", "昨日记录已归档；今日时间、进度和应用用时已重新计算。", "success");
  checkReminders();
  return true;
}

function runTick() {
  if (handleDateBoundary()) return;
  tickCounter += 1;
  if (state.timer.running) {
    syncTimerToTask();
    renderFocus();
    if (tickCounter % 10 === 0) {
      maybeAwardDailyGoal();
      saveState();
      renderSummary();
    }
  }
  if (state.appMonitor.running && !document.hidden) {
    state.appMonitor.elapsedSeconds += 1;
    monitorActiveSeconds += 1;
    const app = state.apps.find((item) => item.id === "focusdock");
    if (app && monitorActiveSeconds >= 60) {
      app.minutes += Math.floor(monitorActiveSeconds / 60);
      monitorActiveSeconds %= 60;
      saveState();
      renderAppUsage();
      renderAppGlance();
    } else {
      document.querySelector("#monitorElapsed").textContent = formatClock(state.appMonitor.elapsedSeconds);
    }
  }
  if (tickCounter % 30 === 0) checkReminders();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => {});
  }
}

function registerWebMCPTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const register = (tool) => {
    try {
      Promise.resolve(context.registerTool(tool)).catch(() => {});
    } catch {
      // WebMCP is progressive enhancement; the visible app remains fully usable.
    }
  };

  register({
    name: "get_today_study_plan",
    title: "读取今日学习计划",
    description: "读取 FocusDock 中今天的任务、学习时间、总体进度和积分，不修改任何数据。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute() {
      const currentTasks = todayTasks();
      return {
        date: localDateKey(),
        tasks: currentTasks.map((task) => ({ id: task.id, title: task.title, module: task.module, kind: task.kind, progress: task.progress, done: task.done, plannedMinutes: task.plannedMinutes, actualMinutes: Math.round(taskActualMinutes(task)), dueAt: task.dueAt })),
        actualMinutes: Math.round(totalActualMinutes(currentTasks)),
        weightedProgress: weightedProgress(currentTasks),
        points: state.points,
        overdueCount: overdueTasks().length
      };
    }
  });

  register({
    name: "create_study_task",
    title: "创建学习任务",
    description: "在 FocusDock 今日计划中创建一项任务，并立即更新可见任务列表和统计。",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        module: { type: "string", minLength: 1, maxLength: 40 },
        plannedMinutes: { type: "number", minimum: 1, maximum: 1440 },
        startAt: { type: "string", format: "date-time" },
        dueAt: { type: "string", format: "date-time" }
      },
      required: ["title", "module", "plannedMinutes", "startAt", "dueAt"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute(input) {
      if (!input || typeof input.title !== "string" || !input.title.trim() || typeof input.module !== "string" || !input.module.trim()) throw new Error("title and module are required");
      const plannedMinutes = Number(input.plannedMinutes);
      const startAt = new Date(input.startAt);
      const dueAt = new Date(input.dueAt);
      if (!Number.isFinite(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 1440 || Number.isNaN(startAt.getTime()) || Number.isNaN(dueAt.getTime())) throw new Error("invalid time values");
      const task = { id: uid("task"), title: input.title.trim().slice(0, 80), module: input.module.trim().slice(0, 40), kind: "study", plannedMinutes, actualSeconds: 0, progress: 0, startAt: startAt.toISOString(), dueAt: dueAt.toISOString(), done: false, note: "", rewarded: false };
      state.tasks.unshift(task);
      saveState();
      renderAll();
      return { id: task.id, status: "created", title: task.title };
    }
  });

  register({
    name: "start_task_timer",
    title: "开始任务计时",
    description: "按任务 ID 开始 FocusDock 计时，并把该任务切换为当前专注任务。",
    inputSchema: { type: "object", properties: { taskId: { type: "string", minLength: 1 } }, required: ["taskId"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const task = state.tasks.find((item) => item.id === input?.taskId);
      if (!task) throw new Error("task not found");
      if (task.done) throw new Error("completed tasks cannot be started");
      if (task.archived || taskDateKey(task) !== localDateKey()) throw new Error("carry the task to today before starting it");
      startTask(task);
      return { taskId: task.id, status: "running", elapsedSeconds: currentTimerSeconds() };
    }
  });

  register({
    name: "complete_study_task",
    title: "完成学习任务",
    description: "按任务 ID 完成 FocusDock 任务，更新进度并根据当前规则结算一次积分。",
    inputSchema: { type: "object", properties: { taskId: { type: "string", minLength: 1 } }, required: ["taskId"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const task = state.tasks.find((item) => item.id === input?.taskId);
      if (!task) throw new Error("task not found");
      if (task.done) throw new Error("task is already complete");
      const pointsBefore = state.points;
      completeTask(task);
      return { taskId: task.id, status: "completed", pointsEarned: state.points - pointsBefore };
    }
  });
}

setTodayLabel();
wireEvents();
renderAll();
checkReminders();
registerServiceWorker();
registerWebMCPTools();
window.setInterval(runTick, 1000);
