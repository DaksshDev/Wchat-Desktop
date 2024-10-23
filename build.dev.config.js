module.exports = {
    appId: 'com.wchat.dev',
    productName: 'WChat Dev',  // Change the name to indicate it's a dev version
    directories: {
      output: 'dist-dev'  // Output the dev build into a separate folder
    },
    win: {
      icon: 'icon.png',
      target: 'portable'  // Build as a portable .exe for quick testing
    },
    extraMetadata: {
      version: '1.0.1-dev',  // Dev version tag
    }
  };
  