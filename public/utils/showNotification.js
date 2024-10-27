const { Notification } = require("electron");
const path = require("path");

exports.showNotification = (title, body) => {
    // Construct the absolute path to the icon
    const iconPath = path.join(__dirname, "..","../build/icon.ico"); // Adjust path if necessary

    const notification = new Notification({
        title: title,
        body: body,
        silent: false,
        timeoutType: "default",
        icon: iconPath // Corrected icon path
    });

    notification.show();

    return notification;
};
