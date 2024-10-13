import { FC, useEffect, useState } from "react";
import { Maximize, X, Minimize as Contract } from "react-feather"; // Feather icons
import Logo from "./Logo.png";

const { getCurrentWindow, app } = window.require("@electron/remote");

export const Titlebar: FC = () => {
	const currentWindow = getCurrentWindow();
	const [maximized, setMaximized] = useState(currentWindow.isMaximized());

	useEffect(() => {
		// Update maximize state whenever window is resized
		const handleResize = () => setMaximized(currentWindow.isMaximized());
		currentWindow.on("resize", handleResize);

		// Prevent logo drag
		const icon = document.getElementById("logo") as HTMLElement;
		icon.ondragstart = () => false;

		// Cleanup listener
		return () => {
			currentWindow.removeListener("resize", handleResize);
		};
	}, [currentWindow]);

	const onMinimize = () => currentWindow.minimize();
	const onMaximize = () => {
		// Toggle maximize state
		setMaximized(!currentWindow.isMaximized());
		currentWindow.isMaximized()
			? currentWindow.unmaximize()
			: currentWindow.maximize();
	};
	const onQuit = () => app.quit();

	return (
		<div className="title-bar sticky top-0 flex items-center justify-between select-none bg-zinc-900 z-50">
			<div className="logo-container absolute left-0 p-2">
				<img
					id="logo"
					src={Logo}
					alt="logo"
					width={25}
					height={15}
					className="opacity-90"
				/>
			</div>
			<div className="window-controls-container flex space-x-2 p-2">
				<button
					title="Minimize"
					className="minimize-button focus:outline-none hover:bg-gray-700 p-2"
					onClick={onMinimize}
					style={{ fontSize: "1rem", lineHeight: "1rem" }}
				>
					– {/* Custom dash icon for minimize */}
				</button>

				<button
					title="Maximize/Restore"
					className="min-max-button focus:outline-none hover:bg-gray-700 p-2"
					onClick={onMaximize}
					style={{ fontSize: "0.938rem" }}
				>
					{maximized ? (
						<Contract size={15} /> // Show contract/minimize icon when maximized
					) : (
						<Maximize size={15} /> // Show maximize icon when not maximized
					)}
				</button>
				<button
					title="Close"
					className="close-button focus:outline-none hover:bg-red-500 p-2"
					onClick={onQuit}
					style={{ fontSize: "0.938rem" }}
				>
					<X size={15} />
				</button>
			</div>
		</div>
	);
};
