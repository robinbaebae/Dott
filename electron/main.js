const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  Notification,
  screen,
} = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const DEV_URL = 'http://localhost:3000';
const isProd = app.isPackaged;

// Auto-updater (production only)
let autoUpdater = null;
if (isProd) {
  try {
    const { autoUpdater: au } = require('electron-updater');
    autoUpdater = au;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
  } catch {
    console.log('electron-updater not available');
  }
}

// Load .env.local in production (bundled as extraResource)
if (isProd) {
  const envPath = path.join(process.resourcesPath, '.env.local');
  try {
    const envContent = require('fs').readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn('.env.local not found in resources');
  }
}

// ─── Single Instance Lock ────────────────────────────────
// Prevent multiple app windows from opening simultaneously
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running — quit this one
  app.quit();
}

let mainWindow = null;
let petWindow = null;
let tray = null;
let nextProcess = null;
let notificationInterval = null;
let dailyBriefingInterval = null;
let tokenCheckInterval = null;
let workTimeInterval = null;

// Notification dedup: Set of "taskId-type" strings
const notifiedTasks = new Set();

// Trend notification tracking
let lastKnownArticleCount = -1;
let trendCheckInterval = null;

// Work time tracking
let workStartTime = null;
let totalWorkSeconds = 0;
let isWorking = false;
let lastEncouragementMinutes = 0;

// DND (Do Not Disturb) mode
let dndMode = false;
let currentMeetingId = null;
let meetingCheckInterval = null;

// Content calendar & SNS & Weekly goals intervals
let contentCalendarInterval = null;
let snsPerformanceInterval = null;
let weeklyGoalsInterval = null;
let petMoodInterval = null;

// Pet mood system
let petMood = 'neutral'; // 'happy' | 'neutral' | 'sad'
let lastActivityTime = Date.now();
let completedTasksToday = 0;
let lastCompletedCount = -1;

// Notification settings cache
let notificationSettingsCache = null;
let notificationSettingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Theme sync
let currentTheme = 'light';

// Start Next.js server in production
function startNextServer() {
  if (!isProd) return;

  const serverPath = path.join(process.resourcesPath, 'app');
  nextProcess = spawn(process.execPath, [
    path.join(serverPath, 'node_modules', 'next', 'dist', 'bin', 'next'),
    'start',
  ], {
    cwd: serverPath,
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`Next.js: ${data}`);
  });
  nextProcess.stderr.on('data', (data) => {
    console.error(`Next.js error: ${data}`);
  });
}

function getAppUrl() {
  return isProd ? 'http://localhost:3000' : DEV_URL;
}

// --- Helper: send message to pet window ---
function sendPetMessage(message, force = false) {
  if (dndMode && !force) return; // suppress in DND mode
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet-message', message);
  }
}

// --- Helper: show notification and open main app on click ---
function showNotification(title, body, force = false) {
  if (dndMode && !force) return; // suppress in DND mode
  const notif = new Notification({ title, body, silent: false });
  notif.on('click', () => {
    createMainWindow();
  });
  notif.show();
}

// Main application window
function createMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'Dott',
    icon: path.join(__dirname, '..', 'public', 'icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(getAppUrl());

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Work time tracking: focus/blur
  mainWindow.on('focus', () => {
    if (!isWorking) {
      isWorking = true;
      workStartTime = Date.now();
    }
  });

  mainWindow.on('blur', () => {
    if (isWorking && workStartTime) {
      totalWorkSeconds += (Date.now() - workStartTime) / 1000;
      workStartTime = null;
      isWorking = false;
    }
  });
}

// Mini-pet window (always on top)
function createPetWindow() {
  if (petWindow) return;

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;

  petWindow = new BrowserWindow({
    width: 250,
    height: 160,
    x: Math.round(screenWidth / 2 - 125),
    y: screenHeight - 180,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  petWindow.loadFile(path.join(__dirname, 'pet.html'));
  petWindow.setVisibleOnAllWorkspaces(true);

  petWindow.webContents.on('context-menu', () => {
    Menu.buildFromTemplate([
      { label: '복사', role: 'copy' },
      { label: '붙여넣기', role: 'paste' },
      { label: '전체 선택', role: 'selectAll' },
    ]).popup(petWindow);
  });

  petWindow.on('closed', () => {
    petWindow = null;
  });
}

// =========================================================
// 1. Enhanced Task Notification System (iOS Reminders style)
// =========================================================
async function checkTaskNotifications() {
  try {
    const settings = await getNotificationSettings();
    if (!settings.tasks_enabled) return;

    const response = await fetch(`${getAppUrl()}/api/tasks`);
    if (!response.ok) return;

    const tasks = await response.json();
    const now = new Date();

    for (const task of tasks) {
      if (task.status === 'done' || !task.due_date) continue;

      const dueDate = new Date(task.due_date);
      const timeDiff = dueDate.getTime() - now.getTime();
      const minutesUntilDue = timeDiff / (1000 * 60);
      const taskId = task.id;

      // 1 hour before
      if (minutesUntilDue > 55 && minutesUntilDue <= 60) {
        const key = `${taskId}-1h`;
        if (!notifiedTasks.has(key)) {
          notifiedTasks.add(key);
          showNotification('🐰 Dott 알림', `"${task.title}" 마감이 1시간 남았습니다`);
          sendPetMessage(`⏰ "${task.title}" 1시간 남음!`);
        }
      }

      // 30 minutes before
      if (minutesUntilDue > 25 && minutesUntilDue <= 30) {
        const key = `${taskId}-30m`;
        if (!notifiedTasks.has(key)) {
          notifiedTasks.add(key);
          showNotification('🐰 Dott 알림', `"${task.title}" 마감이 30분 남았습니다`);
          sendPetMessage(`⏰ "${task.title}" 30분 남음!`);
        }
      }

      // At due time (0 to -5 minutes)
      if (minutesUntilDue <= 0 && minutesUntilDue > -5) {
        const key = `${taskId}-due`;
        if (!notifiedTasks.has(key)) {
          notifiedTasks.add(key);
          showNotification('🐰 Dott 알림', `"${task.title}" 마감 시간입니다!`);
          sendPetMessage(`🔔 "${task.title}" 지금이 마감!`);
        }
      }

      // Repeat reminders: 10min, 20min, 30min after due
      for (const offset of [10, 20, 30]) {
        if (minutesUntilDue <= -offset && minutesUntilDue > -(offset + 5)) {
          const key = `${taskId}-overdue-${offset}`;
          if (!notifiedTasks.has(key)) {
            notifiedTasks.add(key);
            showNotification(
              '🐰 Dott 리마인드',
              `"${task.title}" 마감이 ${offset}분 지났습니다!`
            );
            sendPetMessage(`⚠️ "${task.title}" ${offset}분 초과!`);
          }
        }
      }

      // On hold tasks: notify at 9 AM daily
      if (task.status === 'on_hold') {
        const hour = now.getHours();
        const todayKey = `${taskId}-onhold-${now.toDateString()}`;
        if (hour === 9 && !notifiedTasks.has(todayKey)) {
          notifiedTasks.add(todayKey);
          showNotification('🐰 보류 중 태스크', `"${task.title}" 아직 보류 중입니다`);
        }
      }
    }
  } catch {
    // Server might not be ready yet
  }
}

// =========================================================
// 2. Daily Briefing
// =========================================================
async function sendDailyBriefing() {
  try {
    const settings = await getNotificationSettings();
    if (!settings.briefing_enabled) return;

    const appUrl = getAppUrl();
    const lines = ['📋 데일리 리포트가 준비 됐어요!'];

    // Tasks
    try {
      const res = await fetch(`${appUrl}/api/tasks`);
      if (res.ok) {
        const tasks = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTasks = tasks.filter((t) => {
          if (t.status === 'done') return false;
          if (!t.due_date) return false;
          const d = new Date(t.due_date);
          return d >= today && d < tomorrow;
        });
        const onHold = tasks.filter((t) => t.status === 'on_hold');
        const overdue = tasks.filter((t) => {
          if (t.status === 'done') return false;
          if (!t.due_date) return false;
          return new Date(t.due_date) < today;
        });
        const pending = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');

        lines.push(`\n할 일: ${pending.length}개 | 오늘 마감: ${todayTasks.length}개`);
        if (overdue.length > 0) lines.push(`⚠️ 지연: ${overdue.length}개`);
        if (onHold.length > 0) lines.push(`⏸ 보류: ${onHold.length}개`);
      }
    } catch { /* skip */ }

    // Calendar
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const calRes = await fetch(
        `${appUrl}/api/calendar?timeMin=${todayStart.toISOString()}&timeMax=${todayEnd.toISOString()}`
      );
      if (calRes.ok) {
        const calData = await calRes.json();
        const events = calData.events || calData || [];
        if (Array.isArray(events)) {
          lines.push(`\n📅 오늘 일정: ${events.length}개`);
        }
      }
    } catch { /* skip */ }

    // Gmail
    try {
      const gmailRes = await fetch(`${appUrl}/api/gmail`);
      if (gmailRes.ok) {
        const gmailData = await gmailRes.json();
        if (gmailData.connected && gmailData.emails) {
          lines.push(`📧 읽지 않은 이메일: ${gmailData.emails.length}개`);
        }
      }
    } catch { /* skip */ }

    // Social stats (7-day)
    try {
      const [igRes, thRes] = await Promise.allSettled([
        fetch(`${appUrl}/api/instagram/posts`),
        fetch(`${appUrl}/api/threads/posts`),
      ]);
      const socialParts = [];
      if (igRes.status === 'fulfilled' && igRes.value.ok) {
        const igData = await igRes.value.json();
        const posts = Array.isArray(igData) ? igData : igData.posts || [];
        socialParts.push(`IG ${posts.length}posts`);
      }
      if (thRes.status === 'fulfilled' && thRes.value.ok) {
        const thData = await thRes.value.json();
        const posts = Array.isArray(thData) ? thData : thData.posts || [];
        socialParts.push(`Threads ${posts.length}posts`);
      }
      if (socialParts.length > 0) {
        lines.push(`📱 소셜: ${socialParts.join(' / ')}`);
      }
    } catch { /* skip */ }

    const briefingText = lines.join('\n');

    // Show notification
    showNotification('🐰 Dott 데일리 브리핑', briefingText);

    // Show pet bubble (short summary)
    sendPetMessage(lines.slice(0, 3).join(' | '));
  } catch (err) {
    console.error('Daily briefing error:', err);
  }
}

// Check if it's 10 AM and trigger daily briefing
function checkDailyBriefingTime() {
  const now = new Date();
  if (now.getHours() === 10 && now.getMinutes() < 5) {
    const todayKey = `briefing-${now.toDateString()}`;
    if (!notifiedTasks.has(todayKey)) {
      notifiedTasks.add(todayKey);
      sendDailyBriefing();
    }
  }
  // 5PM daily report
  if (now.getHours() === 17 && now.getMinutes() < 5) {
    const todayKey = `daily-report-${now.toDateString()}`;
    if (!notifiedTasks.has(todayKey)) {
      notifiedTasks.add(todayKey);
      generateDailyReport();
    }
  }
}

// =========================================================
// 5PM Daily Report (SOT)
// =========================================================
async function generateDailyReport() {
  try {
    const res = await fetch(`${getAppUrl()}/api/daily-report`, {
      method: 'POST',
    });
    if (res.ok) {
      showNotification('Dott 데일리 리포트', '오늘의 데일리 리포트가 준비됐어요!');
      sendPetMessage('오늘의 데일리 리포트가 준비됐어요! 📊');
    }
  } catch {
    // skip
  }
}

// =========================================================
// Notification Settings Cache
// =========================================================
async function getNotificationSettings() {
  const now = Date.now();
  if (notificationSettingsCache && (now - notificationSettingsCacheTime) < SETTINGS_CACHE_TTL) {
    return notificationSettingsCache;
  }
  try {
    const res = await fetch(`${getAppUrl()}/api/notifications/settings`);
    if (res.ok) {
      notificationSettingsCache = await res.json();
      notificationSettingsCacheTime = now;
    }
  } catch { /* use cached or defaults */ }
  return notificationSettingsCache || {
    tasks_enabled: true, briefing_enabled: true, token_enabled: true,
    trends_enabled: true, content_calendar_enabled: true,
    sns_performance_enabled: true, weekly_goals_enabled: true,
    work_time_enabled: true, meeting_dnd_enabled: true,
  };
}

// =========================================================
// Content Calendar Alerts (every 15 min)
// =========================================================
async function checkContentCalendarAlerts() {
  try {
    const settings = await getNotificationSettings();
    if (!settings.content_calendar_enabled) return;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startStr = today.toISOString().split('T')[0];
    const endStr = tomorrow.toISOString().split('T')[0];

    const res = await fetch(`${getAppUrl()}/api/content-calendar?start=${startStr}&end=${endStr}`);
    if (!res.ok) return;
    const items = await res.json();
    if (!Array.isArray(items)) return;

    const now = new Date();

    for (const item of items) {
      if (item.status === 'published' || !item.scheduled_date) continue;

      const scheduledDate = new Date(item.scheduled_date);
      if (item.scheduled_time) {
        const [h, m] = item.scheduled_time.split(':');
        scheduledDate.setHours(parseInt(h), parseInt(m), 0, 0);
      } else {
        scheduledDate.setHours(23, 59, 0, 0);
      }

      const diffMin = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);
      const id = item.id;

      // 1 hour before
      if (diffMin > 55 && diffMin <= 65) {
        const key = `cal-${id}-1h`;
        if (!notifiedTasks.has(key)) {
          notifiedTasks.add(key);
          showNotification('Dott 콘텐츠 알림', `"${item.title}" 발행까지 1시간 남았어요`);
          sendPetMessage(`📝 "${item.title}" 1시간 후 발행 예정!`);
        }
      }

      // 15 min before
      if (diffMin > 10 && diffMin <= 20) {
        const key = `cal-${id}-15m`;
        if (!notifiedTasks.has(key)) {
          notifiedTasks.add(key);
          showNotification('Dott 콘텐츠 알림', `"${item.title}" 발행까지 15분 남았어요!`);
          sendPetMessage(`🔥 "${item.title}" 곧 발행 시간이에요!`);
        }
      }

      // Past due
      if (diffMin <= 0 && diffMin > -30) {
        const key = `cal-${id}-overdue`;
        if (!notifiedTasks.has(key)) {
          notifiedTasks.add(key);
          showNotification('Dott 콘텐츠 알림', `"${item.title}" 발행 시간이 지났어요!`);
          sendPetMessage(`⚠️ "${item.title}" 발행 시간 지남!`);
        }
      }
    }
  } catch { /* skip */ }
}

// =========================================================
// SNS Performance Check (every 2 hours, 8AM-10PM)
// =========================================================
async function checkSNSPerformance() {
  try {
    const settings = await getNotificationSettings();
    if (!settings.sns_performance_enabled) return;

    const hour = new Date().getHours();
    if (hour < 8 || hour >= 22) return;

    const res = await fetch(`${getAppUrl()}/api/instagram/performance`);
    if (!res.ok) return;
    const data = await res.json();

    if (!data.recent_posts || data.recent_posts.length === 0) return;

    for (const post of data.recent_posts) {
      const ratio = post.vs_average || 0;
      const key = `sns-${post.timestamp}-perf`;
      if (notifiedTasks.has(key)) continue;

      if (ratio >= 1.5) {
        notifiedTasks.add(key);
        const pct = Math.round(ratio * 100);
        showNotification('Dott SNS 성과', `최근 게시물이 평균 대비 ${pct}% 반응! 🎉`);
        sendPetMessage(`🎉 최근 게시물 반응 대박! 평균의 ${pct}%`);
      } else if (ratio <= 0.5 && ratio > 0) {
        notifiedTasks.add(key);
        showNotification('Dott SNS 성과', '최근 게시물 참여율이 낮아요. 전략 점검이 필요합니다.');
        sendPetMessage(`📉 최근 게시물 참여율 저조... 전략 점검 필요`);
      }
    }
  } catch { /* skip */ }
}

// =========================================================
// Weekly Goals Check (Mon 9AM, Fri 5PM)
// =========================================================
async function checkWeeklyGoals() {
  try {
    const settings = await getNotificationSettings();
    if (!settings.weekly_goals_enabled) return;

    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon
    const hour = now.getHours();

    // Mon 9AM or Fri 5PM
    const isMonMorning = day === 1 && hour === 9;
    const isFriEvening = day === 5 && hour === 17;
    if (!isMonMorning && !isFriEvening) return;

    const todayKey = `weekly-goals-${now.toDateString()}`;
    if (notifiedTasks.has(todayKey)) return;
    notifiedTasks.add(todayKey);

    const appUrl = getAppUrl();

    // Fetch weekly goals
    const goalsRes = await fetch(`${appUrl}/api/weekly-goals`);
    if (!goalsRes.ok) return;
    const goals = await goalsRes.json();
    if (!Array.isArray(goals) || goals.length === 0) return;

    // Fetch this week's content calendar items
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const calRes = await fetch(
      `${appUrl}/api/content-calendar?start=${weekStart.toISOString().split('T')[0]}&end=${weekEnd.toISOString().split('T')[0]}`
    );
    const calItems = calRes.ok ? await calRes.json() : [];
    const items = Array.isArray(calItems) ? calItems : [];

    const lines = [];
    for (const goal of goals) {
      const published = items.filter(
        (i) => i.platform === goal.platform && i.status === 'published'
      ).length;
      const scheduled = items.filter(
        (i) => i.platform === goal.platform && i.status !== 'published'
      ).length;
      lines.push(`${goal.platform}: ${published}/${goal.target_count} 발행${scheduled > 0 ? ` (+${scheduled} 예정)` : ''}`);
    }

    const label = isMonMorning ? '이번 주 목표' : '이번 주 마무리';
    const msg = `📊 ${label}\n${lines.join('\n')}`;
    showNotification(`Dott ${label}`, lines.join(' | '));
    sendPetMessage(msg);
  } catch { /* skip */ }
}

// =========================================================
// Pet Mood System (every 30 min)
// =========================================================
async function updatePetMood() {
  try {
    const appUrl = getAppUrl();
    let newMood = 'neutral';

    // Check completed tasks today
    try {
      const res = await fetch(`${appUrl}/api/tasks`);
      if (res.ok) {
        const tasks = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const doneToday = tasks.filter((t) => {
          if (t.status !== 'done') return false;
          // rough: any 'done' task counts
          return true;
        });
        completedTasksToday = doneToday.length;
        if (lastCompletedCount === -1) lastCompletedCount = completedTasksToday;

        const overdue = tasks.filter((t) => {
          if (t.status === 'done' || !t.due_date) return false;
          return new Date(t.due_date) < today;
        });

        // Happy conditions: 3+ completed tasks
        if (completedTasksToday >= 3) newMood = 'happy';
        // Sad conditions: 3+ overdue tasks
        if (overdue.length >= 3) newMood = 'sad';
      }
    } catch { /* skip */ }

    // 4 hours of inactivity → sad
    const inactiveMinutes = (Date.now() - lastActivityTime) / (1000 * 60);
    if (inactiveMinutes > 240) newMood = 'sad';

    if (newMood !== petMood) {
      petMood = newMood;
      // Send mood to pet window
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('pet-mood', petMood);
      }
    }
  } catch { /* skip */ }
}

// 3. Token Usage Check (hourly)
// =========================================================
async function checkTokenUsage() {
  try {
    const settings = await getNotificationSettings();
    if (!settings.token_enabled) return;

    const res = await fetch(`${getAppUrl()}/api/tokens/usage`);
    if (!res.ok) return;

    const data = await res.json();
    const todayTotal = data.today?.total || 0;
    const monthTotal = data.month?.total || 0;

    if (todayTotal > 0) {
      const formatK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
      const msg = `오늘 토큰: ${formatK(todayTotal)} | 이번달: ${formatK(monthTotal)}`;

      showNotification('🐰 토큰 사용량', msg);
      sendPetMessage(`💰 ${msg}`);
    }
  } catch {
    // skip
  }
}

// =========================================================
// 4. Work Time Tracking + Encouragement
// =========================================================
function getCurrentWorkMinutes() {
  let seconds = totalWorkSeconds;
  if (isWorking && workStartTime) {
    seconds += (Date.now() - workStartTime) / 1000;
  }
  return Math.floor(seconds / 60);
}

async function checkWorkTimeEncouragement() {
  const settings = await getNotificationSettings();
  if (!settings.work_time_enabled) return;

  // Track activity for pet mood
  lastActivityTime = Date.now();

  const minutes = getCurrentWorkMinutes();

  const milestones = [
    { min: 30, msg: 'Good start! Keep it up 💪' },
    { min: 60, msg: "1 hour in! You're doing great 🔥" },
    { min: 120, msg: 'Time for a stretch? 🧘' },
    { min: 180, msg: "You're a machine 🚀" },
    { min: 240, msg: "Don't forget to rest 🌟" },
  ];

  for (const milestone of milestones) {
    if (minutes >= milestone.min && lastEncouragementMinutes < milestone.min) {
      lastEncouragementMinutes = milestone.min;
      showNotification('🐰 Dott 응원', milestone.msg);
      sendPetMessage(milestone.msg);
      break;
    }
  }
}

function formatWorkTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

// =========================================================
// Hourly Status Notification
// =========================================================
async function sendHourlyNotification() {
  try {
    const appUrl = getAppUrl();
    const now = new Date();
    const hour = now.getHours();

    // Only send during work hours (8 AM - 10 PM)
    if (hour < 8 || hour >= 22) return;

    const lines = [];

    // Tasks summary
    try {
      const res = await fetch(`${appUrl}/api/tasks`);
      if (res.ok) {
        const tasks = await res.json();
        const pending = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
        const overdue = tasks.filter((t) => {
          if (t.status === 'done' || !t.due_date) return false;
          return new Date(t.due_date) < now;
        });
        const todayDue = tasks.filter((t) => {
          if (t.status === 'done' || !t.due_date) return false;
          const d = new Date(t.due_date);
          return d.toDateString() === now.toDateString();
        });

        if (todayDue.length > 0) {
          lines.push(`오늘 마감: ${todayDue.length}개`);
        }
        if (overdue.length > 0) {
          lines.push(`지연된 작업: ${overdue.length}개`);
        }
        if (pending.length > 0) {
          lines.push(`진행중: ${pending.length}개`);
        }
      }
    } catch { /* skip */ }

    // Work time
    const workMin = getCurrentWorkMinutes();
    if (workMin > 0) {
      lines.push(`작업 시간: ${formatWorkTime(workMin)}`);
    }

    if (lines.length === 0) {
      lines.push('현재 진행중인 작업이 없습니다.');
    }

    const body = lines.join(' | ');
    showNotification('Dott 상태 알림', body);
    sendPetMessage(body);
  } catch {
    // skip
  }
}

// =========================================================
// System tray (extended)
// =========================================================
function createTray() {
  const trayIconPath = path.resolve(__dirname, '..', 'public', 'logo-dott.png');
  console.log('Tray icon path:', trayIconPath, 'exists:', require('fs').existsSync(trayIconPath));
  const trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 });
  console.log('Tray icon empty?', trayIcon.isEmpty());
  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon);
  tray.setToolTip('Dott');

  rebuildTrayMenu();

  tray.on('click', () => {
    createMainWindow();
  });

  // Hourly status notification
  setInterval(sendHourlyNotification, 60 * 60 * 1000);
  // First one after 5 minutes (wait for server)
  setTimeout(sendHourlyNotification, 5 * 60 * 1000);
}

function rebuildTrayMenu() {
  const workMinutes = getCurrentWorkMinutes();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Dott 열기',
      click: () => createMainWindow(),
    },
    {
      label: '미니펫 보기/숨기기',
      click: () => {
        if (petWindow) {
          if (petWindow.isVisible()) {
            petWindow.hide();
          } else {
            petWindow.show();
          }
        } else {
          createPetWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: '📋 Daily Briefing',
      click: () => sendDailyBriefing(),
    },
    {
      label: '💰 Token Usage',
      click: () => checkTokenUsage(),
    },
    {
      label: `⏱ Work Time: ${formatWorkTime(workMinutes)}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '알림 설정',
      submenu: [
        {
          label: '할 일 알림',
          type: 'checkbox',
          checked: true,
          click: (item) => {
            if (item.checked) {
              startNotificationCheck();
            } else {
              stopNotificationCheck();
            }
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// =========================================================
// Notification lifecycle
// =========================================================
function startNotificationCheck() {
  if (notificationInterval) return;
  notificationInterval = setInterval(checkTaskNotifications, 5 * 60 * 1000); // every 5 min
  checkTaskNotifications();
}

function stopNotificationCheck() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

function startAllIntervals() {
  // Task notifications: every 5 min
  startNotificationCheck();

  // Daily briefing check: every 1 min
  dailyBriefingInterval = setInterval(checkDailyBriefingTime, 60 * 1000);

  // Token usage: every 1 hour
  tokenCheckInterval = setInterval(checkTokenUsage, 60 * 60 * 1000);

  // Work time encouragement: every 1 min
  workTimeInterval = setInterval(() => {
    checkWorkTimeEncouragement();
    // Rebuild tray menu to update work time display
    if (tray) rebuildTrayMenu();
  }, 60 * 1000);

  // Meeting DND check: every 30 sec
  meetingCheckInterval = setInterval(checkMeetingStatus, 30 * 1000);

  // Trend article check: every 15 min
  trendCheckInterval = setInterval(checkNewTrends, 15 * 60 * 1000);
  // First check after 30 sec (wait for server)
  setTimeout(checkNewTrends, 30 * 1000);

  // Content calendar alerts: every 15 min
  contentCalendarInterval = setInterval(checkContentCalendarAlerts, 15 * 60 * 1000);
  setTimeout(checkContentCalendarAlerts, 45 * 1000);

  // SNS performance: every 2 hours
  snsPerformanceInterval = setInterval(checkSNSPerformance, 2 * 60 * 60 * 1000);
  setTimeout(checkSNSPerformance, 60 * 1000);

  // Weekly goals: check every 1 min (only fires Mon 9AM, Fri 5PM)
  weeklyGoalsInterval = setInterval(checkWeeklyGoals, 60 * 1000);

  // Pet mood: every 30 min
  petMoodInterval = setInterval(updatePetMood, 30 * 60 * 1000);
  setTimeout(updatePetMood, 2 * 60 * 1000);
}

function stopAllIntervals() {
  stopNotificationCheck();
  if (dailyBriefingInterval) {
    clearInterval(dailyBriefingInterval);
    dailyBriefingInterval = null;
  }
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
    tokenCheckInterval = null;
  }
  if (workTimeInterval) {
    clearInterval(workTimeInterval);
    workTimeInterval = null;
  }
  if (meetingCheckInterval) {
    clearInterval(meetingCheckInterval);
    meetingCheckInterval = null;
  }
  if (trendCheckInterval) {
    clearInterval(trendCheckInterval);
    trendCheckInterval = null;
  }
  if (contentCalendarInterval) {
    clearInterval(contentCalendarInterval);
    contentCalendarInterval = null;
  }
  if (snsPerformanceInterval) {
    clearInterval(snsPerformanceInterval);
    snsPerformanceInterval = null;
  }
  if (weeklyGoalsInterval) {
    clearInterval(weeklyGoalsInterval);
    weeklyGoalsInterval = null;
  }
  if (petMoodInterval) {
    clearInterval(petMoodInterval);
    petMoodInterval = null;
  }
}

// =========================================================
// IPC handlers
// =========================================================
const { ipcMain } = require('electron');

ipcMain.on('open-main', () => {
  createMainWindow();
});

ipcMain.on('show-notification', (_, { title, body }) => {
  showNotification(title, body);
});

ipcMain.on('content-step-notification', (_, { step, message }) => {
  sendPetMessage(message);
  showNotification('Dott 콘텐츠', message);
});

// =========================================================
// Theme sync between main app and pet window
// =========================================================
ipcMain.on('set-theme', (_, theme) => {
  currentTheme = theme;
  // Forward theme to pet window
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('theme-changed', theme);
  }
});

ipcMain.handle('get-theme', () => {
  return currentTheme;
});

// =========================================================
// Token Usage Data Handler
// =========================================================
ipcMain.handle('pet-token-usage', async () => {
  try {
    const res = await fetch(`${getAppUrl()}/api/tokens/usage`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      todayTotal: data.today?.total || 0,
      monthTotal: data.month?.total || 0,
      todayIn: data.today?.tokens_in || 0,
      todayOut: data.today?.tokens_out || 0,
      monthIn: data.month?.tokens_in || 0,
      monthOut: data.month?.tokens_out || 0,
    };
  } catch {
    return null;
  }
});

// =========================================================
// Next Meeting Handler
// =========================================================
ipcMain.handle('pet-next-meeting', async () => {
  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const appUrl = getAppUrl();

    const headers = await getPetAuthHeaders();
    const res = await fetch(
      `${appUrl}/api/calendar?timeMin=${now.toISOString()}&timeMax=${endOfDay.toISOString()}`,
      { headers }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.connected || !Array.isArray(data.events) || data.events.length === 0) return null;

    // Find the next upcoming meeting (not yet started)
    const upcoming = data.events
      .filter((evt) => {
        const start = new Date(evt.start?.dateTime || evt.start?.date);
        return start > now;
      })
      .sort((a, b) => {
        const aStart = new Date(a.start?.dateTime || a.start?.date);
        const bStart = new Date(b.start?.dateTime || b.start?.date);
        return aStart - bStart;
      });

    if (upcoming.length === 0) return null;

    const next = upcoming[0];
    const startTime = new Date(next.start?.dateTime || next.start?.date);
    const hours = startTime.getHours().toString().padStart(2, '0');
    const minutes = startTime.getMinutes().toString().padStart(2, '0');

    return {
      summary: next.summary || '미팅',
      time: `${hours}:${minutes}`,
    };
  } catch {
    return null;
  }
});

// =========================================================
// Helper: get auth headers (cookies) for pet API calls
// =========================================================
async function getPetAuthHeaders() {
  let cookieHeader = '';
  if (mainWindow && !mainWindow.isDestroyed()) {
    const cookies = await mainWindow.webContents.session.cookies.get({ url: getAppUrl() });
    cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }
  if (!cookieHeader) {
    console.warn('[getPetAuthHeaders] No cookies found — mainWindow:', !!mainWindow, 'destroyed:', mainWindow?.isDestroyed());
  }
  return {
    'Content-Type': 'application/json',
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };
}

// =========================================================
// Calendar Events Handler (today's events)
// =========================================================
ipcMain.handle('pet-calendar-events', async () => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const appUrl = getAppUrl();
    const headers = await getPetAuthHeaders();

    const res = await fetch(
      `${appUrl}/api/calendar?timeMin=${todayStart.toISOString()}&timeMax=${todayEnd.toISOString()}`,
      { headers }
    );
    if (!res.ok) {
      console.error('[pet-calendar-events] API error:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    if (!data.connected) return { connected: false, events: [] };
    return { connected: true, events: data.events || [] };
  } catch (err) {
    console.error('[pet-calendar-events] error:', err.message);
    return null;
  }
});

// =========================================================
// Create Calendar Event Handler
// =========================================================
ipcMain.handle('pet-create-event', async (_event, data) => {
  try {
    const appUrl = getAppUrl();
    const headers = await getPetAuthHeaders();
    const res = await fetch(`${appUrl}/api/calendar`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

// =========================================================
// Email Handler (recent unread emails)
// =========================================================
ipcMain.handle('pet-emails', async () => {
  try {
    const appUrl = getAppUrl();
    const headers = await getPetAuthHeaders();
    const res = await fetch(`${appUrl}/api/gmail`, { headers });
    if (!res.ok) {
      console.error('[pet-emails] API error:', res.status, await res.text().catch(() => ''));
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[pet-emails] error:', err.message);
    return null;
  }
});

// =========================================================
// Tasks Handler (today's tasks)
// =========================================================
ipcMain.handle('pet-tasks', async () => {
  try {
    const appUrl = getAppUrl();
    const headers = await getPetAuthHeaders();
    const res = await fetch(`${appUrl}/api/tasks`, { headers });
    if (!res.ok) {
      console.error('[pet-tasks] API error:', res.status, await res.text().catch(() => ''));
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[pet-tasks] error:', err.message);
    return null;
  }
});

// =========================================================
// Compose Email Handler (AI draft generation)
// =========================================================
ipcMain.handle('pet-compose-email', async (_event, data) => {
  try {
    const appUrl = getAppUrl();
    const headers = await getPetAuthHeaders();
    const res = await fetch(`${appUrl}/api/gmail/compose`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'generate', ...data }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

// =========================================================
// Pet Chat Handler (Claude Code CLI via spawn)
// =========================================================
const fs = require('fs');
const petSessionFilePath = path.join(app.getPath('userData'), 'pet-session-id.txt');

function loadPetSessionId() {
  try {
    return fs.readFileSync(petSessionFilePath, 'utf8').trim() || null;
  } catch { return null; }
}
function savePetSessionId(id) {
  try { fs.writeFileSync(petSessionFilePath, id || ''); } catch { /* skip */ }
}

let petSessionId = loadPetSessionId();

ipcMain.handle('pet-chat', async (_event, { message, history }) => {
  console.log('[pet-chat] Received message:', message);
  try {
    const authHeaders = await getPetAuthHeaders();
    const res = await fetch(`${getAppUrl()}/api/knowbar`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ message, history: history || [] }),
    });
    if (res.ok) {
      const data = await res.json();
      const responseText = data.response || '응답을 받지 못했습니다.';

      // Persist to DB (non-blocking)
      (async () => {
        try {
          const userRes = await fetch(`${getAppUrl()}/api/chat`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ sessionId: petSessionId, role: 'user', content: message }),
          });
          if (userRes.ok) {
            const userResData = await userRes.json();
            if (!petSessionId && userResData.sessionId) {
              petSessionId = userResData.sessionId;
              savePetSessionId(petSessionId);
            }
          }
          if (petSessionId) {
            await fetch(`${getAppUrl()}/api/chat`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({ sessionId: petSessionId, role: 'assistant', content: data.response }),
            });
          }
        } catch (e) {
          console.error('[pet-chat] DB persist error:', e.message);
        }
      })();

      // Return structured response with actions
      return {
        text: responseText,
        actions: {
          taskCreated: data.taskCreated || false,
          taskTitle: data.taskTitle || null,
          memoryCreated: data.memoryCreated || false,
          bannerId: data.bannerId || null,
          bannerHtml: data.bannerHtml || null,
          blogTitle: data.blogTitle || null,
          calendarEventCreated: data.calendarEventCreated || false,
          emailDraft: data.emailDraft || null,
          taskUpdated: data.taskUpdated || false,
          taskUpdateTitle: data.taskUpdateTitle || null,
          memoCreated: data.memoCreated || false,
          memoTitle: data.memoTitle || null,
          scheduleCreated: data.scheduleCreated || false,
          scheduleTitle: data.scheduleTitle || null,
        },
      };
    }
    return { text: '응답을 받지 못했습니다.', actions: {} };
  } catch (err) {
    console.error('[pet-chat] error:', err.message);
    return { text: 'Dott 연결에 실패했습니다.', actions: {} };
  }
});

// =========================================================
// Pet Chat History Handler (load previous session messages)
// =========================================================
ipcMain.handle('pet-chat-history', async () => {
  try {
    if (!petSessionId) return { messages: [] };
    const authHeaders = await getPetAuthHeaders();
    const res = await fetch(`${getAppUrl()}/api/chat?sessionId=${petSessionId}`, {
      headers: authHeaders,
    });
    if (!res.ok) return { messages: [] };
    const data = await res.json();
    const messages = Array.isArray(data.messages) ? data.messages.slice(-20) : [];
    return { messages };
  } catch {
    return { messages: [] };
  }
});

// =========================================================
// Figma Capture Handler (MCP via Claude CLI)
// =========================================================
ipcMain.handle('figma-capture', async (_event, { bannerUrl, fileKey, outputMode }) => {
  console.log('[figma-capture] Starting:', { bannerUrl, fileKey, outputMode });

  try {
    // Validate bannerUrl — only allow localhost URLs
    const parsedUrl = new URL(bannerUrl);
    if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname)) {
      return { error: 'Only localhost URLs are allowed for capture' };
    }

    // Step 1: Create hidden BrowserWindow to load the banner
    const captureWindow = new BrowserWindow({
      width: 1200,
      height: 1200,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await captureWindow.loadURL(bannerUrl);
    // Wait for content to render
    await new Promise((r) => setTimeout(r, 2000));

    // Step 2: Take screenshot (no executeJavaScript — avoid arbitrary code execution)
    const screenshot = await captureWindow.webContents.capturePage();
    const screenshotBase64 = screenshot.toPNG().toString('base64');
    const screenshotDataUrl = `data:image/png;base64,${screenshotBase64}`;

    // Step 3: Call Claude CLI with MCP tool using screenshot data
    const { execSync } = require('child_process');
    const claudePath = process.env.CLAUDE_CLI_PATH ||
      (() => { try { return execSync('which claude').toString().trim(); } catch { return 'claude'; } })();
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;

    const mcpPrompt = `Use the generate_figma_design tool from the Figma MCP server to create a design in Figma file with key "${fileKey}". The design should be based on the screenshot provided as a base64 PNG. Screenshot data (first 200 chars): ${screenshotBase64.slice(0, 200)}...`;

    const captureResult = await new Promise((resolve) => {
      const child = spawn(claudePath, [
        '--print',
        '--allowedTools', 'mcp__figma__generate_figma_design',
        '--', mcpPrompt,
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('error', (err) => {
        console.error('[figma-capture] CLI error:', err.message);
        resolve({ error: err.message });
      });

      child.on('close', (code) => {
        console.log('[figma-capture] CLI closed, code:', code);
        if (code !== 0 && !stdout.trim()) {
          resolve({ error: `CLI exited with code ${code}: ${stderr}` });
        } else {
          resolve({ output: stdout.trim() });
        }
      });
    });

    // Step 4: Check if output contains a Figma URL
    if (captureResult.output) {
      const figmaUrlMatch = captureResult.output.match(/https:\/\/www\.figma\.com\/(?:file|design)\/[^\s"']+/);
      if (figmaUrlMatch) {
        captureWindow.close();
        return { figmaUrl: figmaUrlMatch[0] };
      }
    }

    captureWindow.close();

    return {
      error: captureResult.error || 'Figma push completed but no URL returned',
      screenshotUrl: screenshotDataUrl,
    };
  } catch (err) {
    console.error('[figma-capture] Error:', err.message);
    return { error: err.message };
  }
});

// =========================================================
// Pet Menu Action Handler
// =========================================================
ipcMain.on('pet-action', async (_event, action) => {
  switch (action) {
    case 'briefing':
      sendDailyBriefing();
      break;
    case 'tasks':
      try {
        const res = await fetch(`${getAppUrl()}/api/tasks`);
        if (res.ok) {
          const tasks = await res.json();
          const pending = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
          const overdue = tasks.filter((t) => {
            if (t.status === 'done' || !t.due_date) return false;
            return new Date(t.due_date) < new Date();
          });
          let msg = `📝 할 일: ${pending.length}개`;
          if (overdue.length > 0) msg += ` | ⚠️ 지연: ${overdue.length}개`;
          if (pending.length > 0) {
            const top3 = pending.slice(0, 3).map((t) => `• ${t.title}`).join('\n');
            msg += '\n' + top3;
          }
          sendPetMessage(msg);
        }
      } catch {
        sendPetMessage('태스크를 불러올 수 없습니다.');
      }
      break;
    case 'tokens':
      checkTokenUsage();
      break;
    case 'open':
      createMainWindow();
      break;
  }
});

// =========================================================
// 6. New Trend Article Notification
// =========================================================
async function checkNewTrends() {
  try {
    const settings = await getNotificationSettings();
    if (!settings.trends_enabled) return;

    const appUrl = getAppUrl();
    const ago = new Date();
    ago.setDate(ago.getDate() - 1);

    const res = await fetch(
      `${appUrl}/api/trends?since=${ago.toISOString()}`
    );
    if (!res.ok) return;

    const data = await res.json();
    const count = Array.isArray(data) ? data.length : (data.count || 0);

    // First run: just record the count
    if (lastKnownArticleCount === -1) {
      lastKnownArticleCount = count;
      return;
    }

    // New articles detected
    if (count > lastKnownArticleCount) {
      const newCount = count - lastKnownArticleCount;
      lastKnownArticleCount = count;

      showNotification(
        'Dott 트렌드 알림',
        `새로운 업계 소식 ${newCount}건이 도착했습니다!`
      );
      sendPetMessage(`새 트렌드 ${newCount}건 도착! Trends 탭을 확인해보세요`);
    } else {
      lastKnownArticleCount = count;
    }
  } catch {
    // Server might not be ready
  }
}

// =========================================================
// Meeting DND (Do Not Disturb) Mode
// =========================================================
const { exec } = require('child_process');

async function checkMeetingStatus() {
  try {
    const now = new Date();
    const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
    const appUrl = getAppUrl();

    const res = await fetch(
      `${appUrl}/api/calendar?timeMin=${now.toISOString()}&timeMax=${fiveMinLater.toISOString()}`
    );
    if (!res.ok) return;

    const data = await res.json();
    if (!data.connected || !Array.isArray(data.events)) return;

    // Find meetings happening right now (started within last minute)
    const activeMeetings = data.events.filter((evt) => {
      const start = new Date(evt.start?.dateTime || evt.start?.date);
      const end = new Date(evt.end?.dateTime || evt.end?.date);
      return start <= now && end > now;
    });

    if (activeMeetings.length > 0 && !currentMeetingId) {
      // New meeting started — prompt DND
      const meeting = activeMeetings[0];
      currentMeetingId = meeting.id;
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('pet-dnd-prompt', meeting.summary || '미팅');
      }
    } else if (activeMeetings.length === 0 && currentMeetingId) {
      // Meeting ended — auto-disable DND
      currentMeetingId = null;
      if (dndMode) {
        dndMode = false;
        setSystemDnd(false);
        if (petWindow && !petWindow.isDestroyed()) {
          petWindow.webContents.send('pet-dnd-end');
        }
      }
    }
  } catch {
    // Calendar API might not be ready
  }
}

function setSystemDnd(enabled) {
  if (process.platform !== 'darwin') return;

  // macOS: toggle Focus/DND via Shortcuts CLI or AppleScript
  const script = enabled
    ? `
      tell application "System Events"
        tell process "ControlCenter"
          click (first menu bar item whose description contains "Focus") of menu bar 1
          delay 0.5
          try
            click checkbox "Do Not Disturb" of group 1 of window "Control Center"
          end try
        end tell
      end tell
    `
    : `
      tell application "System Events"
        tell process "ControlCenter"
          click (first menu bar item whose description contains "Focus") of menu bar 1
          delay 0.5
          try
            click checkbox "Do Not Disturb" of group 1 of window "Control Center"
          end try
        end tell
      end tell
    `;

  exec(`osascript -e '${script}'`, (err) => {
    if (err) console.log('DND toggle: system control unavailable, Ditto-level DND active');
  });
}

ipcMain.on('pet-dnd-response', (_event, accepted) => {
  if (accepted) {
    dndMode = true;
    setSystemDnd(true);
  }
});

// =========================================================
// Pet Window Resize Handler
// =========================================================
ipcMain.on('pet-set-opacity', (_event, value) => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.setOpacity(Math.max(0.2, Math.min(1, value)));
  }
});

ipcMain.on('pet-resize', (_event, { width, height }) => {
  if (petWindow && !petWindow.isDestroyed()) {
    const [currentX] = petWindow.getPosition();
    const display = screen.getPrimaryDisplay();
    const screenHeight = display.workAreaSize.height;
    // Keep bottom-aligned: adjust Y so bottom edge stays in place
    const newY = screenHeight - height - 20;
    petWindow.setBounds({ x: currentX, y: newY, width, height });
  }
});

// =========================================================
// Pet Window Drag Handler
// =========================================================
let dragOffset = null;

ipcMain.on('pet-start-drag', () => {
  if (petWindow && !petWindow.isDestroyed()) {
    const [winX, winY] = petWindow.getPosition();
    const cursorPoint = screen.getCursorScreenPoint();
    dragOffset = { x: cursorPoint.x - winX, y: cursorPoint.y - winY };
  }
});

ipcMain.on('pet-drag-move', (_event, { x, y }) => {
  if (petWindow && !petWindow.isDestroyed() && dragOffset) {
    petWindow.setPosition(x - dragOffset.x, y - dragOffset.y);
  }
});

// =========================================================
// App lifecycle
// =========================================================
// When a second instance is launched, focus the existing window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
});

app.whenReady().then(() => {
  // Auto-launch on system startup
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });

  // Set app icon (Dock) — use 128px PNG to match standard dock size
  const dockIconPath = path.join(__dirname, '..', 'public', 'icon-128.png');
  const dockIcon = nativeImage.createFromPath(dockIconPath);
  if (process.platform === 'darwin' && app.dock && !dockIcon.isEmpty()) {
    app.dock.setIcon(dockIcon);
  }

  startNextServer();
  createTray();
  createPetWindow();

  // Start all intervals after a delay (wait for server)
  setTimeout(startAllIntervals, 5000);

  // Open main window on first launch
  setTimeout(createMainWindow, 2000);

  // Auto-updater (production only)
  if (autoUpdater) {
    autoUpdater.on('update-available', (info) => {
      sendPetMessage(`🆕 새 버전 ${info.version} 발견! 다운로드 중...`);
    });
    autoUpdater.on('update-downloaded', (info) => {
      showNotification('Dott 업데이트', `v${info.version} 다운로드 완료! 재시작 시 적용됩니다.`);
      sendPetMessage(`✅ v${info.version} 준비 완료! 재시작하면 업데이트돼요`);
    });
    autoUpdater.on('error', (err) => {
      console.error('AutoUpdater error:', err.message);
    });
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  createMainWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopAllIntervals();
  if (nextProcess) {
    nextProcess.kill();
  }
});
