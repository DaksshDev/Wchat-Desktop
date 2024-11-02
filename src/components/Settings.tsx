import React, { useState, useEffect, useRef } from "react";
import DEFAULT from "../ThemePreviews/DEFAULT.png";
import FESTIVAL from "../ThemePreviews/FESTIVAL.png";
import GAMERBLUE from "../ThemePreviews/GAMERBLUE.png";
import REDNEON from "../ThemePreviews/REDNEON.png";
import { VscClose } from "react-icons/vsc";

interface SettingsProps {
	isModalVisible: boolean;
	toggleModal: () => void;
	currentUsername: string;
}

// Define theme options with icons (use appropriate icon URLs)
const themes = [
	{ name: "Default", icon: DEFAULT },
	{ name: "Festival", icon: FESTIVAL },
	{ name: "Gamer Blue", icon: GAMERBLUE },
	{ name: "Red Neon", icon: REDNEON },
];

export const Settings: React.FC<SettingsProps> = ({
	isModalVisible,
	toggleModal,
	currentUsername,
}) => {
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const [activeTab, setActiveTab] = useState("Personalization");
	const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
	const [appVersion, setAppVersion] = useState("");
	const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
	const [unsavedChanges, setUnsavedChanges] = useState(false);
	const [fadeIn, setFadeIn] = useState(false); // Local state for fade-in
	const buttonRef = useRef<HTMLButtonElement>(null); // Create a ref for the button
	const hasNotified = useRef(false); // Ref to track if notification has been sent
	// Initialize the state based on localStorage or default to false
	const [isGreetingEnabled, setIsGreetingEnabled] = useState<boolean>(() => {
		const storedValue = localStorage.getItem("Greeting");
		return storedValue ? JSON.parse(storedValue) : false;
	});

	// Retrieve the notification setting from localStorage, default to true if not present
	const initialNotifySetting =
		localStorage.getItem("isNotifyEnabled") === null
			? true
			: localStorage.getItem("isNotifyEnabled") === "true";

	// State to track whether notifications are enabled
	const [isNotifyEnabled, setIsNotifyEnabled] =
		useState<boolean>(initialNotifySetting);

	// Load the saved theme from local storage on component mount
	useEffect(() => {
		const savedTheme = localStorage.getItem("selectedTheme");
		if (savedTheme) setSelectedTheme(savedTheme);
	}, []);

	useEffect(() => {
		// Notify the renderer only if notifications are enabled and we haven't already notified
		if (isNotifyEnabled && window.electronAPI && !hasNotified.current) {
			window.electronAPI.notifyRenderer(); // Call the electron API to notify the renderer
			hasNotified.current = true; // Mark that notification has been sent
		}

		// Save the notification setting to localStorage whenever it changes
		localStorage.setItem(
			"isNotifyEnabled",
			JSON.stringify(isNotifyEnabled),
		);
	}, [isNotifyEnabled]);

	// Function to handle the checkbox toggle
	const handleNotificationToggle = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		setIsNotifyEnabled(event.target.checked);
	};
	// Update localStorage whenever isGreetingEnabled changes
	useEffect(() => {
		localStorage.setItem("Greeting", JSON.stringify(isGreetingEnabled));
	}, [isGreetingEnabled]);

	// Handle the toggle switch change
	const handleToggle = () => {
		setIsGreetingEnabled((prev) => !prev);
	};

	// Function to handle theme selection
	const handleThemeChange = (theme: string) => {
		setSelectedTheme(theme);
		setUnsavedChanges(true);
	};

	// Effect to trigger fade-in when modal becomes visible
	useEffect(() => {
		if (isModalVisible) {
			setFadeIn(true); // Trigger fade-in animation
		} else {
			setFadeIn(false); // Reset fade-in state
		}
	}, [isModalVisible]);

	// Save settings function
	const saveSettings = () => {
		if (selectedTheme) {
			localStorage.setItem("selectedTheme", selectedTheme);
			setUnsavedChanges(false);
			window.location.reload(); // Reloads the current page
		}
	};

	useEffect(() => {
		const version = window.electronAPI?.getAppVersion() || "N/A"; // Fallback
		setAppVersion(version);
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && buttonRef.current) {
				buttonRef.current.click(); // Simulate a click on the button
			}
		};

		// Add event listener for keydown
		window.addEventListener("keydown", handleKeyDown);

		// Cleanup function to remove the event listener
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []); // Empty dependency array means this effect runs once on mount

	const closeToast = () => {
		setShowToast(false);
		setToastMessage("");
	};

	const tabs = [
		"Personalization",
		"Chat",
		"Keybinds",
		"Language",
		"Notifications",
	];

	if (!isModalVisible) return null;

	return (
		<div
			className={`fixed inset-0 flex items-center justify-center bg-neutral-900 bg-opacity-90 z-40 transition-opacity duration-700 ease-in-out ${
				fadeIn ? "opacity-100" : "opacity-0 pointer-events-none"
			}`}
		>
			<div
				className={`flex flex-col h-full w-full bg-neutral-950 text-neutral-200 p-8 overflow-y-auto transition-transform duration-300 ease-in-out ${
					fadeIn ? "translate-y-0" : "translate-y-2"
				}`}
			>
				{/* Header */}
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-3xl font-bold">App Settings</h1>
					<div className="flex items-center">
						<button
							onClick={toggleModal}
							ref={buttonRef} // Attach the ref to the button
							title="Close"
							className="text-neutral-400 hover:text-neutral-100 text-2xl border-2 border-white rounded-full flex items-center"
						>
							<VscClose size={20} />
						</button>
						<span className="ml-2 text-xl text-neutral-400">
							ESC
						</span>
					</div>
				</div>

				{/* Tabs */}
				<div className="relative mb-6 border-b border-neutral-700 pb-2">
					<div className="flex space-x-4">
						{tabs.map((tab) => (
							<button
								key={tab}
								onClick={(e) => {
									setActiveTab(tab);
									// Get the width and position of the clicked tab for the underline
									const tabWidth =
										e.currentTarget.offsetWidth;
									const tabLeft = e.currentTarget.offsetLeft;
									setIndicatorStyle({
										width: tabWidth,
										left: tabLeft,
									});
								}}
								className={`relative text-lg font-semibold pb-1 transition-colors duration-200 ${
									activeTab === tab
										? "text-blue-500"
										: "text-neutral-400 hover:text-neutral-100"
								}`}
							>
								{tab}
							</button>
						))}
					</div>
					{/* Active Tab Indicator */}
					<span
						className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-300 ease-in-out"
						style={{
							width: `${indicatorStyle.width}px`,
							left: `${indicatorStyle.left}px`,
						}}
					/>
				</div>

				{/* Main Content Area */}
				<div className="flex flex-1">
					<div className="flex-1 bg-neutral-800 rounded-lg p-6">
						<h2 className="text-xl text-blue-600 font-semibold mb-4">
							{activeTab}
						</h2>

						{activeTab === "Personalization" && (
							<div className="flex flex-1 flex-col space-y-6">
								{/* Backgrounds Section */}
								<div className="flex-1 bg-neutral-800 rounded-lg p-6">
									<h2 className="text-xl font-semibold mb-4 text-neutral-100">
										Backgrounds
									</h2>

									{/* Display Theme Options in a Responsive Grid */}
									<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
										{themes.map((theme) => (
											<div
												key={theme.name}
												className={`relative flex flex-col items-center p-5 bg-neutral-900 rounded-lg hover:bg-neutral-950 transition-all cursor-pointer ${
													selectedTheme === theme.name
														? "ring-2 ring-blue-600"
														: ""
												}`}
												onClick={() =>
													handleThemeChange(
														theme.name,
													)
												}
											>
												{theme.name === "Festival" && (
													<span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
														Diwali Special!
													</span>
												)}
												<img
													src={theme.icon}
													alt={theme.name}
													className="w-60 h-32 mb-2 rounded-lg object-cover"
												/>
												<span className="text-sm text-neutral-100">
													{theme.name}
												</span>
											</div>
										))}
									</div>

									{/* Save Settings Button */}
									{unsavedChanges && (
										<div className="mt-4">
											<button
												onClick={saveSettings}
												className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600 transition-all"
											>
												Save Settings
											</button>
											<p className="mt-2 text-gray-400">
												NOTE: Requires App Refresh
											</p>
										</div>
									)}
								</div>

								<div className="flex-1 bg-neutral-800 rounded-lg p-6">
									<h2 className="text-xl font-semibold mb-4 text-neutral-100">
										Preferences
									</h2>
									<div className="space-y-6">
										{/* Show Greeting Option */}
										<div className="flex items-center justify-between">
											<label
												htmlFor="showGreeting"
												className="flex items-center text-neutral-100"
											>
												Show Greeting
												<div
													className="tooltip tooltip-right tooltip-info ml-1 cursor-pointer"
													data-tip="Disable Good Afternoon, Morning and Night Greeting On Home Screen."
												>
													<span className="ml-1 text-gray-400">
														ℹ️
													</span>
												</div>
											</label>
											<input
												type="checkbox"
												checked={isGreetingEnabled}
												onChange={handleToggle}
												id="showGreeting"
												className="toggle toggle-primary"
											/>
										</div>

										{/* Disable Flare AI Option */}
										<div className="flex items-center justify-between">
											<label
												htmlFor="disableFlareAI"
												className="flex items-center text-neutral-100"
											>
												Disable Flare AI
												<div
													className="tooltip tooltip-right tooltip-info ml-1 cursor-pointer"
													data-tip="Please Don't Disable me!🥹"
												>
													<span className="ml-1 text-gray-400">
														ℹ️
													</span>
												</div>
											</label>
											<input
												type="checkbox"
												id="disableFlareAI"
												className="toggle toggle-error"
											/>
										</div>

										{/* Disable Feature Notification Option */}
										<div className="flex items-center justify-between">
											<label
												htmlFor="disableFeatureNotification"
												className="flex items-center text-neutral-100"
											>
												Enable Feature Notification
												<div
													className="tooltip tooltip-right ml-1 tooltip-info cursor-pointer"
													data-tip="Enable Those Notification You Get About New Features Like Diwali Background"
												>
													<span className="ml-1 text-gray-400">
														ℹ️
													</span>
												</div>
											</label>
											<input
												type="checkbox"
												id="disableFeatureNotification"
												checked={isNotifyEnabled}
												onChange={
													handleNotificationToggle
												}
												className="toggle toggle-primary"
											/>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer Version Info */}
				<div className="text-center mt-8 text-neutral-500">
					Version 1.0 OPEN-BETA
				</div>

				{/* Toast Notification */}
				{showToast && (
					<div className="fixed bottom-4 right-4 z-50">
						<div className="bg-neutral-950 text-neutral-200 shadow-lg rounded-lg px-6 py-4 flex items-center justify-between space-x-4">
							<span className="text-base font-medium">
								{toastMessage}
							</span>
							<button
								onClick={closeToast}
								className="bg-blue-600 hover:bg-blue-700 text-neutral-100 px-4 py-1 rounded-xl font-semibold transition-all"
							>
								OK
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
