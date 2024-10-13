import { FC, useEffect, useState, useCallback, useRef } from "react";
import { db } from "./FirebaseConfig";
import {
	doc,
	getDoc,
	DocumentData,
	arrayRemove,
	arrayUnion,
	updateDoc,
} from "firebase/firestore";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router-dom"; // Make sure you're using React Router for navigation
import { QRCodeGenerator } from "../components/QRCodeGenerator";
import GreetingWithBlob from "../components/GreetingWithBlob";
import Asthetic from "../components/Asthetic";
import { Add } from "../components/Add";
import Chat from "../components/Chat"; // Adjust the path based on your folder structure

interface FriendRequest {
	username: string;
	profilePicUrl?: string; // profilePicUrl may be optional initially
}
// Define the Friend interface to structure the friend data
interface Friend {
	username: string;
	profilePicUrl?: string;
}

export const AppPage: FC = () => {
	const [showModal, setShowModal] = useState(false);
	const [showToast, setShowToast] = useState(false);
	const [showUserModal, setUserModal] = useState(false);
	const [showFriendModal, setFriendModal] = useState(false);
	const [userInfo, setUserInfo] = useState<DocumentData | null>(null);
	const [isModalVisible, setIsModalVisible] = useState(false);
	// Declare state for tracking active tab
	const [activeTab, setActiveTab] = useState("profile"); // Default to 'profile' tab
	const [currentDate, setCurrentDate] = useState("");
	const [currentTime, setCurrentTime] = useState("");
	const [isContextOpen, setIsContextOpen] = useState(false);

	const currentUsername = getUsernameFromCookie();
	const welcomeusername: string = currentUsername ?? "UNDEFINED";
	const [friendUsername, setFriendUsername] = useState<string | null>(null);
	const closeModal = () => setShowModal(false); // Function to close the modal
	const closeToast = () => setShowToast(false); // Function to close the toast
	const navigate = useNavigate();
	const [sentRequests, setSentRequests] = useState<string[]>([]);
	const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
	const [currentView, setCurrentView] = useState<"home" | "friends" | null>(
		"home",
	);

	const [friendInfo, setFriendInfo] = useState<DocumentData | null>(null);
	const [activeChat, setActiveChat] = useState<null | {
		username: string;
		isGroup: boolean;
		friendPic?: string | null; // Add friendPic to ActiveChat
		currentUserPic?: string | null;
	}>(null);
	// Inside your component
	const contextMenuRef = useRef<HTMLDivElement | null>(null);

	const [activeFriend, setActiveFriend] = useState<string | null>(null);

	// Function to fetch the friend's profile picture from Firestore
	async function getFriendProfilePic(
		username: string,
	): Promise<string | null> {
		try {
			const docRef = doc(db, "users", username);
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				const data = docSnap.data();
				return data.profilePicUrl || null; // Use profilePic if it exists, otherwise null
			} else {
				console.log("No such document!");
				return null;
			}
		} catch (error) {
			console.error("Error fetching profile picture:", error);
			return null;
		}
	}

	// Fetch profile picture if not already set when `activeChat` changes
	useEffect(() => {
		if (activeChat && activeChat.friendPic === undefined) {
			getFriendProfilePic(activeChat.username).then((pic) =>
				setActiveChat((prev) =>
					prev ? { ...prev, friendPic: pic } : prev,
				),
			);
		}
	}, [activeChat]);

	const [contextMenuPosition, setContextMenuPosition] = useState({
		x: 0,
		y: 0,
	});

	const closeContextMenu = () => {
		setActiveFriend(null);
		setIsContextOpen(false);
	};

	const handleViewChange = (view: "home" | "friends") => {
		setCurrentView(view);
	};

	const openContextMenu = (username: string, event: React.MouseEvent) => {
		event.preventDefault(); // Prevent default right-click behavior
		setActiveFriend(username);
		setIsContextOpen(true);

		// Get the button's position using getBoundingClientRect
		const buttonRect = (
			event.currentTarget as HTMLElement
		).getBoundingClientRect();

		// Adjust the position to ensure it stays on the screen
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;
		const menuWidth = 300; // Approximate width of context menu
		const menuHeight = 130; // Approximate height of context menu

		// Calculate the new position
		let adjustedX = buttonRect.right + 10; // Position to the right of the button
		let adjustedY = buttonRect.bottom - menuHeight + 35; // Position above the button

		// Check if the context menu goes out of the right side of the screen
		if (adjustedX + menuWidth > windowWidth) {
			adjustedX = windowWidth - menuWidth - -25; // Move to the left
		}

		// Check if the context menu goes out of the bottom of the screen
		if (adjustedY + menuHeight > windowHeight) {
			adjustedY = windowHeight - menuHeight - 10; // Adjust to fit above the button
		}

		// Check if the context menu goes out of the top of the screen
		if (adjustedY < 0) {
			adjustedY = 10; // Move it down to fit in the viewport
		}

		setContextMenuPosition({ x: adjustedX, y: adjustedY });
	};

	const [friendsList, setFriendsList] = useState<Friend[]>([]);

	function getUsernameFromCookie(): string | null {
		const cookieString = document.cookie;
		const usernameMatch = cookieString
			.split("; ")
			.find((cookie) => cookie.startsWith("username="));

		return usernameMatch ? usernameMatch.split("=")[1] : null;
	}

	function removeUsernameFromCookie() {
		// Setting max-age to 0 effectively deletes the cookie
		document.cookie = `username=; max-age=0; path=/; Secure; SameSite=Strict`;
	}

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				contextMenuRef.current &&
				!contextMenuRef.current.contains(event.target as Node)
			) {
				closeContextMenu(); // Close the context menu
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		const fetchFriendsList = async () => {
			try {
				// Fetch the user document for the current user
				const userDoc = await getDoc(
					doc(db, "users", userInfo?.username),
				);
				if (userDoc.exists()) {
					const data = userDoc.data();
					const friends = data.friendList || []; // Ensure it's an array of usernames

					// Fetch profile picture URLs for each friend
					const friendsWithProfilePics = await Promise.all(
						friends.map(async (username: string) => {
							const friendDoc = await getDoc(
								doc(db, "users", username),
							);
							if (friendDoc.exists()) {
								const friendData = friendDoc.data();
								return {
									username,
									profilePicUrl:
										friendData.profilePicUrl || "", // Check if profilePicUrl exists
								};
							}
							return { username, profilePicUrl: "" }; // Return only username if no profilePicUrl found
						}),
					);

					// Update the state with the fetched friends data
					setFriendsList(friendsWithProfilePics);
				}
			} catch (error) {
				console.error("Error fetching friends list:", error);
			}
		};

		if (userInfo?.username) {
			fetchFriendsList(); // Call the function when username is available
		}
	}, [userInfo?.username]); // Dependency on username

	useEffect(() => {
		const fetchFriendRequests = async () => {
			try {
				// Fetch the user document for the current user
				const userDoc = await getDoc(
					doc(db, "users", userInfo?.username),
				);
				if (userDoc.exists()) {
					const data = userDoc.data();
					const requests = data.friendRequests || []; // Ensure it's an array

					// Fetch profile picture URLs for each friend request
					const requestsWithProfilePics = await Promise.all(
						requests.map(async (username: string) => {
							const friendDoc = await getDoc(
								doc(db, "users", username),
							);
							if (friendDoc.exists()) {
								const friendData = friendDoc.data();
								return {
									username,
									profilePicUrl: friendData.profilePicUrl, // Assuming profilePicUrl is in the friend document
								};
							}
							return { username }; // Return without profilePicUrl if not found
						}),
					);

					setFriendRequests(requestsWithProfilePics); // Set the state with fetched data
				}
			} catch (error) {
				console.error("Error fetching friend requests:", error);
			}
		};

		if (userInfo?.username) {
			fetchFriendRequests();
		}
	}, [userInfo?.username]); // Dependency on username

	// Accept Friend Request Function
	const AcceptFriendRequest = async (
		currentUsername: string,
		senderUsername: string,
	) => {
		try {
			// Get current user's document
			const currentUserDocRef = doc(db, "users", currentUsername);
			const currentUserDoc = await getDoc(currentUserDocRef);

			if (currentUserDoc.exists()) {
				// Update the current user's FriendList array
				await updateDoc(currentUserDocRef, {
					friendList: arrayUnion(senderUsername), // Add sender to current user's friend list
				});
			}

			// Get sender's document
			const senderUserDocRef = doc(db, "users", senderUsername);
			const senderUserDoc = await getDoc(senderUserDocRef);

			if (senderUserDoc.exists()) {
				// Update the sender's FriendList array
				await updateDoc(senderUserDocRef, {
					friendList: arrayUnion(currentUsername), // Add current user to sender's friend list
				});
			}

			// Optionally, you can remove the sender's username from the current user's friendRequests array after accepting
			await updateDoc(currentUserDocRef, {
				friendRequests: arrayRemove(senderUsername), // Remove sender from friend requests
			});

			console.log(
				`Friend request accepted between ${currentUsername} and ${senderUsername}`,
			);
		} catch (error) {
			console.error("Error accepting friend request: ", error);
		}
	};

	// Function to handle accept friend request button click
	const handleAccept = (senderUsername: string) => {
		// Call the AcceptFriendRequest function to update Firestore
		AcceptFriendRequest(userInfo?.username, senderUsername);

		// Remove the friend request from the UI immediately
		setFriendRequests((prevRequests) =>
			prevRequests.filter(
				(request) => request.username !== senderUsername,
			),
		);
	};

	// Function to toggle modal visibility
	const toggleModal = () => {
		setIsModalVisible((prev) => !prev);
		setActiveChat(null);
		setCurrentView("friends");
	};
	const logout = () => {
		removeUsernameFromCookie();
		localStorage.removeItem("hasSeenWelcomeMessage");

		// Redirect to the login screen
		navigate("/index");
	};

	const openUserModal = () => {
		setUserModal(true); // Show the modal
		setActiveTab("profile");
	};

	const openFriendModal = (username: string) => {
		setFriendUsername(username);
		setFriendModal(true); // Show the modal
	};

	const closeFriendModal = () => {
		setFriendModal(false); // Show the modal
	};

	// Function to fetch user info from Firestore
	const fetchUserInfo = async () => {
		if (!currentUsername) return;

		const userDocRef = doc(db, "users", currentUsername); // Fetch user document by username
		const userDocSnap = await getDoc(userDocRef);

		if (userDocSnap.exists()) {
			setUserInfo(userDocSnap.data()); // Set user data in state
		} else {
			console.log("No such user!");
		}
	};

	// Function to fetch friend info from Firestore
	const fetchFriendInfo = async (friendUsername: string) => {
		if (!friendUsername) return;

		try {
			const friendDocRef = doc(db, "users", friendUsername); // Fetch friend document by username
			const friendDocSnap = await getDoc(friendDocRef);

			if (friendDocSnap.exists()) {
				setFriendInfo(friendDocSnap.data()); // Return friend data
			} else {
				console.log("No such friend!");
				return null;
			}
		} catch (error) {
			console.error("Error fetching friend info:", error);
		}
	};

	useEffect(() => {
		const getFriendInfo = async () => {
			if (showFriendModal && friendUsername) {
				const friendData = await fetchFriendInfo(friendUsername);
				if (friendData) {
					setFriendInfo(friendInfo); // Set friend data in state
				}
			}
		};

		getFriendInfo();
	}, [showFriendModal, friendUsername]);

	useEffect(() => {
		const checkNetworkStatus = () => {
			if (!navigator.onLine) {
				navigate("/offline"); // Redirect to Offline page if offline
			}
		};

		// Check on mount
		checkNetworkStatus();

		// Add event listeners
		window.addEventListener("offline", checkNetworkStatus);

		return () => {
			window.removeEventListener("offline", checkNetworkStatus);
		};
	}, [navigate]);

	useEffect(() => {
		const updateDateTime = () => {
			const now = new Date();
			setCurrentDate(now.toLocaleDateString());
			setCurrentTime(
				now.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
			);
		};

		updateDateTime(); // Initial call to set date and time
		const intervalId = setInterval(updateDateTime, 1000); // Update every second

		return () => clearInterval(intervalId); // Cleanup on unmount
	}, []);

	useEffect(() => {
		fetchUserInfo(); // Fetch user info
	}, [showUserModal]);
	const closeUserModal = () => {
		setUserModal(false); // Close the modal
	};

	useEffect(() => {
		const hasSeenWelcomeMessage = localStorage.getItem(
			"hasSeenWelcomeMessage",
		);

		if (!hasSeenWelcomeMessage) {
			setShowModal(true);
			setShowToast(true);
			localStorage.setItem("hasSeenWelcomeMessage", "true"); // Mark as seen

			// Automatically close the toast after 2 seconds
			setTimeout(() => {
				closeToast(); // Call closeToast after 2 seconds
			}, 5000);
		}
	}, []); // Runs once when the component mounts

	return (
		<Layout>
			{/* Modal Notification */}
			{showModal && (
				<div className="modal modal-open">
					<div className="modal-box">
						<h2 className="font-bold text-lg font-helvetica">
							Welcome to Wchat Version 1.0
						</h2>
						<p className="py-4 font-helvetica">
							Here are some features and changes:
						</p>
						<ul className="list-disc pl-5 font-helvetica">
							<li>Group Chats</li>
							<li>File Uploads (Images, Videos, Audios)</li>
							<li>Responsive UI</li>
							<li>Notifications and Alerts</li>
							<li>Dark Mode Support</li>
						</ul>
						<div className="modal-action">
							<button
								className="btn font-helvetica"
								onClick={closeModal}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Pass modal visibility and toggle function as props */}
			<Add
				isModalVisible={isModalVisible}
				toggleModal={toggleModal}
				userId={userInfo?.userId}
				currentUsername={userInfo?.username}
				sentRequests={sentRequests} // Pass sent requests here
			/>

			{showFriendModal && (
				<div className="modal modal-open">
					<div className="modal-box flex flex-row p-0 fixed h-screen max-w-full bg-black shadow-lg font-helvetica">
						{/* Close Button */}
						<button
							className="absolute top-4 right-4 text-gray-300 hover:text-white text-lg"
							onClick={closeFriendModal}
						>
							&times;
						</button>

						{/* Left-side Sidebar */}
						<div className="bg-zinc-900 text-white p-6 flex flex-col space-y-6 w-1/4 h-full">
							<div>
								<h3 className="uppercase font-semibold text-sm mb-2 text-gray-400">
									Friend Details
								</h3>

								<button
									className={`w-full text-left p-3 ${
										activeTab === "profile"
											? "bg-blue-600 text-white rounded-lg"
											: "bg-transparent hover:bg-gray-700"
									}`}
									onClick={() => setActiveTab("profile")}
								>
									Profile Info
								</button>

								<button
									className={`w-full text-left p-3 ${
										activeTab === "moreInfo"
											? "bg-blue-600 text-white rounded-lg"
											: "bg-transparent hover:bg-gray-700"
									}`}
									onClick={() => setActiveTab("moreInfo")}
								>
									More Info
								</button>
							</div>
						</div>

						{/* Main Content Area */}
						<div className="bg-zinc-950 text-white w-3/4 p-8">
							<h2 className="font-bold text-2xl mb-6">
								Friend Information
							</h2>

							{/* Profile Info Tab */}
							{activeTab === "profile" && friendInfo && (
								<div className="space-y-8 relative">
									<div className="relative w-full h-32 bg-transparent rounded-lg overflow-hidden shadow-lg flex">
										<div className="absolute inset-0">
											<Asthetic />
											{/* Aesthetic background */}
										</div>
										<div className="z-10 flex w-full h-full items-center p-4 space-x-6">
											<div className="avatar">
												<div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
													<img
														src={
															friendInfo?.profilePicUrl
														}
														alt="Profile Picture"
													/>
												</div>
											</div>
											<div className="flex flex-col justify-center text-white">
												<h3 className="text-2xl font-semibold">
													{friendInfo?.username}
												</h3>
												<p className="text-sm text-gray-300">
													{friendInfo?.gender}
												</p>
												<p className="text-sm text-gray-400">
													{friendInfo?.pronouns}
												</p>
											</div>
										</div>
									</div>

									{/* Additional Info */}
									<div className="bg-zinc-950 text-white p-6 rounded-lg shadow-md space-y-4">
										<p>
											<strong>Creation Date:</strong>{" "}
											{new Date(
												friendInfo.creationDate
													.seconds * 1000,
											).toLocaleDateString()}
										</p>
										<p>
											<strong>User ID:</strong>{" "}
											{friendInfo.userId}
										</p>
										<p>
											<strong>Description:</strong>{" "}
											{friendInfo.description}
										</p>

										<div className="flex space-x-7">
											{/* Block Friend Button */}
											<button className="bg-red-600 hover:bg-red-500 hover:from-red-700 hover:to-red-600 text-white py-2 px-4 rounded relative transition duration-300 ease-in-out transform hover:scale-110 hover:shadow-[0_0_30px_10px_rgba(255,0,0,0.9)] hover:rotate-1 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50">
												Block Friend
											</button>

											{/* Remove Friend Button */}
											<button className="bg-red-700 hover:bg-red-600 hover:from-red-800 hover:to-red-700 text-white py-2 px-4 rounded relative transition duration-300 ease-in-out transform hover:scale-110 hover:shadow-[0_0_30px_10px_rgba(255,0,0,0.9)] hover:-rotate-1 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50">
												Remove Friend
											</button>
										</div>
									</div>
								</div>
							)}

							{/* More Info Tab */}
							{activeTab === "moreInfo" && (
								<div className="py-4 relative">
									{/* QR Code Tab */}
									<QRCodeGenerator
										userId={friendInfo?.userId}
									/>

									{/* Asthetic Component */}
									<div className="absolute inset-0 w-full h-full pointer-events-none z-[-1] ">
										<Asthetic />
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{showUserModal && (
				<div className="modal modal-open">
					<div className="modal-box flex flex-row p-0 fixed h-screen max-w-full bg-black shadow-lg font-helvetica">
						{" "}
						{/* Darker background */}
						{/* Close Button at Top-Right */}
						<button
							className="absolute top-4 right-4 text-gray-300 hover:text-white text-lg"
							onClick={closeUserModal}
						>
							&times; {/* Small 'x' */}
						</button>
						{/* Left-side Sidebar with Headings and Buttons */}
						<div className="bg-zinc-900 text-white p-6 flex flex-col space-y-6 w-1/4 h-full">
							{" "}
							{/* Darker sidebar */}
							{/* Profile Section Heading */}
							<div>
								<h3 className="uppercase font-semibold text-sm mb-2 text-gray-400">
									Profile
								</h3>

								{/* Profile Info Button */}
								<button
									className={`w-full text-left p-3 ${
										activeTab === "profile"
											? "bg-blue-600 text-white rounded-lg"
											: "bg-transparent hover:bg-gray-700"
									}`}
									onClick={() => setActiveTab("profile")}
								>
									Profile Info
								</button>

								{/* QR Code Button under Profile Heading */}
								<button
									className={`w-full text-left p-3 ${
										activeTab === "qr"
											? "bg-blue-600 text-white rounded-lg"
											: "bg-transparent hover:bg-gray-700"
									}`}
									onClick={() => setActiveTab("qr")}
								>
									QR Code
								</button>
							</div>
						</div>
						{/* Main Content Area */}
						<div className="bg-zinc-950 text-white w-3/4 p-8">
							<h2 className="font-bold text-2xl mb-6 font-helvetica">
								User Information
							</h2>

							{/* Conditional Rendering Based on Active Tab */}
							{activeTab === "profile" && userInfo ? (
								<div className="space-y-8 relative font-helvetica">
									{/* Profile Card with Asthetic Background */}
									<div className="relative w-full h-32 bg-transparent rounded-lg overflow-hidden shadow-lg flex">
										{/* Asthetic Background */}
										<div className="absolute inset-0">
											<Asthetic />
										</div>

										{/* Profile Content */}
										<div className="z-10 flex w-full h-full items-center p-4 space-x-6">
											{/* Profile Avatar */}
											<div className="avatar">
												<div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
													<img
														src={
															userInfo.profilePicUrl
														}
														alt="Profile Picture"
													/>
												</div>
											</div>

											{/* Profile Info (Username, Gender, Pronouns) */}
											<div className="flex flex-col justify-center text-white">
												<h3 className="text-2xl font-semibold">
													{userInfo.username}
												</h3>
												<p className="text-sm text-gray-300">
													{userInfo.gender}
												</p>
												<p className="text-sm text-gray-400">
													{userInfo.pronouns}
												</p>
											</div>
										</div>
									</div>

									{/* Additional User Info Below the Profile Card */}
									<div className="bg-zinc-950 text-white p-6 rounded-lg shadow-md space-y-4">
										<p>
											<strong>Creation Date:</strong>{" "}
											{new Date(
												userInfo.creationDate.seconds *
													1000,
											).toLocaleDateString()}
										</p>
										<p>
											<strong>User ID:</strong>{" "}
											{userInfo.userId}
										</p>
										<p>
											<strong>Short Description:</strong>{" "}
											{userInfo.description}
										</p>
									</div>
								</div>
							) : (
								activeTab === "qr" && (
									<div className="py-4 relative font-helvetica">
										{/* QR Code Tab */}
										<QRCodeGenerator
											userId={userInfo?.userId}
										/>

										{/* Asthetic Component */}
										<div className="absolute inset-0 w-full h-full pointer-events-none z-[-1] ">
											<Asthetic />
										</div>
									</div>
								)
							)}

							{/* Removed Close Button from Modal Footer */}
						</div>
					</div>
				</div>
			)}
			{/* Toast Notification */}
			{showToast && (
				<div className="toast toast-bottom toast-end z-40 font-helvetica">
					<div className="alert alert-info bg-blue-700">
						<span className="text-lg">Welcome to Wchat!</span>
						<br></br>
						<div className="toast-action">
							<a
								className="underline cursor-pointer"
								onClick={closeToast}
							>
								Click here to Close This
							</a>
						</div>
					</div>
				</div>
			)}
			{activeChat && (
				<div className="fixed inset-0 top-10 left-16 bg-black rounded-lg overflow-hidden shadow-lg z-40">
					<Chat
						friendUsername={activeChat.username}
						isDM={!activeChat.isGroup} // Reflects DM status correctly
						friendPic={activeChat.friendPic || undefined}
						currentUserPic={userInfo?.profilePicUrl}
						onClose={() => {
							setActiveChat(null);
							setCurrentView("friends");
						}}
						currentUsername={userInfo?.username}
					/>
				</div>
			)}

			{/* Main wrapper to hold both the sidebar and content */}
			<div className="flex">
				{/* Sidebar (Discord-like) */}
				<div className="fixed left-0 h-screen w-16 bg-zinc-900 text-white flex flex-col items-center justify-start z-10 pt-2 font-helvetica space-y-2">
					{/* Two buttons at the top of the sidebar */}
					<button
						className="btn btn-square btn-ghost hover:bg-blue-600"
						type="button"
						title="Home"
						onClick={() => handleViewChange("home")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							height="40px"
							viewBox="0 -960 960 960"
							width="40px"
							fill="#e8eaed"
						>
							<path d="M230.26-190.26h148.46v-211.28q0-13.29 8.99-22.29 9-8.99 22.29-8.99h140q13.29 0 22.29 8.99 8.99 9 8.99 22.29v211.28h148.46V-558.8q0-3.08-1.34-5.58-1.35-2.5-3.66-4.42L487.31-747.31q-3.08-2.43-7.31-2.43-4.23 0-7.31 2.43L235.26-568.8q-2.31 1.92-3.66 4.42-1.34 2.5-1.34 5.58v368.54Zm-50.26 0v-368.46q0-15.03 6.52-28.2 6.53-13.18 18.61-21.8l237.43-178.97q16.18-12.56 37.27-12.56 21.09 0 37.61 12.56l237.43 178.97q12.08 8.62 18.61 21.8 6.52 13.17 6.52 28.2v368.46q0 20.52-14.87 35.39Q750.26-140 729.74-140H562.31q-13.3 0-22.29-8.99-8.99-9-8.99-22.29v-211.29H428.97v211.29q0 13.29-8.99 22.29-8.99 8.99-22.29 8.99H230.26q-20.52 0-35.39-14.87Q180-169.74 180-190.26Zm300-280.46Z" />
						</svg>
					</button>

					<button
						className="btn btn-square btn-ghost hover:bg-blue-600"
						onClick={toggleModal}
						type="button"
						title="Add"
					>
						{isModalVisible ? "" : ""}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							height="40px"
							viewBox="0 -960 960 960"
							width="40px"
							fill="#e8eaed"
						>
							<path d="M454.87-454.87H245.13q-10.68 0-17.9-7.27-7.23-7.26-7.23-17.99 0-10.74 7.23-17.87 7.22-7.13 17.9-7.13h209.74v-209.74q0-10.68 7.27-17.9 7.26-7.23 17.99-7.23 10.74 0 17.87 7.23 7.13 7.22 7.13 17.9v209.74h209.74q10.68 0 17.9 7.27 7.23 7.26 7.23 17.99 0 10.74-7.23 17.87-7.22 7.13-17.9 7.13H505.13v209.74q0 10.68-7.27 17.9-7.26 7.23-17.99 7.23-10.74 0-17.87-7.23-7.13-7.22-7.13-17.9v-209.74Z" />
						</svg>
					</button>

					<br></br>
					{/* Server icons with tooltips */}
					<div className="space-y-4 mt-4 flex flex-col items-center justify-center font-helvetica">
						<div
							className="tooltip tooltip-right"
							data-tip="Group 1"
						>
							<div className="rounded-full w-12 h-12 shadow-md hover:shadow-blue-500/50 bg-gray-500 hover:opacity-80 flex items-center justify-center hover:rounded-lg cursor-pointer overflow-hidden transition-all duration-300 ease-linear">
								<img
									src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
									alt="Server 1"
									className="w-12 h-12 object-cover"
								/>
							</div>
						</div>

						<div
							className="tooltip tooltip-right"
							data-tip="Group 2"
						>
							<div className="rounded-full w-12 h-12 shadow-md hover:shadow-blue-500/50 bg-gray-500 hover:opacity-80 flex items-center justify-center hover:rounded-lg cursor-pointer overflow-hidden transition-all duration-300 ease">
								<img
									src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
									alt="Server 2"
									className="w-12 h-12 object-cover"
								/>
							</div>
						</div>

						<div
							className="tooltip tooltip-right"
							data-tip="Group 3"
						>
							<div className="rounded-full w-12 h-12 bg-gray-500 shadow-md hover:shadow-blue-500/50 flex items-center justify-center hover:rounded-lg cursor-pointer overflow-hidden transition-all duration-300 ease">
								<img
									src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
									alt="Server 3"
									className="w-12 h-12 object-cover"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex-1 ml-16">
					{/* Navbar */}
					<div className="navbar bg-neutral-900 shadow-md z-30 relative left-0 w-full ">
						<div className="flex-1 space-x-4">
							<a
								className={`btn btn-ghost text-lg font-helvetica ${
									currentView === "home"
										? "text-blue-500 shadow-sm shadow-blue-500/50"
										: ""
								}`}
								onClick={() => handleViewChange("home")}
							>
								Home
							</a>
							<a
								className={`btn btn-ghost text-lg font-helvetica ${
									currentView === "friends"
										? "text-blue-500 shadow-sm shadow-blue-500/50"
										: ""
								}`}
								onClick={() => handleViewChange("friends")}
							>
								Friends
							</a>
						</div>
						<div className="flex-none">
							<div className="dropdown dropdown-end">
								<div
									tabIndex={0}
									role="button"
									className="btn btn-ghost btn-circle"
								>
									<div className="indicator">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											height="24px"
											viewBox="0 -960 960 960"
											width="24px"
											fill="#e8eaed"
											className="h-5 w-5"
											stroke="currentColor"
										>
											<path d="M124.65-164.65v-113.18h77.13v-273.39q0-92.91 55.48-167.2 55.48-74.3 145.39-99.54v-19.28q0-32.23 22.58-54.79 22.59-22.56 54.85-22.56 32.26 0 54.76 22.56 22.51 22.56 22.51 54.79v19.28q89.91 25 145.89 98.66 55.98 73.65 55.98 168.08v273.39h77.13v113.18h-711.7Zm356.11-332.39ZM480.2-31.7q-38.67 0-65.91-27.3-27.25-27.31-27.25-65.65H573.2q0 38.48-27.32 65.72Q518.56-31.7 480.2-31.7ZM314.96-277.83h331.08v-273.28q0-68.87-48.72-117.13-48.72-48.26-117.4-48.26T363.1-668.21q-48.14 48.29-48.14 116.99v273.39Z" />
										</svg>
										{friendRequests.length > 0 && (
											<span className="badge badge-sm indicator-item">
												{friendRequests.length}{" "}
												{/* Display number of requests */}
											</span>
										)}
									</div>
								</div>
								<div
									tabIndex={0}
									className="card card-compact dropdown-content bg-base-200 z-[1] mt-3 w-96 shadow"
								>
									<ul className="menu dropdown-content bg-base-300 rounded-box z-[1] w-96 p-2 shadow">
										{friendRequests.length > 0 ? (
											friendRequests.map(
												({
													username,
													profilePicUrl,
												}) => (
													<li
														key={username}
														className="p-2 hover:bg-base-100 flex items-center"
													>
														<div className="flex justify-between items-center w-full">
															{profilePicUrl && (
																<img
																	className="w-10 h-10 rounded-full mr-2"
																	src={
																		profilePicUrl
																	}
																	alt={`${username}'s profile`}
																/>
															)}
															<span className="flex-1 font-helvetica">
																{username} has
																sent you a
																friend request.
															</span>
															<button
																className="btn bg-blue-600 hover:bg-blue-700 ml-2 font-helvetica"
																onClick={() =>
																	handleAccept(
																		username,
																	)
																}
															>
																Accept
															</button>
														</div>
													</li>
												),
											)
										) : (
											<li className="p-2 font-helvetica">
												No friend requests
											</li>
										)}
									</ul>
								</div>
							</div>
							<div className="dropdown dropdown-end ">
								<div
									title="Account"
									tabIndex={0}
									role="button"
									className="btn btn-ghost btn-circle avatar"
								>
									<div className="w-10 h-10 rounded-full skeleton">
										<img
											alt=""
											src={userInfo?.profilePicUrl}
										/>
									</div>
								</div>
								<ul
									tabIndex={0}
									className="menu menu-sm dropdown-content bg-base-300 rounded-box z-[1] mt-3 w-52 p-2 shadow font-helvetica"
								>
									<li>
										<a
											className="justify-between hover:bg-blue-600"
											onClick={openUserModal}
										>
											Profile
											<span className="badge font-helvetica">
												New
											</span>
										</a>
									</li>
									<li>
										<a className="hover:bg-blue-600">
											Settings
										</a>
									</li>
									<li>
										<a
											className="hover:bg-red-600"
											onClick={logout}
										>
											Logout
										</a>
									</li>
								</ul>
							</div>
						</div>
					</div>
					{currentView === "home" ? (
						<GreetingWithBlob
							currentDate={currentDate}
							currentTime={currentTime}
							currentUsername={welcomeusername}
						/>
					) : null}
					{currentView === "friends" ? (
						<div className="relative friend-list-container">
							<div className="z-[-1] fixed inset-0">
								{/* Aesthetic Background */}
								<Asthetic />
							</div>
							<h2 className="text-3xl mb-4 text-white pl-3">
								Your Friends
							</h2>
							<ul className="friend-list space-y-3 font-helvetica pr-3 pl-3">
								{friendsList.length > 0 ? (
									friendsList.map((friend) => (
										<li
											key={friend.username}
											onContextMenu={(e) =>
												openContextMenu(
													friend.username,
													e,
												)
											}
											className={`flex relative items-center rounded-lg p-2 cursor-pointer z-10 group/item transition duration-300 ease-in-out ${
												activeFriend ===
													friend.username &&
												isContextOpen
													? "bg-blue-600 shadow-md shadow-blue-500/50"
													: "bg-black bg-opacity-20 backdrop-blur-[100px] hover:bg-gray-800"
											}`}
										>
											{friend.profilePicUrl ? (
												<img
													src={friend.profilePicUrl}
													alt={`${friend.username}'s profile`}
													className="w-10 h-10 rounded-full mr-2"
												/>
											) : (
												<div className="w-10 h-10 rounded-full bg-gray-300 mr-2"></div> // Placeholder if no profile pic
											)}
											<span className="text-white">
												{friend.username}

												<span className="ml-20 pl-20  group-hover/item:visible invisible">
													Click On
												<kbd className="kbd kbd-xs mx-2">
													⋮
												</kbd>
													button to open chatting options.
												</span>
											</span>

											{/* Blue button to trigger the context menu */}
											<button
												className="ml-auto bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full z-20"
												onClick={(e) =>
													openContextMenu(
														friend.username,
														e,
													)
												}
											>
												⋮
											</button>
										</li>
									))
								) : (
									<li className="text-white">
										No friends found.
									</li>
								)}
							</ul>

							{/* Context Menu outside the list */}
							{activeFriend && contextMenuPosition && (
								<div
									className="absolute bg-neutral-950 border font-helvetica border-gray-600 text-white rounded-lg shadow-sm shadow-blue-500/50 p-2"
									ref={contextMenuRef} // Add this line
									style={{
										top: `${contextMenuPosition.y}px`,
										left: `${contextMenuPosition.x}px`,
										zIndex: 9999,
									}}
								>
									<ul className="menu menu-compact p-2 space-y-2">
										<li className="rounded-lg shadow-md hover:bg-blue-700 hover:shadow-blue-800">
											<button
												className="flex items-center space-x-2"
												onClick={() => {
													setActiveChat({
														username: activeFriend,
														isGroup: false,
													}); // or isGroup: true if it's a group
													closeContextMenu();
													setCurrentView(null); // Make sure to call the setter function to update state
												}}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													height="24px"
													viewBox="0 -960 960 960"
													width="24px"
													fill="#e8eaed"
												>
													<path d="m226.83-218.26-85.96 85.96q-26.67 26.67-61.45 12.13-34.77-14.55-34.77-52.53v-639.8q0-46.93 33.12-80.05 33.13-33.12 80.06-33.12h644.34q46.93 0 80.06 33.12 33.12 33.12 33.12 80.05v481.07q0 46.92-33.12 80.05-33.13 33.12-80.06 33.12H226.83Zm-42.57-113.17h617.91V-812.5H157.83v507.74l26.43-26.67Zm-26.43 0V-812.5v481.07ZM266.39-400h265.46q17 0 28.5-11.5t11.5-28.5q0-17-11.5-28.5t-28.5-11.5H266.39q-17 0-28.5 11.5t-11.5 28.5q0 17 11.5 28.5t28.5 11.5Zm0-132.85h427.22q17 0 28.5-11.5t11.5-28.5q0-16.76-11.5-28.38-11.5-11.62-28.5-11.62H266.39q-17 0-28.5 11.62t-11.5 28.5q0 16.88 11.5 28.38t28.5 11.5Zm0-132.85h427.22q17 0 28.5-11.5t11.5-28.5q0-16.76-11.5-28.38-11.5-11.62-28.5-11.62H266.39q-17 0-28.5 11.62t-11.5 28.5q0 16.88 11.5 28.38t28.5 11.5Z" />
												</svg>
												<span>Open Chat</span>
											</button>
										</li>
										<li className="rounded-lg shadow-md hover:bg-blue-700 hover:shadow-blue-800">
											<button
												onClick={() => {
													openFriendModal(
														activeFriend,
													);
													closeContextMenu();
												}}
												className="flex items-center space-x-2"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													height="24px"
													viewBox="0 -960 960 960"
													width="24px"
													fill="#e8eaed"
												>
													<path d="M229.67-221.76H486.8v-23.04q0-19.61-11.26-36.33t-29.78-24.48q-22.52-10-44.4-14.88-21.88-4.88-43.12-4.88t-43 4.88q-21.76 4.88-44.28 14.88-18.66 7.79-29.98 24.44-11.31 16.65-11.31 36.37v23.04Zm368.9-60h96.47q15.95 0 26.38-10.44 10.43-10.43 10.43-26.39t-10.43-26.37q-10.43-10.41-26.38-10.41h-96.47q-15.95 0-26.38 10.44-10.43 10.43-10.43 26.39t10.43 26.37q10.43 10.41 26.38 10.41Zm-240.21-73.61q28.4 0 47.54-19.26t19.14-47.66q0-28.41-19.15-47.55-19.15-19.14-47.65-19.14-28.28 0-47.54 19.15-19.27 19.15-19.27 47.66 0 28.28 19.27 47.54 19.26 19.26 47.66 19.26Zm240.97-51.43h94.95q15.52 0 26.55-10.83 11.02-10.84 11.02-27.05t-10.65-26.85q-10.64-10.64-26.92-10.64h-94.95q-15.53 0-26.55 10.66-11.02 10.66-11.02 26.97 0 16.21 10.64 26.97 10.65 10.77 26.93 10.77ZM162.87-44.65q-46.93 0-80.05-33.12Q49.7-110.9 49.7-157.83v-441.82q0-46.93 33.12-80.05 33.12-33.13 80.05-33.13H329.7v-95.6q0-45.5 31.2-76.71 31.21-31.21 76.71-31.21h84.78q45.5 0 76.71 31.21 31.2 31.21 31.2 76.71v95.6h166.83q46.93 0 80.05 33.13 33.12 33.12 33.12 80.05v441.82q0 46.93-33.12 80.06-33.12 33.12-80.05 33.12H162.87Zm0-113.18h634.26v-441.82H622.26q-12.52 30.95-38.96 49.43-26.43 18.48-60.91 18.48h-84.78q-34.48 0-61.03-18.98-26.56-18.98-39.6-48.93H162.87v441.82Zm277.61-484.45h79.04v-163.29h-79.04v163.29ZM480-379.24Z" />
												</svg>
												<span>View Profile</span>
											</button>
										</li>
										<div className="flex items-center my-3">
											<hr className="flex-grow border-gray-200" />
											<span className="mx-2 text-gray-200">
												Friend Options
											</span>
											<hr className="flex-grow border-gray-200" />
										</div>
										<li className="rounded-lg shadow-md hover:bg-red-700 hover:shadow-red-800">
											<button className="flex items-center space-x-2">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													height="24px"
													viewBox="0 -960 960 960"
													width="24px"
													fill="#e8eaed"
												>
													<path d="M480-44.65q-90.36 0-169.8-34.26-79.43-34.26-138.23-93.18-58.8-58.92-93.06-138.47-34.26-79.56-34.26-169.92 0-90.12 34.26-169.55 34.26-79.44 93.06-138.24 58.8-58.8 138.35-92.94 79.56-34.14 169.68-34.14t169.68 34.14q79.55 34.14 138.35 92.94t93.06 138.24q34.26 79.43 34.26 169.55 0 90.36-34.26 169.92-34.26 79.55-93.06 138.47-58.8 58.92-138.23 93.18Q570.36-44.65 480-44.65Zm0-113.18q49.57 0 96.75-15.04t87.99-44.09L216.48-664.98q-28.57 41.05-43.61 88.11-15.04 47.07-15.04 96.39 0 134.57 93.92 228.61 93.92 94.04 228.25 94.04Zm263.76-138.15q28.33-41.04 43.37-88.11 15.04-47.06 15.04-96.39 0-134.09-93.92-227.89-93.92-93.8-228.25-93.8-49.33 0-96.27 14.8-46.95 14.8-87.99 43.13l448.02 448.26Z" />
												</svg>
												<span>Block</span>
											</button>
										</li>
										<li className="rounded-lg shadow-md hover:bg-red-700 hover:shadow-red-800">
											<button className="flex items-center space-x-2">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													height="24px"
													viewBox="0 -960 960 960"
													width="24px"
													fill="#e8eaed"
												>
													<path d="M279.35-364.65v218.37q0 23.34-16.46 39.96T222.88-89.7q-23.55 0-40.13-16.62-16.58-16.62-16.58-39.96v-627.44q0-23.34 16.63-39.96 16.62-16.62 39.96-16.62h314.96q19.86 0 35.6 12.76 15.75 12.77 19.98 32.34l8.1 36.66h175.84q23.34 0 39.96 16.45 16.63 16.46 16.63 40.13v352.48q0 23.34-16.63 39.96-16.62 16.63-39.96 16.63H543.28q-20.1 0-35.84-13.05-15.74-13.05-19.74-32.82l-7.53-35.89H279.35Zm311.04-31.42h130.26v-239.3H554.24q-19.86 0-35.61-13.05-15.74-13.05-19.98-32.82l-7.28-35.89H279.35v239.3h248.17q19.86 0 35.61 13.05 15.74 13.05 19.98 33.06l7.28 35.65ZM500-556.48Z" />
												</svg>
												<span>Report</span>
											</button>
										</li>
										<li className="rounded-lg shadow-md hover:bg-red-700 hover:shadow-red-800">
											<button className="flex items-center space-x-2">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													height="24px"
													viewBox="0 -960 960 960"
													width="24px"
													fill="#e8eaed"
												>
													<path d="M702.02-632.91H865.3q22.72 0 38.7 15.98 15.98 15.98 15.98 38.69 0 22.96-15.98 38.94-15.98 15.97-38.7 15.97H701.78q-23.04 0-38.86-15.97-15.81-15.98-15.81-38.82t15.98-38.82q15.98-15.97 38.93-15.97ZM360.76-494.39q-78.19 0-132.51-54.44-54.32-54.43-54.32-132.46 0-78.04 54.28-132.23 54.28-54.2 132.47-54.2t132.5 54.17q54.32 54.17 54.32 132.38 0 77.91-54.28 132.34-54.27 54.44-132.46 54.44ZM6.89-209.07v-33.65q0-42.38 20.48-76.54 20.48-34.15 55.11-51.76 66-34 136.06-51 70.07-17 142.13-17 72.53 0 142.53 17t135.76 50.76q34.62 17.57 55.1 51.66 20.48 34.1 20.48 76.88v33.65q0 48.21-32.65 80.69-32.65 32.49-80.52 32.49h-481.3q-47.87 0-80.53-32.49-32.65-32.48-32.65-80.69Zm113.18 0h481.3v-32.45q0-10.77-3.83-17.95-3.83-7.19-10.37-10.29-53.32-26.28-111.51-41.19-58.18-14.9-115.06-14.9-56.4 0-114.95 14.9-58.54 14.91-111.39 41.19-6.54 3.1-10.37 10.29-3.82 7.18-3.82 17.95v32.45Zm240.64-398.5q30.81 0 52.21-21.39 21.41-21.39 21.41-52.21 0-30.81-21.4-52.21-21.39-21.4-52.2-21.4-30.82 0-52.22 21.44-21.4 21.45-21.4 52.17 0 30.81 21.39 52.21 21.4 21.39 52.21 21.39Zm.01-73.6Zm0 472.1Z" />
												</svg>
												<span>Remove Friend</span>
											</button>
										</li>
									</ul>
								</div>
							)}
						</div>
					) : null}
				</div>
			</div>
		</Layout>
	);
};
