import React from "react";
import { FaComments } from "react-icons/fa"; // Importing the chat icon
import { useLocation } from "react-router-dom"; // Importing useLocation for accessing URL parameters
import { FaTimes } from "react-icons/fa"; // Importing close icon

const Notification = () => {
	const { search } = useLocation();
	const params = new URLSearchParams(search); // Create URLSearchParams to handle query parameters
	const title = params.get("title"); // Retrieve the title from the URL
	const body = params.get("body"); // Retrieve the body from the URL

	// Function to close the notification (to be implemented)
	const handleClose = () => {
		// Logic to close the notification window
		window.close(); // This may need to be handled differently in your Electron setup
	};

	return (
		<div className="fixed w-screen bg-neutral-950 p-4 shadow-lg h-full flex flex-col justify-between select-none">
			{/* Close Button */}
			<button
				onClick={handleClose}
				className="text-white absolute top-2 right-2"
			>
				<FaTimes className="w-4 h-4" />
			</button>

			{/* Notification Title and Body */}
			<div className="flex items-center h-full">
				{/* Chat Icon on the Left */}
				<div className="mr-4 flex items-center">
					<FaComments className="text-gray-300 w-10 h-10" />
				</div>

				<div className="flex-grow text-left">
					<h3 className="text-lg font-semibold text-white">
						{title}
					</h3>
					<p className="text-sm text-gray-300 mt-1">{body}</p>
				</div>
			</div>
		</div>
	);
};

export default Notification;
