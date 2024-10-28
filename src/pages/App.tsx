import { FC, useEffect, useState, useCallback, useRef } from "react";
import { db, rtdb } from "./FirebaseConfig";
import funFacts from "../json/funFacts.json";
import {
	doc,
	getDoc,
	getDocs,
	collection,
	DocumentData,
	arrayRemove,
	arrayUnion,
	updateDoc,
	QueryDocumentSnapshot,
} from "firebase/firestore";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router-dom"; // Make sure you're using React Router for navigation
import { QRCodeGenerator } from "../components/QRCodeGenerator";
import GreetingWithBlob from "../components/GreetingWithBlob";
import { ref, get, onValue } from "firebase/database";
import Asthetic from "../components/Asthetic";
import { Add } from "../components/Add";
import Chat from "../components/Chat"; // Adjust the path based on your folder structure
import GroupChat from "../components/GroupChat"; // Adjust the path based on your folder structure
import { PhotoProvider, PhotoView } from "react-photo-view";
import ReactPlayer from "react-player";
import "react-photo-view/dist/react-photo-view.css";
import { FaFire } from "react-icons/fa";

interface Member {
	username: string;
	profilePicUrl: string;
}

interface Server {
	id: string;
	groupName: string;
	groupPicUrl: string;
	members: Member[]; // Store members here
	lastMessage?: string;
}

interface FriendRequest {
	username: string;
	profilePicUrl?: string; // profilePicUrl may be optional initially
}
// Define the Friend interface to structure the friend data
interface Friend {
	username: string;
	profilePicUrl?: string;
	lastMessage?: string;
}

export const AppPage: FC = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [showToast, setShowToast] = useState(false);
	const [showUserModal, setUserModal] = useState(false);
	const [showFriendModal, setFriendModal] = useState(false);
	const [userInfo, setUserInfo] = useState<DocumentData | null>(null);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [funFact, setFunFact] = useState("");

	// Declare state for tracking active tab
	const [activeTab, setActiveTab] = useState("profile"); // Default to 'profile' tab
	const [currentDate, setCurrentDate] = useState("");
	const [currentTime, setCurrentTime] = useState("");
	const [isContextOpen, setIsContextOpen] = useState(false);
	const [serverList, setServerList] = useState<Server[]>([]); // Explicitly type the state

	const currentUsername = localStorage.getItem("username");
	const welcomeusername: string = currentUsername ?? "UNDEFINED";
	const [friendUsername, setFriendUsername] = useState<string | null>(null);
	const closeModal = () => setShowModal(false); // Function to close the modal
	const closeToast = () => setShowToast(false); // Function to close the toast
	const navigate = useNavigate();
	const [sentRequests, setSentRequests] = useState<string[]>([]);
	const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
	const [currentView, setCurrentView] = useState<"home" | null>("home");

	const [friendInfo, setFriendInfo] = useState<DocumentData | null>(null);
	const [activeChat, setActiveChat] = useState<null | {
		username: string;
		friendPic?: string | null; // Add friendPic to ActiveChat
		currentUserPic?: string | null;
	}>(null);

	const [activeGroupChat, setActiveGroupChat] = useState<null | {
		groupName: string;
		groupId: string;
		groupPicUrl: string;
		members: Member[];
		currentUsername: string;
		currentUserPic: string;
	}>(null);
	// Inside your component
	const contextMenuRef = useRef<HTMLDivElement | null>(null);

	// Function to randomly pick a fun fact
    function didYouKnowRandomizer() {
        const randomIndex = Math.floor(Math.random() * funFacts.length);
        return funFacts[randomIndex];
    }

	const [activeFriend, setActiveFriend] = useState<string | null>(null);
	const [activeGroup, setActiveGroup] = useState<string | null>(null);
	const [activeMenuTab, setActiveMenuTab] = useState("Groups");
	const [searchQuery, setSearchQuery] = useState("");
	const [friendsList, setFriendsList] = useState<Friend[]>([]);
	const [showCustomToast, setShowCustomToast] = useState(false);
	const [toastContent, setToastContent] = useState({
		title: "Welcome to BonFire!",
		message: "Your chat experience just got better.",
		button: "Learn More",
	});

	const closeCustomToast = () => {
		setShowCustomToast(false);
	};

	const showCustomToastFunct = (
		title: string,
		message: string,
		button: string,
	) => {
		setToastContent({ title, message, button });
		setShowCustomToast(true);

		// Automatically close the toast after 5 seconds
		setTimeout(() => {
			closeCustomToast();
		}, 3000);
	};

	const filteredServers = serverList.filter((server) =>
		server.groupName.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const filteredFriends = friendsList.filter((friend) =>
		friend.username.toLowerCase().includes(searchQuery.toLowerCase()),
	);

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

	useEffect(() => {
		const fetchServerList = async () => {
			try {
				const serverlistRef = collection(
					db,
					`users/${currentUsername}/serverlist`,
				);
				const serverSnapshot = await getDocs(serverlistRef);

				const servers = await Promise.all(
					serverSnapshot.docs.map(
						async (
							serverDoc: QueryDocumentSnapshot<DocumentData>,
						) => {
							const serverData = serverDoc.data() as {
								groupName: string;
								groupPicUrl: string;
							};
							const serverId = serverDoc.id;

							// Fetch members from RTDB using server ID
							const membersRef = ref(
								rtdb,
								`groups/${serverId}/members`,
							);
							const membersSnapshot = await get(membersRef);

							const members: Member[] = await Promise.all(
								Object.keys(membersSnapshot.val() || {}).map(
									async (username) => {
										const userDocRef = doc(
											db,
											`users/${username}`,
										);
										const userDoc = await getDoc(
											userDocRef,
										);
										const userData = userDoc.data() as {
											profilePicUrl?: string;
										};

										return {
											username,
											profilePicUrl:
												userData?.profilePicUrl || "", // Fallback if no profilePicUrl exists
										};
									},
								),
							);

							// Fetch last message for each group
							const lastMessageRef = ref(
								rtdb,
								`groups/${serverId}/members/${currentUsername}/messages`,
							);
							const lastMessage = await new Promise<string>(
								(resolve) => {
									onValue(lastMessageRef, (snapshot) => {
										const messages = snapshot.val();
										if (messages) {
											const messageKeys =
												Object.keys(messages);
											const lastMessageKey =
												messageKeys[
													messageKeys.length - 1
												];
											const lastMessageData =
												messages[lastMessageKey];

											let formattedMessage = "";

											if (lastMessageData.gifUrl) {
												formattedMessage = "Sent a GIF";
											} else if (
												lastMessageData.audioUrl
											) {
												formattedMessage =
													"Sent an audio message";
											} else if (
												lastMessageData.content
											) {
												formattedMessage =
													lastMessageData.content;
											} else {
												formattedMessage =
													"Sent an attachment";
											}

											formattedMessage =
												lastMessageData.sender ===
												userInfo?.username
													? `You: ${formattedMessage}`
													: `${lastMessageData.sender}: ${formattedMessage}`;

											resolve(formattedMessage);
										} else {
											resolve("");
										}
									});
								},
							);

							return {
								id: serverId,
								groupName: serverData.groupName,
								groupPicUrl: serverData.groupPicUrl,
								members,
								lastMessage,
							};
						},
					),
				);

				setServerList(servers);
			} catch (error) {
				console.error("Error fetching server list:", error);
			}
		};

		fetchServerList();
	}, [currentUsername]);

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

	const handleViewChange = (view: "home") => {
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
		const menuWidth = 400; // Approximate width of context menu
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
				const userDoc = await getDoc(
					doc(db, "users", userInfo?.username),
				);
				if (userDoc.exists()) {
					const data = userDoc.data();
					const friends = data.friendList || []; // Array of usernames

					// Fetch profile picture URLs and last message for each friend
					const friendsWithProfilePics = await Promise.all(
						friends.map(async (friendUsername: string) => {
							const friendDoc = await getDoc(
								doc(db, "users", friendUsername),
							);
							let profilePicUrl = "";
							if (friendDoc.exists()) {
								const friendData = friendDoc.data();
								profilePicUrl = friendData.profilePicUrl || "";
							}

							// Fetch last message for each friend
							const lastMessageRef = ref(
								rtdb,
								`dm/${userInfo?.username}/${friendUsername}/messages`,
							);

							const lastMessage = await new Promise<string>(
								(resolve) => {
									onValue(lastMessageRef, (snapshot) => {
										const messages = snapshot.val();
										if (messages) {
											const messageKeys =
												Object.keys(messages);
											const lastMessageKey =
												messageKeys[
													messageKeys.length - 1
												];
											const lastMessageData =
												messages[lastMessageKey];

											let formattedMessage = "";

											if (lastMessageData.gifUrl) {
												formattedMessage = "Sent a GIF";
											} else if (
												lastMessageData.audioUrl
											) {
												formattedMessage =
													"Sent an audio message";
											} else if (
												lastMessageData.content
											) {
												formattedMessage =
													lastMessageData.content;
											} else {
												formattedMessage =
													"Sent an attachment";
											}

											formattedMessage =
												lastMessageData.sender ===
												userInfo?.username
													? `You: ${formattedMessage}`
													: `${friendUsername}: ${formattedMessage}`;

											resolve(formattedMessage);
										} else {
											resolve("");
										}
									});
								},
							);

							return {
								username: friendUsername,
								profilePicUrl,
								lastMessage,
							};
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

	// Cancel Friend Request Function
	const CancelFriendRequest = async (
		currentUsername: string,
		senderUsername: string,
	) => {
		try {
			// Get the current user's document reference
			const currentUserDocRef = doc(db, "users", currentUsername);

			// Remove the sender's username from the current user's friendRequests array
			await updateDoc(currentUserDocRef, {
				friendRequests: arrayRemove(senderUsername), // Remove sender from friend requests
			});

			console.log(
				`Friend request from ${senderUsername} to ${currentUsername} has been canceled.`,
			);
		} catch (error) {
			console.error("Error canceling friend request: ", error);
		}
	};

	// Function to handle cancel friend request button click
	const handleCancel = (senderUsername: string) => {
		// Call the CancelFriendRequest function to update Firestore
		CancelFriendRequest(userInfo?.username, senderUsername);

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
		setActiveMenuTab("friends");
	};
	const logout = () => {
		localStorage.removeItem("username");
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

			// Format date to 'Wednesday, 12 June 2029'
			const formattedDate = now.toLocaleDateString("en-GB", {
				weekday: "long", // Full day name
				day: "numeric", // Day of the month
				month: "long", // Full month name
				year: "numeric", // Full year
			});

			setCurrentDate(formattedDate); // Set the formatted date

			// Set the time
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

	useEffect(() => {
		setFunFact(didYouKnowRandomizer());
	}, []);

	useEffect(() => {
		// Show loading screen for 5 seconds
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 5000);

		// Clear the timer on unmount
		return () => clearTimeout(timer);
	}, []);

	if (isLoading) {
		return (
			<Layout>
				<div className="flex items-center justify-center h-screen fixed w-screen bg-neutral-900 text-white">
					<div className="flex flex-col items-center space-y-4">
						{/* Burning Fire Icon */}
						<FaFire className="text-6xl text-red-500 animate-[flicker_1.5s_infinite_alternate]" />
						<p className="text-xl font-bold">Did you know?</p>
						<p className="text-gray-400 text-sm italic">
							{funFact}
						</p>
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			{/* Modal Notification */}
			{showModal && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
					<div className="modal-box bg-neutral-950 text-neutral-100 w-full max-w-lg p-6 rounded-lg shadow-lg space-y-4">
						<h2 className="text-2xl font-semibold text-center">
							Welcome to BonFire Version 1.0
						</h2>
						<p className="text-center text-neutral-300">
							Explore the latest features and improvements:
						</p>

						<ul className="list-disc pl-5 space-y-1 text-neutral-300">
							<li>Group Chats</li>
							<li>File Uploads (Images, Videos, Audios)</li>
							<li>Responsive UI</li>
							<li>Notifications and Alerts</li>
							<li>Dark Mode Support</li>
						</ul>

						{/* Embedded YouTube video */}
						<div className="flex justify-center mt-4">
							<ReactPlayer
								url="https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
								controls
								width="100%"
								height="200px"
								className="rounded-md overflow-hidden"
							/>
						</div>

						<div className="modal-action flex justify-center">
							<button
								onClick={closeModal}
								className="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-semibold transition-all"
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
						<div className="bg-zinc-950 text-white w-3/4 p-8 rounded-lg">
							<h2 className="font-bold text-2xl mb-6">
								Friend Information
							</h2>

							{/* Profile Info Tab */}
							{activeTab === "profile" && friendInfo && (
								<div className="space-y-8 relative">
									<div className="relative w-full h-32 bg-transparent rounded-lg border-white border-2 border-opacity-70 overflow-hidden shadow-lg flex">
										<div className="absolute inset-0">
											<Asthetic />
											{/* Aesthetic background */}
										</div>
										<div className="z-10 flex w-full h-full items-center p-4 space-x-6">
											{/* Profile Avatar with PhotoView */}
											<PhotoProvider>
												<PhotoView
													src={
														friendInfo?.profilePicUrl
													}
												>
													<div className="flex justify-center cursor-pointer">
														<div className="w-24 h-24 rounded-full ring ring-white ring-offset-1 overflow-hidden">
															<img
																src={
																	friendInfo?.profilePicUrl
																}
																alt="Profile Picture"
																className="object-cover h-full w-full"
															/>
														</div>
													</div>
												</PhotoView>
											</PhotoProvider>

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
								<div className="py-4 relative border-white border-2 border-opacity-70 rounded-lg">
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
									<div className="relative w-full h-32 bg-transparent rounded-lg border-white border-2 border-opacity-70 overflow-hidden shadow-lg flex">
										{/* Asthetic Background */}
										<div className="absolute inset-0">
											<Asthetic />
										</div>

										{/* Profile Content */}
										<div className="z-10 flex w-full h-full items-center p-4 space-x-6">
											{/* Profile Avatar with PhotoView */}
											<PhotoProvider>
												<PhotoView
													src={userInfo.profilePicUrl}
												>
													<div className="flex justify-center cursor-pointer">
														<div className="w-24 h-24 rounded-full ring ring-white ring-offset-base-100 ring-offset-1 overflow-hidden">
															<img
																src={
																	userInfo.profilePicUrl
																}
																alt="Profile Picture"
																className="object-cover h-full w-full"
															/>
														</div>
													</div>
												</PhotoView>
											</PhotoProvider>

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
									<div className="py-4 relative font-helvetica border-white border-2 border-opacity-70 rounded-lg">
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
					<div className="alert bg-neutral-950 text-neutral-100 shadow-lg flex items-center space-x-4 rounded-lg p-4">
						{/* Toast Content */}
						<div className="flex flex-col">
							<span className="text-lg font-medium">
								Welcome to BonFire!
							</span>
							<p className="text-sm text-neutral-400">
								Your chat experience just got better.
							</p>
						</div>

						{/* Action Buttons */}
						<div className="flex space-x-2">
							<button
								onClick={closeToast}
								className="btn btn-sm bg-neutral-800 hover:bg-neutral-900 text-neutral-300"
								title="Close"
							>
								Close
							</button>
							<button
								className="btn btn-sm bg-neutral-800 hover:bg-neutral-900 text-blue-400 font-semibold"
								title="Learn More"
							>
								Learn More
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Toast Notification */}
			{showCustomToast && (
				<div className="toast toast-bottom toast-end z-40 font-helvetica">
					<div className="alert bg-neutral-950 text-neutral-100 shadow-lg flex items-center space-x-4 rounded-lg p-4">
						{/* Toast Content */}
						<div className="flex flex-col">
							<span className="text-lg font-medium">
								{toastContent.title}
							</span>
							<p className="text-sm text-neutral-400">
								{toastContent.message}
							</p>
						</div>

						{/* Action Buttons */}
						<div className="flex space-x-2">
							<button
								onClick={closeCustomToast}
								className="btn btn-sm bg-neutral-800 hover:bg-neutral-900 text-neutral-300"
								title="Close"
							>
								Close
							</button>
							<button
								className="btn btn-sm bg-neutral-800 hover:bg-neutral-900 text-blue-400 font-semibold"
								title="Learn More"
							>
								{toastContent.button}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Main wrapper to hold both the sidebar and content */}
			<div className="flex">
				{/* Sidebar */}
				<div className="fixed left-0 h-screen w-64 bg-neutral-950 text-white flex flex-col z-10 font-helvetica shadow-lg">
					{/* Tab Switcher */}
					<div className="relative flex items-center justify-around py-3 bg-neutral-900">
						{/* Animated underline */}
						<span
							className={`absolute bottom-0 h-1 w-8 rounded-full bg-blue-500 transition-all duration-300 transform ${
								activeMenuTab === "Groups"
									? "left-1/4 -translate-x-4"
									: "left-3/4 -translate-x-4"
							}`}
						></span>

						{["Groups", "Friends"].map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveMenuTab(tab)}
								className={`px-4 py-2 rounded-lg text-lg font-semibold transition-colors ${
									activeMenuTab === tab
										? "text-white"
										: "text-neutral-400 hover:text-white"
								}`}
							>
								{tab}
								{/* Show badge for friend requests */}
								{tab === "Friends" &&
									friendRequests.length > 0 && (
										<span className="badge badge-md badge-secondary absolute top-3 rounded right-3 indicator-item ml-2">
											{friendRequests.length}{" "}
											{/* Display number of requests */}
										</span>
									)}
							</button>
						))}
					</div>

					{/* Compact Search Bar with Modern Styling */}
					<div className="flex items-center px-2 py-1 bg-neutral-800 rounded-lg w-64 space-x-1">
						{/* Search Input */}
						<input
							type="text"
							placeholder="Search..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="flex-grow bg-neutral-800 text-white text-sm rounded-lg outline-none placeholder-neutral-500 px-2 py-1"
						/>

						{/* Search SVG Button - Compact and Modern */}
						<button
							title="Search"
							className="text-blue-400 hover:text-blue-500"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="20px"
								viewBox="0 -960 960 960"
								width="20px"
								fill="#e8eaed"
							>
								<path d="M379.6-311.85q-110.68 0-188.32-77.64-77.63-77.65-77.63-188.32 0-110.67 77.65-188.27 77.65-77.59 188.31-77.59 110.67 0 188.27 77.63 77.6 77.63 77.6 188.31 0 41.86-10.76 78.94-10.76 37.07-31.81 68.36l207.05 207.28q15.95 16.19 15.95 36.5t-16.19 36.52q-16.15 15.96-36.99 15.96-20.84 0-37.03-15.96L530-355.17q-29.87 20.04-69.32 31.68-39.46 11.64-81.08 11.64Zm-.13-105.17q67.99 0 114.41-46.33 46.42-46.32 46.42-114.31 0-67.99-46.42-114.42-46.42-46.42-114.41-46.42t-114.32 46.42q-46.32 46.43-46.32 114.42 0 67.99 46.32 114.31 46.33 46.33 114.32 46.33Z" />
							</svg>
						</button>
						{activeMenuTab === "Friends" && (
							<div className="dropdown dropdown-end relative">
								<div className="indicator">
									<button
										title="Friend Requests"
										className="text-neutral-400 hover:text-neutral-300"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											height="20px"
											viewBox="0 -960 960 960"
											width="20px"
											fill="#e8eaed"
										>
											<path d="M443.61-662.96L380-727.09q-15.96-15.95-15.96-36.65 0-20.69 15.96-36.85l63.61-64.13q15.96-15.95 37.01-15.95 21.05 0 37.01 15.95L581-800.59q16.2 16.16 16.2 36.85 0 20.7-16.2 36.65l-63.37 64.13Q501.67-647 480.62-647q-21.05 0-37.01-15.96ZM80.17-136.91q-21.34 0-36.96-15.63-15.62-15.62-15.62-36.96v-132q0-36.34 26.11-62.46 26.11-26.13 62.47-26.13h134.44q14.48 0 24.84 5.26 10.35 5.26 19.12 15.79 31.23 47.47 79.59 73.21 48.36 25.74 105.85 25.74 56.23 0 105.21-25.74t81.45-73.21q6.53-10.53 17.43-15.79 10.9-5.26 25.29-5.26h134.68q36.33 0 62.46 26.13 26.12 26.12 26.12 62.46v132q0 21.34-15.62 36.96-15.63 15.63-36.96 15.63h-216q-21.34 0-36.97-15.63-15.62-15.62-15.62-36.96v-26.96q-30.24 14.76-64.36 20.76-34.12 6-67.09 6-32.95 0-66.11-5.38t-65.16-20.14v25.72q0 21.34-15.62 36.96-15.63 15.63-36.97 15.63h-216Zm87.83-365q-55.16 0-94.32-39.18t-39.16-94.37q0-54.93 39.18-94.17t94.37-39.24q54.93 0 94.17 39.29 39.24 39.28 39.24 94.19 0 55.16-39.29 94.32T168-501.91Zm624 0q-55.16 0-94.32-39.18t-39.16-94.37q0-54.93 39.18-94.17t94.37-39.24q54.93 0 94.17 39.29 39.24 39.28 39.24 94.19 0 55.16-39.29 94.32T792-501.91Z" />
										</svg>
									</button>
									{friendRequests.length > 0 && (
										<span className="badge badge-sm indicator-item">
											{friendRequests.length}{" "}
											{/* Display number of requests */}
										</span>
									)}
								</div>
								<div
									tabIndex={0}
									className="dropdown-content bg-base-200 mt-2 p-3 shadow-lg rounded-lg z-10 w-96 left-2"
								>
									<ul className="menu bg-base-300 p-2 rounded-lg space-y-1 w-full">
										{friendRequests.length > 0 ? (
											friendRequests.map(
												({
													username,
													profilePicUrl,
												}) => (
													<li
														key={username}
														className="flex items-center justify-between p-2 hover:bg-base-100 rounded-lg"
													>
														<div className="flex items-center space-x-3 w-80">
															<div className="avatar shrink-0">
																<div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden">
																	<img
																		src={
																			profilePicUrl ||
																			"https://ui-avatars.com/api/?name=default&size=48"
																		}
																		alt={`${username}'s profile`}
																	/>
																</div>
															</div>
															<div className="flex flex-col">
																<span className="text-neutral-200 font-medium text-sm">
																	{username}
																</span>
																<span className="text-neutral-400 text-xs">
																	sent a
																	friend
																	request
																</span>
															</div>
															<button
																className="bg-blue-600 h-7 hover:bg-blue-700 text-white text-xs rounded-full px-4 py-1 transition-transform duration-150 ease-in-out shadow-sm hover:scale-105"
																onClick={() =>
																	handleAccept(
																		username,
																	)
																}
															>
																Accept
															</button>
															<button
																className="bg-red-600 h-7 hover:bg-red-700 text-white text-xs rounded-full px-4 py-1 transition-transform duration-150 ease-in-out shadow-sm hover:scale-105"
																onClick={() =>
																	handleCancel(
																		username,
																	)
																}
															>
																X
															</button>
														</div>
													</li>
												),
											)
										) : (
											<p className="text-neutral-500 text-center">
												No friend requests
											</p>
										)}
									</ul>
								</div>
							</div>
						)}
					</div>

					{/* Content Area */}
					<div className="overflow-y-auto mt-4 px-2 space-y-3 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-500 scrollbar-track-neutral-950 scrollbar-track-rounded-md">
						{activeMenuTab === "Groups" ? (
							<div className="space-y-3 ">
								{(searchQuery ? filteredServers : serverList)
									.length > 0 ? (
									(searchQuery
										? filteredServers
										: serverList
									).map((server) => (
										<div
											key={server.id}
											className="flex items-center space-x-2 bg-neutral-900 p-3 rounded-lg cursor-pointer transition-transform hover:scale-105"
											onClick={() => {
												setActiveGroupChat({
													groupName: server.groupName,
													groupId: server.id,
													groupPicUrl:
														server.groupPicUrl ||
														"",
													members: server.members
														.length
														? server.members
														: [],
													currentUsername:
														userInfo?.username,
													currentUserPic:
														userInfo?.profilePicUrl,
												});
												setActiveChat(null);
											}}
										>
											<img
												src={
													server.groupPicUrl ||
													"https://ui-avatars.com/api/?name=default&background=random&size=512"
												}
												alt={server.groupName}
												className="w-10 h-10 rounded-full object-cover"
											/>
											<div className="flex flex-col">
												<span className="text-neutral-200 text-sm font-medium truncate">
													{server.groupName}
												</span>
												{/* Last Message */}
												<span className="text-blue-600 text-sm truncate">
													{server.lastMessage}
												</span>
											</div>
										</div>
									))
								) : (
									<div className="text-center text-neutral-500">
										No servers found.
									</div>
								)}
							</div>
						) : (
							<div className="space-y-3">
								{(searchQuery ? filteredFriends : friendsList)
									.length > 0 ? (
									(searchQuery
										? filteredFriends
										: friendsList
									).map((friend) => (
										<div
											key={friend.username}
											className="flex items-center space-x-2 bg-neutral-900 p-3 rounded-lg cursor-pointer transition-transform hover:scale-105"
											onContextMenu={(e) =>
												openContextMenu(
													friend.username,
													e,
												)
											}
											onClick={() => {
												setActiveChat({
													username: friend.username,
												});
												closeContextMenu();
												setActiveGroupChat(null);
												setCurrentView(null);
											}}
										>
											<img
												src={
													friend.profilePicUrl ||
													"https://ui-avatars.com/api/?name=default&background=random&size=512"
												}
												alt={`${friend.username}'s profile`}
												className="w-10 h-10 rounded-full object-cover"
											/>
											<div className="flex flex-col">
												<span className="text-neutral-200 text-sm font-medium truncate">
													{friend.username}
												</span>
												{/* Last Message */}
												<span className="text-blue-600 text-sm truncate">
													{friend.lastMessage}
												</span>
											</div>
										</div>
									))
								) : (
									<div className="text-center text-neutral-500">
										No friends found.
									</div>
								)}
							</div>
						)}
					</div>

					{/* Profile Section */}
					<div className="relative flex items-center p-3 bg-neutral-900 mt-auto mb-12 rounded-lg space-x-3">
						<button
							title="Add"
							className=" absolute btn mt-1 ml-1 btn-ghost btn-circle p-1 top-0 right-8"
							onClick={toggleModal}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="20px"
								viewBox="0 -960 960 960"
								width="20px"
								fill="#e8eaed"
							>
								<path d="M427.41-428.17H204.65v-105.18h222.76v-223h105.18v223h222.76v105.18H532.59v222.76H427.41v-222.76Z" />
							</svg>
						</button>
						{/* Options Drop-up */}
						<div className="absolute top-0 right-0 mt-1 ml-1 dropdown dropdown-top">
							<button
								title="Options"
								tabIndex={0}
								className="btn btn-ghost btn-circle p-1"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-5 h-5 text-neutral-400 hover:text-neutral-200"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M12 7a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z" />
								</svg>
							</button>

							<ul
								tabIndex={0}
								className="dropdown-content menu menu-sm bg-base-300 rounded-box z-10 mb-3 w-52 p-2 shadow-lg font-helvetica"
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
									<a
										className="hover:bg-blue-600"
										onClick={() =>
											showCustomToastFunct(
												"This Feature Is not implemented yet!",
												"Might be available in newer versions",
												"More Info",
											)
										}
									>
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

						{/* Profile Picture */}
						<img
							src={
								userInfo?.profilePicUrl ||
								"https://ui-avatars.com/api/?name=default&background=random&size=512"
							}
							alt="User profile"
							className="w-10 h-10 rounded-full object-cover"
						/>

						{/* Username and Gender */}
						<div className="flex flex-col">
							<span className="text-neutral-200 font-medium truncate">
								{userInfo?.username + "  (You)" || "Username"}
							</span>
							<span className="text-neutral-500 text-sm">
								{userInfo?.gender || "Gender"}
							</span>
						</div>
					</div>

					{/* Context Menu outside the list */}
					{activeFriend && contextMenuPosition && (
						<div
							className="absolute bg-neutral-950 border font-helvetica border-gray-600 text-white rounded-lg shadow-sm shadow-blue-500/50 p-2 w-52"
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
											openFriendModal(activeFriend);
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

				{/* Main Content Wrapper */}
				<div className="flex-1 ml-16 rounded-lg overflow-hidden bg-white shadow-lg">
					<div className="h-full">
						{currentView === "home" ? (
							<div className="fixed left-64 w-[calc(100vw-16rem)] bg-neutral-950">
								<GreetingWithBlob
									currentDate={currentDate}
									currentTime={currentTime}
									currentUsername={welcomeusername}
								/>
							</div>
						) : null}
						{activeChat && (
							<div className="fixed left-64 w-[calc(100vw-16rem)] h-[96.5%] bg-neutral-950 z-auto">
								<Chat
									friendUsername={activeChat.username}
									friendPic={
										activeChat.friendPic || undefined
									}
									currentUserPic={userInfo?.profilePicUrl}
									onClose={() => {
										setActiveChat(null);
										setCurrentView("home");
									}}
									currentUsername={userInfo?.username}
								/>
							</div>
						)}

						{activeGroupChat && (
							<div className="fixed left-64 w-[calc(100vw-16rem)] h-[96.5%] bg-neutral-950 z-auto">
								<GroupChat
									groupName={activeGroupChat.groupName}
									members={activeGroupChat.members.map(
										(member) => ({
											memberName: member.username,
											memberProfilePicUrl:
												member.profilePicUrl || "", // Ensure a fallback value
										}),
									)}
									groupId={activeGroupChat.groupId}
									groupPicUrl={activeGroupChat.groupPicUrl}
									currentUserPic={userInfo?.profilePicUrl}
									onClose={() => {
										setActiveGroupChat(null);
										setCurrentView("home");
									}}
									currentUsername={userInfo?.username}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		</Layout>
	);
};
