const { BrowserWindow, shell } = require("electron");
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
		? `http://localhost:3000/#/notification?title=${encodeURIComponent(
				title,
		  )}&body=${encodeURIComponent(body)}`
		: `file://${join(
				__dirname,
				"..",
				"../build/index.html",
		  )}/#/notification?title=${encodeURIComponent(
				title,
		  )}&body=${encodeURIComponent(body)}`;

	await notificationWindow.loadURL(url);

	// Set the notification window position to the bottom-right corner
	const { width, height } =
		require("electron").screen.getPrimaryDisplay().workAreaSize;
	notificationWindow.setPosition(width - 320, height - 120); // Adjust values to fit your screen properly

	notificationWindow.show();

	// Automatically close the notification after 5 seconds
	setTimeout(() => {
		notificationWindow.hide();
	}, 5000);

		// Intercept external link clicks and prevent opening new windows
		notificationWindow.webContents.setWindowOpenHandler(({ url }) => {
			// Check if the URL is external (starts with http/https or contains a '.') and is NOT localhost
			const isExternal =
				/^https?:\/\//.test(url) &&
				!/^(http:\/\/)?(localhost|127\.0\.0.1)(:\d{1,5})?/.test(url);

			if (isExternal) {
				shell.openExternal(url); // Open external link in default browser
				return { action: "deny" }; // Prevent opening new window in Electron
			}

			return { action: "allow" }; // Allow internal links (stay in app)
		});

		// Prevent in-app navigation for external links
		notificationWindow.webContents.on("will-navigate", (event, url) => {
			const currentURL = event.sender.getURL(); // Get current page URL

			// Check if the URL is external
			const isExternal =
				/^https?:\/\//.test(url) &&
				!/^(http:\/\/)?(localhost|127\.0\.0.1)(:\d{1,5})?/.test(url);

			// Allow internal navigation for refresh or localhost
			if (
				url === currentURL ||
				/^(http:\/\/)?(localhost|127\.0\.0.1)(:\d{1,5})?/.test(url)
			) {
				return; // Allow refresh or internal navigation
			}

			// For external links, prevent in-app navigation and open externally
			if (isExternal) {
				event.preventDefault(); // Block in-app navigation
				shell.openExternal(url); // Open external link in default browser
			}
		});

	// Optional: handle window close
	notificationWindow.on("close", (e) => {
		e.preventDefault();
		notificationWindow.hide(); // Prevent window from being destroyed
	});
};

