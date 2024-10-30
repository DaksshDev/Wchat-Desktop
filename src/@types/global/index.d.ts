export {};

declare global {
	namespace ReactTailwindTemplate {}
}

import { BrowserWindow } from "electron";

declare global {
    interface Window {
        electronAPI: {
            getCurrentWindow: () => Promise<BrowserWindow | null>;
            minimizeWindow: () => void;
            maximizeWindow: () => void;
            isMaximized: () => Promise<boolean>;
            quitApp: () => void;
            onMaximize: (callback: () => void) => void;
            onUnmaximize: (callback: () => void) => void;
            getAppVersion: () => string | undefined; // Allow undefined return here
            notifyRenderer: () => void; // New function to notify TSX loaded
        };
    }
}


