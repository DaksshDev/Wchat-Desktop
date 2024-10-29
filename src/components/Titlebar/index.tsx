import { FC, useEffect, useState } from "react"; 
import Logo from "./Logo.png";
import { VscChromeRestore, VscClose, VscChromeMinimize, VscChromeMaximize } from "react-icons/vsc";


export const Titlebar: FC = () => {
    const [maximized, setMaximized] = useState(false);

    useEffect(() => {
        const electronAPI = window.electronAPI;
        if (!electronAPI) return;

        const checkMaximizedState = async () => {
            const isMaximized = await electronAPI.isMaximized();
            setMaximized(isMaximized);
        };
        
        checkMaximizedState();

        electronAPI.onMaximize?.(() => setMaximized(true));
        electronAPI.onUnmaximize?.(() => setMaximized(false));

        return () => {
            electronAPI.onMaximize?.(() => {});
            electronAPI.onUnmaximize?.(() => {});
        };
    }, []);

    const onMinimize = () => window.electronAPI?.minimizeWindow?.();
    const onMaximize = () => window.electronAPI?.maximizeWindow?.();
    const onQuit = () => window.electronAPI?.quitApp?.();

    return (
        <div className="title-bar sticky top-0 flex items-center justify-between select-none bg-zinc-900 z-50">
            <div className="logo-container absolute left-0 p-2">
                <img id="logo" src={Logo} alt="logo" width={90} height={50} className="opacity-90" />
            </div>
            <div className="window-controls-container flex justify-end space-x-1 p-1">
                <button
                    title="Minimize"
                    className="minimize-button focus:outline-none hover:bg-gray-700 p-2 flex items-center justify-center"
                    onClick={onMinimize}
                    style={{ fontSize: "0.938rem" }}
                >
                    <VscChromeMinimize size={20} />
                </button>

                <button
                    title="Maximize/Restore"
                    className="min-max-button focus:outline-none hover:bg-gray-700 p-2"
                    onClick={onMaximize}
                    style={{ fontSize: "0.938rem" }}
                >
                    {maximized ? <VscChromeRestore size={20} /> : <VscChromeMaximize size={20} />}
                </button>

                <button
                    title="Close"
                    className="close-button focus:outline-none hover:bg-red-500 p-2"
                    onClick={onQuit}
                    style={{ fontSize: "0.938rem" }}
                >
                    <VscClose size={20} />
                </button>
            </div>
        </div>
    );
};
