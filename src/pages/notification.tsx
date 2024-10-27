import { FC } from "react";
import { FaTimes, FaFire } from "react-icons/fa";

export const NotificationPage: FC = () => {
	const handleClose = () => {
		window.close();
	};

	const openWhatsNew = () => {
		window.location.href = "https://example.com/whats-new"; // Replace with your actual link
	};

	return (
		<div className="fixed w-[300px] h-[100px] bg-neutral-950 p-2 shadow-lg flex flex-col justify-between rounded-md">
			{/* Close Button (small x in top-right) */}
			<button
			    title="Close"
				onClick={handleClose}
				className="absolute top-1 right-2 text-white text-xs"
			>
				<FaTimes className="w-3 h-3" />
			</button>

			{/* Notification Icon and Content */}
			<div className="flex items-center px-2">
				<FaFire className="text-orange-500 w-5 h-5 mr-2" />
				<div className="flex-grow text-left">
					<h3 className="text-sm font-semibold text-white">BonFire</h3>
					<p className="text-xs text-gray-300">BonFire is Running In Background</p>
				</div>
			</div>

			{/* "What's New" Button */}
			<button
				className="bg-blue-600 text-white hover:bg-blue-700 w-[90%] mx-auto mt-2 py-1 text-sm rounded-md"
				onClick={openWhatsNew}
			>
				What's New
			</button>
		</div>
	);
};

export default Notification;
