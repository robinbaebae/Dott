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

// Work time tracking
let workStartTime = null;
let totalWorkSeconds = 0;
let isWorking = false;
let lastEncouragementMinutes = 0;

// DND (Do Not Disturb) mode
let dndMode = false;
let currentMeetingId = null;
let meetingCheckInterval = null;

// Start Next.js server in production
function startNextServer() {
  if (!isProd) return;

  const serverPath = path.join(process.resourcesPath, 'app');
  nextProcess = spawn('node', ['node_modules/.bin/next', 'start'], {
    cwd: serverPath,
    env: { ...process.env, PORT: '3000' },
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`Next.js: ${data}`);
  });
}

function getAppUrl() {
  return DEV_URL;
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
    width: 1200,
    height: 800,
    title: 'Ditto - 마케팅 AI 어시스턴트',
    icon: path.join(__dirname, '..', 'build', 'icon.icns'),
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
    x: screenWidth - 270,
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

  petWindow.on('closed', () => {
    petWindow = null;
  });
}

// =========================================================
// 1. Enhanced Task Notification System (iOS Reminders style)
// =========================================================
async function checkTaskNotifications() {
  try {
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
          showNotification('🐰 Ditto 알림', `"${task.title}" 마감이 1시간 남았습니다`);
          sendPetMessage(`⏰ "${task.title}" 1시간 남음!`);
        }
      }

      // 30 minutes before
      if (minutesUntilDue > 25 && minutesUntilDue <= 30) {
        const key = `${taskId}-30m`;
        if (!notifiedTasks.has(key)) {
          notifiedTasks.add(key);
          showNotification('🐰 Ditto 알림', `"${task.title}" 마감이 30분 남았습니다`);
          sendPetMessage(`⏰ "${task.title}" 30분 남음!`);
        }
      }

      // At due time (0 to -5 minutes)
      if (minutesUntilDue <= 0 && minutesUntilDue > -5) {
        const key = `${taskId}-due`;
        if (!notifiedTasks.has(key)) {
          notifiedTasks.add(key);
          showNotification('🐰 Ditto 알림', `"${task.title}" 마감 시간입니다!`);
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
              '🐰 Ditto 리마인드',
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
    const appUrl = getAppUrl();
    const lines = ['📋 오늘의 브리핑'];

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
    showNotification('🐰 Ditto 데일리 브리핑', briefingText);

    // Show pet bubble (short summary)
    sendPetMessage(lines.slice(0, 3).join(' | '));
  } catch (err) {
    console.error('Daily briefing error:', err);
  }
}

// Check if it's 9 AM and trigger daily briefing
function checkDailyBriefingTime() {
  const now = new Date();
  if (now.getHours() === 9 && now.getMinutes() < 5) {
    const todayKey = `briefing-${now.toDateString()}`;
    if (!notifiedTasks.has(todayKey)) {
      notifiedTasks.add(todayKey);
      sendDailyBriefing();
    }
  }
}

// =========================================================
// 3. Token Usage Check (hourly)
// =========================================================
async function checkTokenUsage() {
  try {
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

function checkWorkTimeEncouragement() {
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
      showNotification('🐰 Ditto 응원', milestone.msg);
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
// System tray (extended)
// =========================================================
function createTray() {
  const trayIconPath = path.resolve(__dirname, '..', 'public', 'logo-tray.png');
  console.log('Tray icon path:', trayIconPath, 'exists:', require('fs').existsSync(trayIconPath));
  const trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 });
  console.log('Tray icon empty?', trayIcon.isEmpty());
  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon);
  tray.setToolTip('Ditto');

  rebuildTrayMenu();

  tray.on('click', () => {
    createMainWindow();
  });
}

function rebuildTrayMenu() {
  const workMinutes = getCurrentWorkMinutes();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🐰 Ditto 열기',
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

// =========================================================
// Pet Chat Handler (Claude Code CLI via spawn)
// =========================================================
let petSessionId = null;

ipcMain.handle('pet-chat', async (_event, message) => {
  console.log('[pet-chat] Received message:', message);
  return new Promise((resolve) => {
    const args = [
      '--print',
      '--allowedTools', 'WebSearch,WebFetch',
      '--', message,
    ];

    const claudePath = '/Users/sooyoungbae/.npm-global/bin/claude';
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;

    console.log('[pet-chat] Spawning claude:', claudePath, args.join(' '));

    const child = spawn(claudePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[pet-chat] stdout chunk:', data.toString().slice(0, 100));
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('[pet-chat] stderr chunk:', data.toString().slice(0, 100));
    });

    child.on('error', (err) => {
      console.error('[pet-chat] spawn error:', err.message);
      resolve('Claude Code 연결에 실패했습니다.');
    });

    child.on('close', (code) => {
      console.log('[pet-chat] process closed, code:', code, 'stdout length:', stdout.length);
      const response = stdout.trim();
      resolve(response || '응답을 받지 못했습니다.');
    });
  });
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
app.whenReady().then(() => {
  // Auto-launch on system startup
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });

  // Set app icon (Dock)
  const dockIconPath = path.join(__dirname, '..', 'public', 'dock-logo.png');
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
