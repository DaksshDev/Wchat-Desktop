const { Notification, shell } = require("electron");
const { join } = require("path");

exports.showNotification = (title, body, subtitle) => {
  try {
    // Windows Toast XML with button
    const toastXmlString = `
    <toast activationType="protocol">
      <visual>
        <binding template="ToastGeneric">
          <image id="1" src="${join(__dirname, "..", "..", "icon.ico")}" placement="appLogoOverride" hint-crop="circle"/>
          <text id="1">${title}</text>
		  <text id="2">${body}</text>
          <text id="3" placement="attribution">${subtitle}</text>
        </binding>
      </visual>
      <actions>
        <action 
          content="Open Website" 
          arguments="https://daksshdev.github.io/Wchat/" 
          activationType="protocol"/>
		   <action 
          content="Close" 
          arguments="close-notification" 
          activationType="protocol"/>
      </actions>
    </toast>
    `;

    // Create the notification
    const notification = new Notification({
      toastXml: toastXmlString,
      silent: true,
      timeoutType: "default",
      icon:join(__dirname, "..", "..", "icon.ico"),
    });

    // Open the external link when the notification is clicked
    notification.on('click', () => {
      shell.openExternal("https://daksshdev.github.io/Wchat/");
    });

    notification.show();
    console.log("Notification shown successfully.");
    return notification;
  } catch (error) {
    console.error("Error displaying notification:", error);
  }
};
