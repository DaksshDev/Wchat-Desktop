import React, { useState, useRef } from "react";
import {
	collection,
	query,
	where,
	getDocs,
	updateDoc,
	doc,
} from "firebase/firestore";
import { db } from "../pages/FirebaseConfig";
import { arrayUnion } from "firebase/firestore";

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
	const [inputValue, setInputValue] = useState(""); // Input field value
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState(""); // Toast message content

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

	const checkIfAlreadyFriend = async (recipientUsername: string) => {
		try {
			// Query current user's friend list
			const currentUserDoc = await getDocs(
				query(collection(db, "users"), where("username", "==", currentUsername))
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
									<button className="btn bg-green-600 hover:bg-green-700 w-full">
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
		</div>
	);
};
