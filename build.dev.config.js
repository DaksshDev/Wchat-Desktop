module.exports = {
    appId: 'com.Stier.w-chat',
    productName: 'WChat Dev',  // Change the name to indicate it's a dev version
    directories: {
      output: 'dist-dev'  // Output the dev build into a separate folder
    },
    win: {
      icon: 'icon.ico',
      target: 'portable'  // Build as a portable .exe for quick testing
    },
    extraMetadata: {
      version: '1.0.1-dev',  // Dev version tag
    }
  };
  