import React from "react";
import { FaComments, FaTimes, FaFire } from "react-icons/fa"; // Importing icons
import { useLocation } from "react-router-dom"; // Importing useLocation for accessing URL parameters
import linkify from "linkifyjs"; // Import linkify

// Set up linkify options
const linkifyOptions = {
	className: "text-blue-400 underline cursor-pointer", // Styling for links
	defaultProtocol: "https", // Ensures links without protocol still work
};

const Notification = () => {
	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const title = params.get("title");
	const body = params.get("body");

	const handleClose = () => {
		window.close();
	};

	// Function to open the "What's New" link using window.location.href
	const openWhatsNew = () => {
		window.location.href = "https://example.com/whats-new"; // Replace with your actual link
	};

	return (
		<div className="fixed w-screen h-screen bg-neutral-950 p-2 shadow-lg flex flex-col justify-between rounded-md">
			{/* Close Button (small x in top-right) */}
			<button
				onClick={handleClose}
				className="absolute top-1 right-2 text-white text-xs"
			>
				<FaTimes className="w-3 h-3" />
			</button>

			{/* Notification Icon and Content */}
			<div className="flex items-center">
				<FaFire className="text-orange-500 w-5 h-5 mr-2" />
				<div className="flex-grow text-left">
					<h3 className="text-sm font-semibold text-white">
						BonFire
					</h3>
					<p className="text-xs text-gray-300">{body || "What's new in BonFire"}</p>
				</div>
			</div>

			{/* "What's New" Button */}
			<button
				className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 w-full mt-2 rounded-md py-1"
				onClick={openWhatsNew}
			>
				What's New
			</button>
		</div>
	);
};

export default Notification;
