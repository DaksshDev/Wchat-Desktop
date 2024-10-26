import React, { useState, useRef, useEffect } from "react";
import {
	collection,
	query,
	where,
	setDoc,
	getDocs,
	getDoc,
	updateDoc,
	doc,
} from "firebase/firestore";
import { db, rtdb, storage } from "../pages/FirebaseConfig";
import { set, ref, get } from "firebase/database";
import { arrayUnion } from "firebase/firestore";
import { getDownloadURL, uploadBytes, ref as sref } from "firebase/storage";

interface GroupData {
	name: string;
	id: string;
	description: string;
	photoURL: string;
	[key: string]: any; // Allow additional dynamic properties
}

interface AddProps {
	userId: string;
	isModalVisible: boolean;
	toggleModal: () => void;
	sentRequests: string[]; // Keep track of already sent friend requests
	currentUsername: string; // Pass the current user's username
}

interface User {
	id: string;
	username: string;
	profilePicUrl: string;
}

export const Add: React.FC<AddProps> = ({
	userId,
	isModalVisible,
	toggleModal,
	sentRequests,
	currentUsername,
}) => {
	const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
	const [searchTerm, setSearchTerm] = useState("");
	const [users, setUsers] = useState<User[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
	const [inputValue, setInputValue] = useState(""); // Input field value
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState(""); // Toast message content
	const [groupName, setGroupName] = useState("");
	const [groupID, setGroupID] = useState("");
	const [groupDescription, setGroupDescription] = useState("");
	const [groupPhoto, setGroupPhoto] = useState<File | null>(null); // Allow both null and File
	const [friendsList, setFriendsList] = useState<
		{ username: string; profilePicUrl: string }[]
	>([]);
	const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
	const [avatarURL, setAvatarURL] = useState<string>(""); // Default to an empty string

	const handleGroupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]; // Optional chaining for null checks
		if (file) {
			setGroupPhoto(file); // Save the selected file to state
			setAvatarURL(URL.createObjectURL(file)); // Generate a preview URL from the file
		}
	};

	const searchTimeoutRef = useRef<number | null>(null);

	const searchUsers = async (term: string) => {
		if (term.trim() === "") {
			setUsers([]);
			return;
		}

		const cachedUsers = JSON.parse(
			localStorage.getItem("usernames") || "[]",
		);
		const filteredUsers = cachedUsers.filter(
			(user: User) =>
				user.username.startsWith(term) &&
				user.username !== currentUsername && // Exclude current user
				!sentRequests.includes(user.username), // Exclude users who already received a friend request
		);

		if (filteredUsers.length > 0) {
			setUsers(filteredUsers);
		} else {
			setIsSearching(true);
			try {
				const q = query(
					collection(db, "users"),
					where("username", ">=", term),
					where("username", "<=", term + "\uf8ff"),
				);
				const querySnapshot = await getDocs(q);
				const fetchedUsers = querySnapshot.docs
					.map((doc) => ({ id: doc.id, ...doc.data() } as User))
					.filter(
						(user) =>
							user.username !== currentUsername && // Exclude current user
							!sentRequests.includes(user.username), // Exclude users who already received a friend request
					);
				setUsers(fetchedUsers);
			} catch (error) {
				console.error("Error searching users: ", error);
			} finally {
				setIsSearching(false);
			}
		}
	};

	const handleCreateGroup = async () => {
		if (!groupName || !groupID) {
			setShowToast(true);
			setToastMessage("Please enter a group name and ID");
			resetModalFields();
			return;
		}

		if (selectedMembers.length < 1) {
			setShowToast(true);
			setToastMessage("Please select at least 2 members for the group");
			return;
		}

		let groupPicUrl = avatarURL; // Fallback to general avatar URL

		try {
			if (groupPhoto) {
				// Upload the provided group photo to Firebase Storage
				const storagePath = `groupPhotos/${groupID}/${groupPhoto.name}`;
				const imageRef = sref(storage, storagePath);
				const uploadResult = await uploadBytes(imageRef, groupPhoto);
				groupPicUrl = await getDownloadURL(uploadResult.ref);
			} else {
				// Fetch default avatar based on the group name
				const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${groupName}&background=random&size=512`;
				const response = await fetch(defaultAvatarUrl);
				const blob = await response.blob();

				// Upload the default avatar to Firebase Storage
				const storagePath = `groupPhotos/${groupID}/default_avatar.png`;
				const imageRef = sref(storage, storagePath);
				const uploadResult = await uploadBytes(imageRef, blob);
				groupPicUrl = await getDownloadURL(uploadResult.ref);
			}
		} catch (error) {
			console.error("Error uploading group photo:", error);
			resetModalFields();
			setShowToast(true);
			setToastMessage("Failed to upload group photo");
			return;
		}

		// Check if the group ID already exists
		const groupRef = ref(rtdb, `groups/${groupID}`);
		const groupSnapshot = await get(groupRef);

		if (groupSnapshot.exists()) {
			resetModalFields();
			setShowToast(true);
			setToastMessage("Group ID already exists!");
			return;
		}

		// Create the group data object
		const groupData: GroupData = {
			name: groupName,
			id: groupID,
			description: groupDescription,
			photoURL: groupPicUrl, // Set the group photo URL here
			members: {},
		};

		const currentUser = currentUsername; // Function to get the current user
		groupData.members[currentUser] = {
			joinedAt: new Date().toISOString(),
			role: "ADMIN", // Current user is the admin
			messages: {},
		};

		// Add other selected members with null roles
		selectedMembers.forEach((member) => {
			groupData.members[member] = {
				joinedAt: new Date().toISOString(),
				role: null, // Role can be assigned later
				messages: {}, // Initialize an empty object for messages
			};
		});

		try {
			// Add the group to the Realtime Database
			await set(groupRef, groupData);

			// Add group to each member's Firestore 'serverlist' subcollection
			const allMembers = [...selectedMembers, currentUser]; // Include current user

			const serverData = {
				groupName: groupName,
				groupID: groupID,
				groupPicUrl: groupPicUrl, // Include the group photo URL in the serverlist data
			};

			const promises = allMembers.map(async (member) => {
				const userDocRef = doc(
					db,
					`users/${member}/serverlist/${groupID}`,
				);
				await setDoc(userDocRef, serverData);
			});

			await Promise.all(promises); // Wait for all member updates

			setShowToast(true);
			setToastMessage("Group created successfully!");
			resetModalFields();
			setIsGroupModalVisible(false);
			toggleModal(); // Close the modal after successful creation
		} catch (error) {
			console.error("Error creating group:", error);
			resetModalFields();
			setShowToast(true);
			setToastMessage("Failed to create group");
		}
	};

	// Helper function to reset the modal input fields
	const resetModalFields = () => {
		setGroupName("");
		setGroupID("");
		setGroupDescription("");
		setGroupPhoto(null);
		setSelectedMembers([]);
	};

	const checkIfAlreadyFriend = async (recipientUsername: string) => {
		try {
			// Query current user's friend list
			const currentUserDoc = await getDocs(
				query(
					collection(db, "users"),
					where("username", "==", currentUsername),
				),
			);
			if (currentUserDoc.empty) return false; // Return false if user not found

			const currentUserData = currentUserDoc.docs[0].data();
			const friendList = currentUserData.friendList || []; // Get friend list

			// Check if recipient is already a friend
			return friendList.includes(recipientUsername);
		} catch (error) {
			console.error("Error checking friend list: ", error);
			return false;
		}
	};

	// Fetch friends from Firestore (call this on modal open or in useEffect)
	// Fetch friend list inside useEffect
	useEffect(() => {
		const fetchFriendsList = async () => {
			try {
				// Fetch the user document for the current user
				const userDoc = await getDoc(doc(db, "users", currentUsername));
				if (userDoc.exists()) {
					const data = userDoc.data();
					const friends = data.friendList || [];

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
										friendData.profilePicUrl || "",
								};
							}
							return { username, profilePicUrl: "" };
						}),
					);

					// Update state with fetched friends data
					setFriendsList(friendsWithProfilePics);
				}
			} catch (error) {
				console.error("Error fetching friends list:", error);
			}
		};

		if (currentUsername) {
			fetchFriendsList(); // Fetch the friend list when the username is available
		}
	}, [currentUsername]);

	// Function to handle member selection
	const handleMemberSelect = (username: string) => {
		setSelectedMembers(
			(prevSelected) =>
				prevSelected.includes(username)
					? prevSelected.filter((user) => user !== username) // Deselect if already selected
					: [...prevSelected, username], // Add to selected if not already selected
		);
	};

	const sendFriendRequest = async (recipientUsername: string) => {
		try {
			const alreadyFriend = await checkIfAlreadyFriend(recipientUsername);

			if (alreadyFriend) {
				setToastMessage(`${recipientUsername} is already your friend.`);
				toggleModal(); // Close modal after fail
				setShowToast(true);
				return; // Do not send the request
			}

			const userDocRef = doc(db, "users", recipientUsername);
			await updateDoc(userDocRef, {
				friendRequests: arrayUnion(currentUsername), // Add the current user's username to the recipient's friendRequests array
			});

			setToastMessage(`Friend request sent to ${recipientUsername}`);
			setShowToast(true);

			toggleModal(); // Close modal after sending
		} catch (error) {
			setToastMessage(`Error sending friend request: ${error}`);
			setShowToast(true);
		}
	};

	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
		setInputValue(value);

		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		searchTimeoutRef.current = window.setTimeout(() => {
			searchUsers(value);
		}, 300);
	};

	const handleUserSelect = (username: string) => {
		setInputValue(username);
		setSearchTerm(username); // Optional: Update searchTerm to reflect the selection
		setUsers([]); // Clear the users after selection
	};

	const handleSendFriendRequest = () => {
		if (inputValue === currentUsername) {
			setToastMessage("You cannot send a friend request to yourself.");
			toggleModal(); // Close modal after sending
			setShowToast(true);
			return;
		}
		if (inputValue) {
			sendFriendRequest(inputValue); // Send request based on input username
		}
	};

	const closeToast = () => {
		setShowToast(false);
		setToastMessage("");
	};

	return (
		<div className="flex flex-col items-center justify-center rounded-lg text-white font-helvetica">
			{isModalVisible && (
				<div className="fixed inset-0 flex items-center justify-center bg-neutral-950 bg-opacity-90 z-40">
					<div className="modal-box bg-neutral-900 text-neutral-50 w-full max-w-4xl p-6 rounded-lg">
						<h2 className="text-center pb-4 text-4xl font-bold">
							Hello There! 👋
						</h2>
						<p className="text-center pb-6 text-neutral-300">
							Add Friends or Create/Join a Group
						</p>

						<div className="tabs flex justify-center space-x-8 pb-2 border-b border-neutral-700 relative">
							<a
								className={`tab font-semibold pb-1 transition-colors ${
									activeTab === "users"
										? "text-blue-500"
										: "text-neutral-400"
								}`}
								onClick={() => setActiveTab("users")}
							>
								<b>Friends</b>
							</a>
							<a
								className={`tab font-semibold pb-1 transition-colors ${
									activeTab === "groups"
										? "text-blue-500"
										: "text-neutral-400"
								}`}
								onClick={() => setActiveTab("groups")}
							>
								<b>Groups</b>
							</a>
							{/* Animated underline */}
							<span
								className={`absolute bottom-0 h-0.5 w-14 rounded-full bg-blue-500 transition-all duration-300 transform ${
									activeTab === "users"
										? "left-[38.888%] -translate-x-6"
										: "left-[52%] -translate-x-6"
								}`}
							></span>
						</div>

						<div className="mt-6 overflow-visible h-full min-w-fit">
							{activeTab === "users" && (
								<div>
									<h3 className="font-semibold mb-3 text-neutral-300">
										Add by Username:
									</h3>
									<input
										type="text"
										placeholder="Enter username"
										className="input input-bordered w-full bg-neutral-800 text-neutral-50 placeholder-neutral-500"
										onChange={(e) =>
											handleSearchChange(e.target.value)
										}
										value={inputValue}
									/>
									{isSearching && (
										<p className="text-neutral-400 mt-2">
											Searching...
										</p>
									)}

									<div className="mt-4 max-h-40 overflow-auto rounded-md bg-neutral-800">
										{users.length > 0 ? (
											users.slice(0, 3).map((user) => (
												<div
													key={user.id}
													onClick={() =>
														handleUserSelect(
															user.username,
														)
													}
													className="flex items-center p-2 hover:bg-neutral-700 rounded-lg cursor-pointer"
												>
													<img
														src={user.profilePicUrl}
														alt={user.username}
														className="w-8 h-8 rounded-full mr-2"
													/>
													<span>{user.username}</span>
												</div>
											))
										) : searchTerm && !isSearching ? (
											<p className="text-neutral-400">
												No results found
											</p>
										) : null}
									</div>

									<button
										onClick={handleSendFriendRequest}
										className="btn bg-blue-600 hover:bg-blue-700 w-full mt-4"
									>
										Add
									</button>
								</div>
							)}
							{activeTab === "groups" && (
								<div>
									<h3 className="font-semibold mb-4 text-neutral-300">
										Create or Join a Group:
									</h3>

									<div className="my-4">
										<button
											className="btn bg-green-600 hover:bg-green-700 w-full"
											onClick={() =>
												setIsGroupModalVisible(true)
											}
										>
											Create My Own
										</button>
									</div>

									<div className="mt-4">
										<input
											type="text"
											placeholder="I have a Group ID"
											className="input input-bordered w-full bg-neutral-800 text-neutral-50 placeholder-neutral-500"
										/>
										<button className="btn bg-blue-600 hover:bg-blue-700 w-full mt-4">
											Join Group
										</button>
									</div>
								</div>
							)}
						</div>

						<div className="modal-action mt-6">
							<button
								onClick={toggleModal}
								className="btn bg-red-500 hover:bg-red-600"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Toast Notification */}
			{showToast && (
				<div className="toast toast-bottom toast-end z-50">
					<div className="alert bg-neutral-950 text-neutral-200 shadow-lg rounded-lg px-6 py-4 flex items-center justify-between space-x-4">
						<span className="text-base font-medium">
							{toastMessage}
						</span>
						<button
							onClick={closeToast}
							className="btn bg-blue-600 hover:bg-blue-700 text-neutral-100 px-4 py-1 rounded-xl font-semibold transition-all"
						>
							OK
						</button>
					</div>
				</div>
			)}

			{isGroupModalVisible && (
				<div className="fixed inset-0 flex items-center justify-center bg-neutral-900 bg-opacity-90 z-40">
					<div className="modal-box bg-neutral-950 fixed min-h-screen overflow-hidden text-neutral-100 w-full max-w-2xl p-8 rounded-lg shadow-2xl space-y-6">
						<h2 className="text-center text-3xl font-extrabold mb-6">
							Create Group
						</h2>

						{/* Group Photo Upload */}
						<div className="flex justify-center mb-6">
							<label
								htmlFor="groupPhotoUpload"
								className="cursor-pointer"
							>
								<img
									src={avatarURL}
									alt="Click to Upload!"
									className="w-24 h-24 rounded-full border-2 border-neutral-600 hover:opacity-90 transition-opacity shadow-md"
								/>
							</label>
							<input
								id="groupPhotoUpload"
								type="file"
								accept="image/*"
								onChange={(e) => handleGroupPhotoChange(e)}
								className="hidden"
							/>
						</div>

						{/* Group Name, ID, and Description */}
						<input
							type="text"
							placeholder="Group Name"
							required={true}
							className="input input-bordered w-full bg-neutral-800 text-neutral-100 border-neutral-700 focus:border-blue-500 placeholder-neutral-500"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
						/>
						<input
							type="text"
							placeholder="Group ID"
							required={true}
							className="input input-bordered w-full bg-neutral-800 text-neutral-100 border-neutral-700 focus:border-blue-500 placeholder-neutral-500"
							value={groupID}
							onChange={(e) => setGroupID(e.target.value)}
						/>
						<textarea
							placeholder="Group Description"
							required={true}
							className="textarea textarea-bordered w-full bg-neutral-800 text-neutral-100 border-neutral-700 focus:border-blue-500 placeholder-neutral-500 resize-none"
							value={groupDescription}
							onChange={(e) =>
								setGroupDescription(e.target.value)
							}
						/>

						{/* Members Selection */}
						<div>
							<h3 className="text-lg font-semibold mb-3">
								Set Members
							</h3>
							<div className="h-40 overflow-y-auto bg-neutral-900 rounded-lg p-3 space-y-2">
								{friendsList.map((friend) => (
									<div
										key={friend.username}
										className="flex items-center space-x-3 p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg cursor-pointer transition"
									>
										<img
											src={friend.profilePicUrl}
											alt={friend.username}
											className="w-10 h-10 rounded-full"
										/>
										<label className="flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="checkbox mr-3"
												onChange={() =>
													handleMemberSelect(
														friend.username,
													)
												}
											/>
											<span>{friend.username}</span>
										</label>
									</div>
								))}
							</div>
						</div>

						{/* Action Buttons */}
						<button
							onClick={handleCreateGroup}
							className="btn bg-blue-600 hover:bg-blue-700 w-full py-3 mt-4 font-semibold text-neutral-100 rounded-lg"
						>
							Create Group
						</button>
						<div className="modal-action mt-3">
							<button
								onClick={() => {
									setIsGroupModalVisible(false);
									toggleModal();
								}}
								className="btn bg-red-600 hover:bg-red-700 py-2 px-6 rounded-lg text-neutral-100 font-semibold"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
