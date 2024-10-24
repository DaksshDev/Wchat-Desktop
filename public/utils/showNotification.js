const { BrowserWindow } = require("electron");
const { join } = require("path");
const remote = require("@electron/remote/main");
const config = require("./config");

exports.showNotification = async (title, body) => {
  const notificationWindow = new BrowserWindow({
    width: 300,
    height: 100,
    x: 0,
    y: 0,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true, // Enable remote module here
      devTools: config.isDev,
      contextIsolation: false,
    },
    icon: config.icon,
    title: config.appName,
  });

  // Enable the remote module for this window
  remote.enable(notificationWindow.webContents);

  // Append title and body to the URL as query parameters
  const url = config.isDev
    ? `http://localhost:3000/#/notification?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    : `file://${join(__dirname, "..", "../build/index.html")}/#/notification?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

  await notificationWindow.loadURL(url);

  // Set the notification window position to the bottom-right corner
  const { width, height } = require("electron").screen.getPrimaryDisplay().workAreaSize;
  notificationWindow.setPosition(width - 320, height - 120); // Adjust values to fit your screen properly

  notificationWindow.show();

  // Automatically close the notification after 5 seconds
  setTimeout(() => {
    notificationWindow.hide();
  }, 5000);

  // Optional: handle window close
  notificationWindow.on("close", (e) => {
    e.preventDefault();
    notificationWindow.hide(); // Prevent window from being destroyed
  });
};
