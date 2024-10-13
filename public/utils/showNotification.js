const { Notification } = require("electron");

exports.showNotification = (title, body) => {
	const notification = new Notification({
		title,
		body,
		icon: "./utils/icon.ico",
		silent: true,
		timeoutType: "default",
	});

	notification.show();

	return notification;
};
