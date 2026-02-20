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
    // Hide instead of quit when closing
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Mini-pet window (always on top)
function createPetWindow() {
  if (petWindow) return;

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;

  petWindow = new BrowserWindow({
    width: 80,
    height: 80,
    x: screenWidth - 120,
    y: screenHeight - 120,
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

  // Make window draggable
  petWindow.on('closed', () => {
    petWindow = null;
  });
}

// System tray
function createTray() {
  // Use a simple icon (rabbit emoji as text for now)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setTitle('🐰');
  tray.setToolTip('Ditto - 마케팅 AI 어시스턴트');

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
      label: '알림 설정',
      submenu: [
        {
          label: '할 일 알림 (30분 전)',
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

  tray.on('click', () => {
    createMainWindow();
  });
}

// Task notification system (like iOS Reminders)
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

      // Notify 30 minutes before due
      if (minutesUntilDue > 0 && minutesUntilDue <= 30) {
        new Notification({
          title: '🐰 Ditto 알림',
          body: `"${task.title}" 마감이 30분 남았습니다`,
          silent: false,
        }).show();
      }

      // Notify when overdue
      if (minutesUntilDue < 0 && minutesUntilDue > -5) {
        new Notification({
          title: '🐰 Ditto 알림',
          body: `"${task.title}" 마감 시간이 지났습니다!`,
          silent: false,
        }).show();
      }
    }
  } catch {
    // Server might not be ready yet
  }
}

function startNotificationCheck() {
  if (notificationInterval) return;
  notificationInterval = setInterval(checkTaskNotifications, 5 * 60 * 1000); // every 5 min
  checkTaskNotifications(); // check immediately
}

function stopNotificationCheck() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

// IPC handlers
const { ipcMain } = require('electron');

ipcMain.on('open-main', () => {
  createMainWindow();
});

ipcMain.on('show-notification', (_, { title, body }) => {
  new Notification({ title, body }).show();
});

// App lifecycle
app.whenReady().then(() => {
  startNextServer();
  createTray();
  createPetWindow();

  // Start notification checks after a delay (wait for server)
  setTimeout(startNotificationCheck, 5000);

  // Open main window on first launch
  setTimeout(createMainWindow, 2000);
});

app.on('window-all-closed', () => {
  // Don't quit on macOS — keep in tray
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  createMainWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopNotificationCheck();
  if (nextProcess) {
    nextProcess.kill();
  }
});
