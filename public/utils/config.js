const { join } = require("path");
const isDev = require("electron-is-dev");

let config = {
	appName: "Bonfire",
	icon: join(__dirname, "..", "/icon.ico"),
	tray: null,
	isQuiting: false,
	mainWindow: null,
	notificationwindow: null,
	popupWindow: null,
	isDev,
};

module.exports = config;
