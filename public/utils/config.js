const { join } = require("path");
const isDev = require("electron-is-dev");

let config = {
	appName: "W chat",
	icon: join(__dirname, "..", "/icon.ico"),
	tray: null,
	isQuiting: false,
	mainWindow: null,
	popupWindow: null,
	isDev,
};

module.exports = config;
