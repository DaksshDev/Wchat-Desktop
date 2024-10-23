const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { createTray } = require("./utils/createTray");
const { createMainWindow } = require("./utils/createMainWindow");
const { createPopupWindow } = require("./utils/createPopupWindow");
const { showNotification } = require("./utils/showNotification");
const AutoLaunch = require("auto-launch");
const remote = require("@electron/remote/main");
const config = require("./utils/config");

if (config.isDev) require("electron-reloader")(module);

remote.initialize();

if (!config.isDev) {
	const autoStart = new AutoLaunch({
		name: config.appName,
	});
	autoStart.enable();
}

app.on("ready", async () => {
	config.mainWindow = await createMainWindow();
	app.setAppUserModelId("w-chat");
	app.Icon
	config.tray = createTray();

	// Intercept external link clicks and prevent opening new windows
	config.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		// Use regex to check if the URL is external (starts with http/https or contains a '.') and is NOT localhost
		const isExternal =
			/^https?:\/\//.test(url) &&
			!/^(http:\/\/)?(localhost|127\.0\.0\.1)(:\d{1,5})?/.test(url);

		if (isExternal) {
			shell.openExternal(url); // Open external link in default browser
			return { action: "deny" }; // Prevent opening new window in Electron
		}

		return { action: "allow" }; // Allow internal links (stay in app)
	});

	// Prevent in-app navigation for external links
	config.mainWindow.webContents.on("will-navigate", (event, url) => {
		const currentURL = event.sender.getURL(); // Get current page URL

		// Regex for checking external URLs (not localhost or 127.0.0.1)
		const isExternal =
			/^https?:\/\//.test(url) &&
			!/^(http:\/\/)?(localhost|127\.0\.0\.1)(:\d{1,5})?/.test(url);

		// Allow internal navigation for refresh or localhost
		if (
			url === currentURL ||
			/^(http:\/\/)?(localhost|127\.0\.0\.1)(:\d{1,5})?/.test(url)
		) {
			return; // Allow refresh or internal navigation
		}

		// For external links, prevent in-app navigation and open externally
		if (isExternal) {
			event.preventDefault(); // Block in-app navigation
			shell.openExternal(url); // Open external link in default browser
		}
	});

	showNotification(config.appName, "Wchat is running on background", "See Your Application Tray");
});


app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0)
		config.mainWindow = createMainWindow();
});

ipcMain.on("app_version", (event) => {
	event.sender.send("app_version", { version: app.getVersion() });
});

autoUpdater.on("update-available", () => {
	config.mainWindow.webContents.send("update_available");
});

autoUpdater.on("update-downloaded", () => {
	config.mainWindow.webContents.send("update_downloaded");
});

ipcMain.on("restart_app", () => {
	autoUpdater.quitAndInstall();
});

