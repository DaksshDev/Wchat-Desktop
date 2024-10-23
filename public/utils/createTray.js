const { app, Tray, Menu, shell } = require("electron");
const { showNotification } = require("./showNotification");
const config = require("./config");

exports.createTray = () => {
	const t = new Tray(config.icon);

	t.setToolTip(config.appName);
	t.setContextMenu(
		Menu.buildFromTemplate([
			{
				label: "Show App",
				click: () => {
					if (!config.mainWindow.isVisible())
						config.mainWindow.show();
				},
			},
			{
				label: "Creator",
				submenu: [
					{
						label: "GitHub",
						click: () => {
							shell.openExternal("https://github.com/DaksshDev/Wchat-Electron");
						},
					},
					{
						label: "E-Mai",
						click: () => {
							shell.openExternal("mailto:Dakssh.bhambre@gmail.com");
						},
					},
					{
						label: "Website",
						click: () => {
							shell.openExternal("https://daksshdev.github.io/Wchat/");
						},
					},
				],
			},
			{
				label: "Quit",
				click: () => {
					config.isQuiting = true;

					app.quit();
				},
			},
		]),
	);

	return t;
};
