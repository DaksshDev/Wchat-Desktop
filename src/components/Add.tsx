import React, { useState, useRef, useEffect } from "react";
import {
	collection,
	query,
	where,
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
			toggleModal();
			setIsGroupModalVisible(false);
			setShowToast(true);
			setToastMessage("Please enter a group name and ID");
			resetModalFields();
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

				// Fetch the image blob from the URL
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
			toggleModal();
			resetModalFields();
			setIsGroupModalVisible(false);
			setShowToast(true);
			setToastMessage("Failed to upload group photo");
			return;
		}

		// Check if the group ID already exists
		const groupRef = ref(rtdb, `groups/${groupID}`);
		const groupSnapshot = await get(groupRef);

		if (groupSnapshot.exists()) {
			toggleModal();
			setIsGroupModalVisible(false);
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
			photoURL: groupPicUrl,
			members: {}, // Initialize an empty object for members
		};

		// Add each selected member with a 'messages' child inside their entry
		selectedMembers.forEach((member) => {
			groupData.members[member] = {
				joinedAt: new Date().toISOString(),
				messages: {}, // Initialize an empty object for messages
			};
		});

		try {
			await set(groupRef, groupData);
			setShowToast(true);
			setToastMessage("Group created successfully!");
			resetModalFields();
			setIsGroupModalVisible(false);
			toggleModal(); // Close the modal after successful creation
		} catch (error) {
			console.error("Error creating group:", error);
			setIsGroupModalVisible(false);
			resetModalFields();
			toggleModal();
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
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-40">
					<div className="modal-box bg-zinc-900 text-white w-full max-w-4xl min-h-fit">
						<h2 className="text-center pb-3 text-4xl font-bold">
							Hello There! 👋
						</h2>
						<p className="text-center pb-3">
							Add Friends Or Create/Join a server
						</p>

						<div className="tabs">
							<a
								className={`tab tab-bordered ${
									activeTab === "users"
										? "tab-active bg-blue-600 rounded-md"
										: ""
								}`}
								onClick={() => setActiveTab("users")}
							>
								<b>Friends</b>
							</a>
							<a
								className={`tab tab-bordered ${
									activeTab === "groups"
										? "tab-active bg-blue-600 rounded-md"
										: ""
								}`}
								onClick={() => setActiveTab("groups")}
							>
								<b>Groups</b>
							</a>
						</div>

						<div className="mt-4 overflow-visible h-full min-w-fit">
							{activeTab === "users" && (
								<div>
									<h3 className="font-semibold">
										Add by Username:
									</h3>
									<input
										type="text"
										placeholder="Enter username"
										className="input input-bordered w-full input-info bg-gray-700 text-white"
										onChange={(e) =>
											handleSearchChange(e.target.value)
										}
										value={inputValue}
									/>

									{isSearching && <p>Searching...</p>}

									<div className="mt-2 max-h-40 overflow-auto rounded-md bg-zinc-800">
										{users.length > 0 ? (
											users.slice(0, 3).map((user) => (
												<div
													key={user.id}
													onClick={() =>
														handleUserSelect(
															user.username,
														)
													}
													className="flex items-center p-2 hover:bg-gray-700 rounded-lg cursor-pointer"
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
											<p></p>
										) : null}
									</div>

									<button
										onClick={handleSendFriendRequest}
										className="btn bg-blue-600 hover:bg-blue-700 w-full pt-2 mt-4"
									>
										Add
									</button>
								</div>
							)}
						</div>

						{activeTab === "groups" && (
							<div>
								<h3 className="font-semibold">
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
										className="input input-bordered w-full input-info bg-gray-700 text-white"
									/>
									<button className="btn bg-blue-600 hover:bg-blue-700 w-full mt-4">
										Join Group
									</button>
								</div>
							</div>
						)}

						<div className="modal-action">
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
				<div className="toast toast-bottom toast-end z-40">
					<div className="alert alert-info bg-blue-700">
						<span className="text-lg">{toastMessage}</span>
						<div className="toast-action">
							<a
								className="underline cursor-pointer"
								onClick={closeToast}
							>
								Close
							</a>
						</div>
					</div>
				</div>
			)}

			{isGroupModalVisible && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-40">
					<div className="modal-box bg-zinc-900 text-white w-full max-w-4xl min-h-fit space-y-3 p-6 rounded-lg shadow-lg">
						<h2 className="text-center pb-3 text-4xl font-bold">
							Create Group
						</h2>

						<div className="flex justify-center mb-4">
							<label
								htmlFor="groupPhotoUpload"
								className="cursor-pointer"
							>
								<img
									src={avatarURL}
									alt="Click to Upload!"
									className="w-24 h-24 rounded-full border-2 border-gray-300 hover:opacity-80 transition-opacity"
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

						<input
							type="text"
							placeholder="Group Name"
							className="input input-bordered w-full input-info bg-gray-700 text-white"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
						/>
						<input
							type="text"
							placeholder="Group ID"
							className="input input-bordered w-full input-info bg-gray-700 text-white"
							value={groupID}
							onChange={(e) => setGroupID(e.target.value)}
						/>
						<textarea
							placeholder="Group Description"
							className="input input-bordered w-full input-info bg-gray-700 text-white"
							value={groupDescription}
							onChange={(e) =>
								setGroupDescription(e.target.value)
							}
						/>

						<div className="mt-4">
							<h3 className="text-lg font-semibold">
								Set Members
							</h3>
							<div className="h-48 overflow-y-auto bg-gray-800 rounded-md p-2">
								{/* Assuming you have a members array from your friend list */}
								{friendsList.map((friend) => (
									<div
										key={friend.username}
										className="flex items-center space-x-2 mb-2"
									>
										<img
											src={friend.profilePicUrl}
											alt={friend.username}
											className="w-10 h-10 rounded-full"
										/>
										<label className="cursor-pointer flex items-center">
											<input
												type="checkbox"
												className="mr-2"
												onChange={() =>
													handleMemberSelect(
														friend.username,
													)
												} // Handle member selection
											/>
											<span>{friend.username}</span>
										</label>
									</div>
								))}
							</div>
						</div>

						<button
							onClick={handleCreateGroup}
							className="btn bg-green-600 hover:bg-green-700 w-full mt-4"
						>
							Create Group
						</button>
						<div className="modal-action">
							<button
								onClick={() => {
									setIsGroupModalVisible(false);
									toggleModal();
								}}
								className="btn bg-red-500 hover:bg-red-600"
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
