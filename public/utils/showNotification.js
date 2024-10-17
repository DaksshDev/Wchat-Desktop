const { Notification, app } = require("electron");
const { join } = require("path");

exports.showNotification = (title, body) => {
	app.setAppUserModelId("W Chat");
	const notification = new Notification({
		title,
		body,
		icon: join(__dirname, "..", "icon.ico"),
		silent: true,
		timeoutType: "default",
	});

	notification.show();

	return notification;
};
