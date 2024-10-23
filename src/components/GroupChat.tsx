import { useEffect, useRef, useState } from "react";
import React from "react";
import { rtdb, storage, Tenor } from "../pages/FirebaseConfig";
import { FaMicrophone, FaStop, FaUsers } from "react-icons/fa";
import ReactAudioPlayer from "react-audio-player";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import ChatBg from "./ChatBg";
import {
	ref as storageRef,
	uploadBytes,
	getDownloadURL,
} from "firebase/storage";
import {
	FaArrowRight,
	FaPaperPlane,
	FaSmile,
	FaArrowDown,
} from "react-icons/fa";
import { ref, push, set, onValue, off, remove, get } from "firebase/database"; // Import remove for deleting messages
import { DataSnapshot } from "firebase/database";
import { format, isToday } from "date-fns";
import EmojiPicker, {
	EmojiClickData,
	Theme,
	EmojiStyle,
	SkinTonePickerLocation,
} from "emoji-picker-react";
import GifPicker from "gif-picker-react";
import { MdGif } from "react-icons/md";
import Linkify from "linkify-react";
import ReactPlayer from "react-player";

interface GroupChatProps {
	groupName?: string;
	groupId?: string;
	groupPicUrl?: string;
	members: {
		memberName: string;
		memberProfilePicUrl: string;
	}[];
	onClose: () => void;
	currentUsername: string;
	currentUserPic: string;
}

const GroupChat: React.FC<GroupChatProps> = ({
	groupName,
	groupId,
	groupPicUrl,
	members,
	onClose,
	currentUsername,
	currentUserPic,
}) => {
	const [message, setMessage] = useState("");
	const [selectedMember, setSelectedMember] = useState("");
	const [messages, setMessages] = useState<any[]>([]);
	const [expandedMessages, setExpandedMessages] = useState<number[]>([]);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [showGifPicker, setShowGifPicker] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [adminUsername, setAdminUsername] = useState<string[]>([]);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [showRoleMenu, setShowRoleMenu] = useState(false);
	const [modUsernames, setModUsernames] = useState<string[]>([]);

	const handleBan = () => {
		console.log(`Banning`);
		// Implement ban logic here
	};

	const handleKick = () => {
		console.log(`Kicking`);
		// Implement kick logic here
	};

	const isVideoUrl = (url: string) => {
		return ReactPlayer.canPlay(url); // Use ReactPlayer's built-in method to check if the URL is playable
	};

	const [showContextMenu, setShowContextMenu] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [showMemberContextMenu, setShowMemberContextMenu] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [selectedMessage, setSelectedMessage] = useState<any>(null);
	const chatRef = useRef<HTMLDivElement>(null);
	const MAX_MESSAGE_LENGTH = 30000;
	const [showScrollToBottom, setShowScrollToBottom] = useState(false);
	const [replyingTo, setReplyingTo] = useState<any>(null); // Track reply state
	const [isCopied, setIsCopied] = useState(false);
	const [isGifCopied, setIsGifCopied] = useState(false);
	const [isAudioCopied, setIsAudioCopied] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [mediaRecorderInstance, setMediaRecorderInstance] =
		useState<MediaRecorder | null>(null);

	const linkifyOptions = {
		className: "text-blue-400 underline cursor-pointer",
		defaultProtocol: "https", // Ensures links without protocol still work
	};
	const [isTyping, setIsTyping] = useState(false); // Whether the current user is typing
	const [typingDots, setTypingDots] = useState("."); // Animated typing dots
	const [typingMembers, setTypingMembers] = useState<string[]>([]);

	// Function to get the admin usernames from the RTDB
	const getAdmins = async (groupId: string): Promise<string[]> => {
		try {
			const membersRef = ref(rtdb, `groups/${groupId}/members`);
			const snapshot = await get(membersRef);

			if (snapshot.exists()) {
				const members = snapshot.val();
				const adminUsernames: string[] = []; // Array to hold admin usernames

				// Find all admin members
				for (const username in members) {
					if (members[username].role === "ADMIN") {
						adminUsernames.push(username); // Add admin username to the array
					}
				}

				return adminUsernames; // Return array of admin usernames
			}

			return []; // Return an empty array if no admins found
		} catch (error) {
			console.error("Error fetching admins:", error);
			return []; // Return an empty array in case of error
		}
	};

	const getMods = async (groupId: string): Promise<string[]> => {
		try {
			const membersRef = ref(rtdb, `groups/${groupId}/members`);
			const snapshot = await get(membersRef);

			if (snapshot.exists()) {
				const members = snapshot.val();
				const mods = [];

				// Collect usernames of members with the MOD role
				for (const username in members) {
					if (members[username].role === "MOD") {
						mods.push(username);
					}
				}
				return mods; // Return array of moderator usernames
			}

			return []; // No mods found
		} catch (error) {
			console.error("Error fetching mods:", error);
			return [];
		}
	};

	useEffect(() => {
		const fetchMods = async () => {
			if (groupId) {
				const mods = await getMods(groupId);
				setModUsernames(mods); // Store the mod usernames in state
			}
		};

		fetchMods();

		const intervalId = setInterval(fetchMods, 2000); // Fetch every 2 seconds

		return () => clearInterval(intervalId); // Cleanup on unmount or when groupId changes
	}, [groupId]); // Runs whenever the groupId changes

	useEffect(() => {
		const fetchAdmins = async () => {
			if (groupId) {
				const admins = await getAdmins(groupId); // Assuming getAdmins fetches multiple admins
				setAdminUsername(admins); // Store the list of admin usernames in state
			}
		};

		fetchAdmins();

		const intervalId = setInterval(fetchAdmins, 2000); // Fetch every 2 seconds

		return () => clearInterval(intervalId); // Cleanup on unmount or when groupId changes
	}, [groupId]); // Runs whenever the groupId changes

	// Ref to store the timeout ID
	const typingTimeout = useRef<NodeJS.Timeout | null>(null);

	const updateTypingStatus = async (isTyping: boolean) => {
		if (groupId) {
			const typingRef = ref(
				rtdb,
				`groups/${groupId}/members/${currentUsername}/typing`,
			);
			await set(typingRef, isTyping);
		}
	};

	// Function to change the role of a selected member
	const changeRole = (memberName: string, newRole: string) => {
		const memberRoleRef = ref(
			rtdb,
			`groups/${groupId}/members/${memberName}/role`,
		);

		set(memberRoleRef, newRole)
			.then(() => {
				console.log(`Role of ${memberName} changed to ${newRole}`);
			})
			.catch((error) => {
				console.error("Error changing role: ", error);
			});
	};

	// Handle input change and typing status
	const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMessage(inputValue); // Update message state

		if (!isTyping) {
			setIsTyping(true);
			updateTypingStatus(true); // User started typing
		}

		// Reset typing timeout on each keystroke
		if (typingTimeout.current) {
			clearTimeout(typingTimeout.current);
		}

		// Set a new timeout to stop typing after 2 seconds of inactivity
		typingTimeout.current = setTimeout(() => {
			setIsTyping(false);
			updateTypingStatus(false); // User stopped typing
		}, 2000); // 2 seconds
	};

	useEffect(() => {
		if (groupId && members.length > 0) {
			// Create listeners for each member's typing status
			const unsubscribeList = members.map((member) => {
				const typingRef = ref(
					rtdb,
					`groups/${groupId}/members/${member.memberName}/typing`,
				);

				// Listener for each member's typing status
				return onValue(typingRef, (snapshot) => {
					const typingStatus = snapshot.val();
					setTypingMembers((prevTypingMembers) => {
						if (typingStatus) {
							// Add member to the typing members list if they're typing
							if (
								!prevTypingMembers.includes(member.memberName)
							) {
								return [
									...prevTypingMembers,
									member.memberName,
								];
							}
						} else {
							// Remove member if they're no longer typing
							return prevTypingMembers.filter(
								(m) => m !== member.memberName,
							);
						}
						return prevTypingMembers;
					});
				});
			});

			// Cleanup listeners on component unmount
			return () =>
				unsubscribeList.forEach((unsubscribe) => unsubscribe());
		}
	}, [groupId, members]);

	// Animate the typing dots based on group typing status
	useEffect(() => {
		// Check if any member is typing
		if (typingMembers.length > 0) {
			const interval = setInterval(() => {
				setTypingDots((prev) => (prev.length < 3 ? prev + "." : "."));
			}, 500); // Change every 500ms

			return () => clearInterval(interval); // Cleanup the interval
		} else {
			setTypingDots(""); // Reset typing dots if no one is typing
		}
	}, [typingMembers]);

	useEffect(() => {
		const handleScroll = () => {
			if (chatRef.current) {
				// Show the button if scrolled away from bottom by a certain threshold
				const threshold = 200;
				if (
					chatRef.current.scrollTop <
					chatRef.current.scrollHeight -
						chatRef.current.clientHeight -
						threshold
				) {
					setShowScrollToBottom(true);
				} else {
					setShowScrollToBottom(false);
				}
			}
		};

		if (chatRef.current) {
			chatRef.current.addEventListener("scroll", handleScroll);
		}

		return () => {
			if (chatRef.current) {
				chatRef.current.removeEventListener("scroll", handleScroll);
			}
		};
	}, []);

	const handleScrollToBottom = () => {
		if (chatRef.current) {
			chatRef.current.scrollTo({
				top: chatRef.current.scrollHeight,
				behavior: "smooth", // This enables the smooth scroll animation
			});
		}
	};

	useEffect(() => {
		if (groupId) {
			const chatPath = `groups/${groupId}/members/${currentUsername}/messages/`;
			const messagesRef = ref(rtdb, chatPath);

			const listener = onValue(messagesRef, (snapshot: DataSnapshot) => {
				const data = snapshot.val();
				const messagesList = data
					? Object.entries(data).map(([id, msg]: [string, any]) => ({
							id,
							...(msg as {
								sender: string;
								content: string;
								timestamp: number;
								gifUrl?: string;
								audioUrl?: string;
							}),
					  }))
					: [];

				setMessages(messagesList);
			});

			return () => {
				off(messagesRef, "value", listener);
			};
		}
	}, [currentUsername, groupId]);

	useEffect(() => {
		if (chatRef.current) {
			setTimeout(() => {
				chatRef.current?.scrollTo({
					top: chatRef.current?.scrollHeight,
					behavior: "smooth", // Smooth scroll behavior
				});
			}, 100); // 100ms delay to ensure content is fully loaded
		}
	}, [messages]);

	// Format message timestamp
	const formatTimestamp = (timestamp: number) => {
		const date = new Date(timestamp);
		const formattedTime = format(date, "h:mm a");
		const formattedDay = isToday(date) ? "Today" : format(date, "EEEE");
		return `${formattedDay} at ${formattedTime}`;
	};

	// Render message date
	const renderMessageDate = (timestamp: number) => {
		const date = new Date(timestamp);
		return isToday(date) ? "Today" : format(date, "MMMM d, yyyy");
	};

	const handleRecordVoiceMessage = async () => {
		if (!isRecording) {
			const mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			const mediaRecorder = new MediaRecorder(mediaStream);
			let audioChunks: Blob[] = [];

			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunks, { type: "audio/mpeg" });

				// Get a reference to Firebase Storage
				const audioRef = storageRef(
					storage,
					`voiceMessages/${Date.now()}.mp3`,
				);

				// Start uploading
				setIsUploading(true); // Set uploading state to true

				// Upload the audio file to Firebase Storage
				await uploadBytes(audioRef, audioBlob);
				const downloadURL = await getDownloadURL(audioRef);

				// Send the voice message with the download URL
				handleSendMessage(null, downloadURL, members);

				// Reset the recording state and uploading state
				setIsRecording(false);
				setIsUploading(false); // Reset uploading state
			};

			mediaRecorder.start();
			setMediaRecorderInstance(mediaRecorder);

			setTimeout(() => {
				if (mediaRecorder.state === "recording") {
					mediaRecorder.stop();
				}
			}, 600000); // 10 minutes

			setIsRecording(true);
		} else {
			if (
				mediaRecorderInstance &&
				mediaRecorderInstance.state === "recording"
			) {
				mediaRecorderInstance.stop();
			}
		}
	};

	const handleSendMessage = async (
		gifUrl: string | null = null,
		audioUrl: string | null = null,
		members: { memberName: string }[], // Pass members as a list
	) => {
		if (
			(message.trim() || gifUrl || audioUrl) &&
			message.length <= MAX_MESSAGE_LENGTH
		) {
			const newMessage = {
				sender: currentUsername,
				content: message,
				gifUrl,
				timestamp: Date.now(),
				isReply: !!replyingTo,
				audioUrl,
				replyTo: replyingTo ? replyingTo.id : null,
				replyToContent: replyingTo ? replyingTo.content : null,
				replyUser: replyingTo ? replyingTo.sender : null,
				replyToTimestamp: replyingTo ? replyingTo.timestamp : null,
				replyTogifUrl: replyingTo?.gifUrl || null,
				replyToaudioUrl: replyingTo?.audioUrl || null,
			};

			// Loop through all group members and push the message to each member's chat
			await Promise.all(
				members.map(async (member) => {
					// Reference for each member in the group
					const memberChatRef = ref(
						rtdb,
						`groups/${groupId}/members/${member.memberName}/messages/`,
					);
					const memberMessageRef = push(memberChatRef);
					await set(memberMessageRef, {
						...newMessage,
						id: memberMessageRef.key,
					});
				}),
			);

			// Reset message input and hide GIF picker
			setIsTyping(false);
			updateTypingStatus(false);
			setReplyingTo(null); // Clear reply state
			setShowEmojiPicker(false);
			setMessage("");
			setShowGifPicker(false);
		}
	};

	const scrollToMessage = (messageTimestamp: any) => {
		// Find the message element with the matching timestamp
		const messageElement = document.querySelector(
			`[data-createdat='${messageTimestamp}']`,
		);

		if (messageElement) {
			// Scroll the element into view
			messageElement.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});

			// Add the highlight class
			messageElement.classList.add(
				"bg-blue-300",
				"bg-opacity-50",
				"transition",
				"duration-500",
			);

			// Remove the highlight class after a delay
			setTimeout(() => {
				messageElement.classList.remove(
					"bg-blue-300",
					"bg-opacity-50",
					"transition",
					"duration-500",
				);
			}, 700); // Highlight lasts for 700ms
		} else {
			console.warn("Invalid timestamp: " + messageTimestamp);
		}
	};

	// Handle emoji selection
	const handleEmojiClick = (emojiData: EmojiClickData) => {
		setMessage((prevMessage) => prevMessage + emojiData.emoji);
	};

	// Handle GIF selection
	const handleGifSelect = (gif: any) => {
		handleSendMessage(gif.url, null, members);
	};

	// Handle right-click to show context menu
	const handleRightClickMessage = (e: React.MouseEvent, msg: any) => {
		e.preventDefault();
		setShowContextMenu({ x: e.pageX, y: e.pageY });
		setSelectedMessage(msg);
	};

	// Handle right-click to show context menu
	const handleRightClickMember = (e: React.MouseEvent, member: any) => {
		e.preventDefault();
		setShowMemberContextMenu({ x: e.pageX, y: e.pageY });
		setSelectedMember(member);
	};

	const handleDeleteMessage = async (deleteForEveryone: boolean) => {
		if (!selectedMessage || !groupId || !members) return; // Ensure a message is selected, and group info is available

		const { id, timestamp } = selectedMessage; // Message ID for current user, timestamp for matching

		try {
			if (deleteForEveryone) {
				// Delete message for all members using the timestamp
				const deletePromises = members.map(async (member) => {
					const memberMessagesRef = ref(
						rtdb,
						`groups/${groupId}/members/${member.memberName}/messages`,
					);

					// Find the message with the matching timestamp for this member
					const snapshot = await get(memberMessagesRef);
					const messages = snapshot.val();
					if (messages) {
						const messageIdToDelete = Object.keys(messages).find(
							(key) => messages[key].timestamp === timestamp,
						);

						if (messageIdToDelete) {
							const memberMessageRef = ref(
								rtdb,
								`groups/${groupId}/members/${member.memberName}/messages/${messageIdToDelete}`,
							);
							return remove(memberMessageRef); // Delete the message for this member
						}
					}
				});

				// Wait for all deletions to complete
				await Promise.all(deletePromises);
			} else {
				// Only delete the message for the current user
				const userMessagesRef = ref(
					rtdb,
					`groups/${groupId}/members/${currentUsername}/messages`,
				);

				// Find and delete the message for the current user
				const snapshot = await get(userMessagesRef);
				const userMessages = snapshot.val();
				if (userMessages) {
					const messageIdToDelete = Object.keys(userMessages).find(
						(key) => userMessages[key].timestamp === timestamp,
					);

					if (messageIdToDelete) {
						const userMessageRef = ref(
							rtdb,
							`groups/${groupId}/members/${currentUsername}/messages/${messageIdToDelete}`,
						);
						await remove(userMessageRef);
					}
				}
			}

			console.log("Message deleted successfully");
		} catch (error) {
			console.error("Error deleting message: ", error);
		} finally {
			// Close the delete modal after completion
			setShowDeleteModal(false);
		}
	};

	return (
		<div className="w-full h-full bg-black rounded-lg flex flex-col overflow-hidden select-none relative z-40">
			<ChatBg />
			{/* Overlay to blur background when drawer is open */}
			{isDrawerOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md z-40"
					onClick={() => {
						setIsDrawerOpen(false);
						setShowMemberContextMenu(null);
					}}
					// Clicking outside will close the drawer
				></div>
			)}

			{/* Right-side Drawer */}
			<div
				className={`fixed top-7 right-0 w-80 h-full bg-neutral-950 text-white z-50 select-text transition-transform transform ${
					isDrawerOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<div className="p-4">
					<h2 className="text-2xl font-bold text-blue-600 mb-4">
						Group Members
					</h2>

					{/* Admin Section */}
					<div
						tabIndex={0}
						className="collapse collapse-open bg-neutral-900 text-white rounded-lg mb-4"
					>
						<input
							type="checkbox"
							className="peer"
							id="admin-collapse"
						/>
						<label
							htmlFor="admin-collapse"
							className="collapse-title text-xl font-semibold"
						>
							Admins
						</label>
						<div className="collapse-content">
							{adminUsername && adminUsername.length > 0 && (
								<div className="flex flex-col space-y-2 p-2">
									{adminUsername.map((adminUsername) => {
										const member = members.find(
											(m) =>
												m.memberName === adminUsername,
										);
										return (
											<div
												key={adminUsername}
												className="flex items-center space-x-4 p-2 rounded-lg hover:bg-neutral-800 cursor-pointer"
												onContextMenu={(e) => {
													handleRightClickMember(
														e,
														adminUsername,
													);
												}}
											>
												<img
													src={
														member?.memberProfilePicUrl ||
														"https://ui.avatar.com/default"
													}
													alt={`${adminUsername}'s Profile`}
													className="w-10 h-10 rounded-full"
												/>
												<span className="text-lg font-medium">
													{adminUsername} 👑{" "}
													{adminUsername ===
														currentUsername &&
														"--(YOU)"}
												</span>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>

					{/* Mods Section */}
					{modUsernames && (
						<div
							tabIndex={0}
							className="collapse collapse-open bg-neutral-900 text-white rounded-lg mb-4"
						>
							<input
								type="checkbox"
								className="peer"
								id="mods-collapse"
							/>
							<label
								htmlFor="mods-collapse"
								className="collapse-title text-xl font-semibold"
							>
								Moderators
							</label>
							<div className="collapse-content">
								{modUsernames.length > 0 && (
									<div className="flex flex-col space-y-2 p-2">
										{modUsernames.map((modUsername) => {
											const member = members.find(
												(m) =>
													m.memberName ===
													modUsername,
											);
											return (
												<div
													key={modUsername}
													className="flex items-center space-x-4 p-2 rounded-lg hover:bg-neutral-800 cursor-pointer"
													onContextMenu={(e) => {
														handleRightClickMember(
															e,
															modUsername,
														);
													}}
												>
													<img
														src={
															member?.memberProfilePicUrl ||
															"https://ui.avatar.com/default"
														}
														alt={`${modUsername}'s Profile`}
														className="w-10 h-10 rounded-full"
													/>
													<span className="text-lg font-medium">
														{modUsername} 🛠️{" "}
														{modUsername ===
															currentUsername &&
															"--(YOU)"}
													</span>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Members Section */}
					<div
						tabIndex={0}
						className="collapse collapse-open bg-neutral-900 text-white rounded-lg"
					>
						<input
							type="checkbox"
							className="peer"
							id="members-collapse"
						/>
						<label
							htmlFor="members-collapse"
							className="collapse-title text-xl font-semibold"
						>
							Members
						</label>
						<div className="collapse-content">
							{members
								.filter(
									(member) =>
										!adminUsername.includes(
											member.memberName,
										) && // Exclude all admins
										!modUsernames.includes(
											member.memberName,
										), // Exclude all mods
								)
								.map((member, index) => (
									<div
										key={index}
										className="flex items-center space-x-4 p-2 my-2 rounded-lg hover:bg-neutral-800 cursor-pointer"
										onContextMenu={(e) => {
											handleRightClickMember(
												e,
												member.memberName,
											);
										}}
									>
										<img
											src={
												member.memberProfilePicUrl ||
												"https://ui.avatar.com/default"
											}
											alt={member.memberName}
											className="w-10 h-10 rounded-full"
										/>
										<span className="text-lg">
											{member.memberName}{" "}
											{member.memberName ===
												currentUsername && "--(YOU)"}
										</span>
									</div>
								))}
						</div>
					</div>

					{/* Close Button */}
					<button
						className="btn bg-white text-neutral-900 mt-6 rounded-lg w-full hover:bg-neutral-800 hover:text-white"
						onClick={() => {
							setIsDrawerOpen(false);
							setShowMemberContextMenu(null);
						}}
					>
						Close
					</button>
				</div>
			</div>

			{/* Show context menu based on user role */}
			{showMemberContextMenu && (
				<div
					className="absolute z-50 bg-gray-800 text-white p-2 rounded-lg shadow-lg"
					style={{
						top: `${showMemberContextMenu.y - 170}px`,
						left: `${showMemberContextMenu.x - 70}px`,
					}}
					onMouseLeave={() => setShowMemberContextMenu(null)}
				>
					<ul>
						{/* Admin Options */}
						{adminUsername.includes(currentUsername) && (
							<>
								<li
									className="flex items-center p-2 rounded-lg"
									onMouseEnter={() => setShowRoleMenu(false)} // Close role menu on Name hover
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480.04-494.39q-72.19 0-121.51-49.44-49.31-49.43-49.31-121.46 0-72.04 49.27-121.23 49.28-49.2 121.47-49.2t121.51 49.17q49.31 49.17 49.31 121.38 0 71.91-49.27 121.34-49.28 49.44-121.47 49.44ZM158.17-233.07v-25.65q0-31.38 15.67-57.39t42.92-42.91q59-35 126.26-53.5 67.27-18.5 136.63-18.5 69.83 0 137.33 18.5 67.5 18.5 126.26 53.26 27.25 15.87 42.92 42.31 15.67 26.45 15.67 58.23v25.65q0 44.91-30.32 75.04-30.31 30.14-74.9 30.14H263.06q-44.58 0-74.73-30.14-30.16-30.13-30.16-75.04Zm105.18 0h433.3v-24.45q0-4.95-1.35-7.37-1.36-2.42-3.84-2.87-45.33-27.28-100.51-42.69-55.19-15.4-111.07-15.4-55.4 0-110.95 15.02-55.54 15.03-100.39 43.07-2.53 1.1-3.86 3.51-1.33 2.41-1.33 6.73v24.45Zm216.85-366.5q27.6 0 46.51-19.1 18.9-19.11 18.9-46.71t-19.11-46.5q-19.1-18.9-46.7-18.9t-46.51 19.16q-18.9 19.15-18.9 46.66 0 27.6 19.11 46.5 19.1 18.89 46.7 18.89Zm-.2-65.6Zm0 432.1Z" />
									</svg>
									⠀<strong>{selectedMember}</strong>
								</li>
								<li
									className="flex items-center p-2 hover:bg-red-600 cursor-pointer rounded-lg"
									onClick={handleBan}
									onMouseEnter={() => setShowRoleMenu(false)} // Close role menu on ban hover
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480-60.65q-86.36 0-162.8-32.76-76.43-32.76-133.73-90.18-57.3-57.42-90.06-133.97-32.76-76.56-32.76-162.92 0-87.12 32.76-163.05 32.76-75.94 90.06-133.24 57.3-57.3 133.85-89.94 76.56-32.64 162.68-32.64 87.12 0 163.18 32.64 76.05 32.64 133.35 89.94t90.06 133.24q32.76 75.93 32.76 163.05 0 86.36-32.76 162.92-32.76 76.55-90.06 133.97-57.3 57.42-133.23 90.18Q567.36-60.65 480-60.65Zm0-105.18q50.57 0 96.75-15.54t84.99-43.59L224.48-661.98q-27.57 39.05-43.11 85.11-15.54 46.07-15.54 96.39 0 130.57 91.92 222.61 91.92 92.04 222.25 92.04Zm255.76-133.15q27.33-39.04 42.87-85.11 15.54-46.06 15.54-96.39 0-130.09-91.92-221.89-91.92-91.8-222.25-91.8-50.33 0-96.27 15.3-45.95 15.3-84.99 42.63l437.02 437.26Z" />
									</svg>
									⠀Ban
								</li>
								<li
									className="flex items-center p-2 hover:bg-orange-600 cursor-pointer rounded-lg"
									onClick={handleKick}
									onMouseEnter={() => setShowRoleMenu(false)} // Close role menu on kick hover
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480.76-405.98 324.87-249.33q-16.96 16.96-37.39 16.08-20.44-.88-37.15-17.84-16.2-16.95-15.82-37.01.38-20.05 16.58-37.01L405.22-480 249.33-637.65q-16.2-16.96-15.7-37.01.5-20.06 16.7-37.01 16.71-16.96 37.65-17.34 20.93-.38 37.89 16.58l154.89 156.65 154.37-156.65q16.96-16.96 37.89-16.58 20.94.38 37.65 17.34 16.2 16.95 15.82 37.01-.38 20.05-16.58 37.01L554.78-480l155.13 155.89q16.2 16.2 16.58 36.13.38 19.94-15.82 36.89-16.71 16.96-37.65 17.34-20.93.38-37.89-16.58L480.76-405.98Z" />
									</svg>
									⠀Kick
								</li>
								<li
									className="flex items-center p-2 hover:bg-blue-600 cursor-pointer relative rounded-lg"
									onMouseEnter={() => setShowRoleMenu(true)}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="m480-208.98-129.02 51.37q-51.35 21.2-98.08-10.2-46.73-31.39-46.73-87.49v-494.4q0-43.62 30.94-74.4 30.94-30.77 74.24-30.77h337.3q43.3 0 74.24 30.77 30.94 30.78 30.94 74.4v494.4q0 56.1-46.73 87.49-46.73 31.4-98.08 10.2L480-208.98Zm0-113.31 168.65 66.99v-494.4h-337.3v494.4L480-322.29Zm0-427.41H311.35h337.3H480Z" />
									</svg>
									Set Role
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M500.74-480.76 346.61-635.13q-16.2-15.96-16.2-36.89 0-20.94 16.2-37.13 15.96-15.96 36.89-15.96t37.23 16.3l191.18 191.18q7.48 7.88 11.46 17.01 3.98 9.14 3.98 20.06 0 10.68-3.98 19.81-3.98 9.14-11.46 16.62L420.73-252.95q-16.3 16.3-36.73 15.8-20.43-.5-36.39-16.46-16.2-16.19-16.2-37.13 0-20.93 16.2-36.89l153.13-153.13Z" />
									</svg>
									{showRoleMenu && (
										<ul
											className="absolute left-full top-0 ml-2 bg-gray-900 text-white p-2 rounded-lg shadow-lg w-36"
											onMouseEnter={() =>
												setShowRoleMenu(true)
											} // Keep submenu open
											onMouseLeave={() =>
												setShowRoleMenu(false)
											} // Close on mouse leave
										>
											<li
												className="flex items-center p-2 hover:bg-blue-600 cursor-pointer rounded-lg w-full"
												onClick={() =>
													changeRole(
														selectedMember,
														"ADMIN",
													)
												}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													height="20px"
													viewBox="0 -960 960 960"
													width="20px"
													fill="#e8eaed"
												>
													<path d="M480.08-385.43q-69.36 0-117.88-48.33-48.53-48.32-48.53-117.68 0-69.36 48.45-117.89 48.44-48.52 117.8-48.52t117.88 48.44q48.53 48.44 48.53 117.81 0 69.36-48.45 117.76-48.44 48.41-117.8 48.41ZM480-483.2q27.28 0 47.8-20.52 20.53-20.52 20.53-47.8 0-27.28-20.53-47.93-20.52-20.64-47.8-20.64-27.28 0-47.8 20.64-20.53 20.65-20.53 47.93t20.53 47.8q20.52 20.52 47.8 20.52Zm0 5.44Zm0-310.94-240.65 92.27V-515q0 50.1 13.12 97.33 13.12 47.24 36.88 87.76 45.28-21.29 93.82-31.05 48.55-9.76 96.83-9.76 48.04 0 96.71 9.76 48.66 9.76 93.94 31.05 24-40.52 37-87.76 13-47.23 13-97.33v-181.43L480-788.7Zm.2 515.74q-33.96 0-66.27 5.14-32.3 5.15-63.34 18.43 27.18 28.02 59.53 49.17 32.35 21.15 69.64 33.39 37.28-12.24 69.81-33.39 32.52-21.15 59.84-49.17-31.04-13.28-63.14-18.43-32.11-5.14-66.07-5.14ZM480-64.13q-7.48 0-16.2-.87-8.71-.87-16.43-3.61-142-44.24-227.6-172.19-85.6-127.96-85.6-274.2v-181.37q0-33.84 18.56-60.39 18.56-26.55 49.23-38.31l240.65-92.56q17.96-7.48 37.39-7.48t37.39 7.48l240.65 92.56q30.67 11.76 49.23 38.31 18.56 26.55 18.56 60.39V-515q0 146.24-85.6 274.2-85.6 127.95-227.6 172.19-7.72 2.74-16.43 3.61-8.72.87-16.2.87Z" />
												</svg>
												<span className="flex-grow">
													Admin
												</span>
											</li>
											<li
												className="flex items-center p-2 hover:bg-yellow-600 cursor-pointer rounded-lg"
												onClick={() =>
													changeRole(
														selectedMember,
														"MOD",
													)
												}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													height="20px"
													viewBox="0 -960 960 960"
													width="20px"
													fill="#e8eaed"
												>
													<path d="m480-402 91.85 68.33q7.24 5.24 15.33.06 8.1-5.18 5.1-14.02L556.24-460l92.61-72.57q8.48-5.68 5.5-14.55-2.97-8.88-13.77-8.88H529.06l-36.34-110.37q-2.58-8.48-12.39-8.48t-13.05 8.48L430.78-556H319.59q-10.46 0-13.07 9.1-2.61 9.1 5.87 14.33L403.76-460l-35.8 111.37q-3 8.84 4.97 14.4 7.98 5.56 15.22.32L480-402Zm0 337.87q-7.45 0-16.18-.87-8.72-.87-16.45-3.61-142-44.24-227.6-172.19-85.6-127.96-85.6-274.2v-181.37q0-33.44 18.56-60.19t49.23-38.51l240.65-92.56q17.96-7.48 37.39-7.48t37.39 7.48l240.65 92.56q30.67 11.76 49.23 38.51 18.56 26.75 18.56 60.19V-515q0 146.24-85.6 274.2-85.6 127.95-227.6 172.19-7.73 2.74-16.45 3.61-8.73.87-16.18.87Zm0-102.7q104.09-35.44 172.37-131.98 68.28-96.53 68.28-215.86v-181.67L480-788.7l-240.65 92.38v181.26q0 119.72 68.28 216.25Q375.91-202.27 480-166.83Zm0-310.93Z" />
												</svg>
												<span className="flex-grow">
													Mod
												</span>
											</li>
											<li
												className="flex items-center p-2 hover:bg-neutral-800 cursor-pointer rounded-lg"
												onClick={() =>
													changeRole(
														selectedMember,
														"Member",
													)
												}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													height="20px"
													viewBox="0 -960 960 960"
													width="20px"
													fill="#e8eaed"
												>
													<path d="M480.04-494.39q-72.19 0-121.51-49.44-49.31-49.43-49.31-121.46 0-72.04 49.27-121.23 49.28-49.2 121.47-49.2t121.51 49.17q49.31 49.17 49.31 121.38 0 71.91-49.27 121.34-49.28 49.44-121.47 49.44ZM158.17-233.07v-25.65q0-31.38 15.67-57.39t42.92-42.91q59-35 126.26-53.5 67.27-18.5 136.63-18.5 69.83 0 137.33 18.5 67.5 18.5 126.26 53.26 27.25 15.87 42.92 42.31 15.67 26.45 15.67 58.23v25.65q0 44.91-30.32 75.04-30.31 30.14-74.9 30.14H263.06q-44.58 0-74.73-30.14-30.16-30.13-30.16-75.04Zm105.18 0h433.3v-24.45q0-4.95-1.35-7.37-1.36-2.42-3.84-2.87-45.33-27.28-100.51-42.69-55.19-15.4-111.07-15.4-55.4 0-110.95 15.02-55.54 15.03-100.39 43.07-2.53 1.1-3.86 3.51-1.33 2.41-1.33 6.73v24.45Zm216.85-366.5q27.6 0 46.51-19.1 18.9-19.11 18.9-46.71t-19.11-46.5q-19.1-18.9-46.7-18.9t-46.51 19.16q-18.9 19.15-18.9 46.66 0 27.6 19.11 46.5 19.1 18.89 46.7 18.89Zm-.2-65.6Zm0 432.1Z" />
												</svg>
												<span className="flex-grow">
													Member
												</span>
											</li>
										</ul>
									)}
								</li>
							</>
						)}

						{/* Mod Options */}
						{modUsernames.includes(currentUsername) && (
							<>
								<li className="flex items-center p-2 rounded-lg">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480.04-494.39q-72.19 0-121.51-49.44-49.31-49.43-49.31-121.46 0-72.04 49.27-121.23 49.28-49.2 121.47-49.2t121.51 49.17q49.31 49.17 49.31 121.38 0 71.91-49.27 121.34-49.28 49.44-121.47 49.44ZM158.17-233.07v-25.65q0-31.38 15.67-57.39t42.92-42.91q59-35 126.26-53.5 67.27-18.5 136.63-18.5 69.83 0 137.33 18.5 67.5 18.5 126.26 53.26 27.25 15.87 42.92 42.31 15.67 26.45 15.67 58.23v25.65q0 44.91-30.32 75.04-30.31 30.14-74.9 30.14H263.06q-44.58 0-74.73-30.14-30.16-30.13-30.16-75.04Zm105.18 0h433.3v-24.45q0-4.95-1.35-7.37-1.36-2.42-3.84-2.87-45.33-27.28-100.51-42.69-55.19-15.4-111.07-15.4-55.4 0-110.95 15.02-55.54 15.03-100.39 43.07-2.53 1.1-3.86 3.51-1.33 2.41-1.33 6.73v24.45Zm216.85-366.5q27.6 0 46.51-19.1 18.9-19.11 18.9-46.71t-19.11-46.5q-19.1-18.9-46.7-18.9t-46.51 19.16q-18.9 19.15-18.9 46.66 0 27.6 19.11 46.5 19.1 18.89 46.7 18.89Zm-.2-65.6Zm0 432.1Z" />
									</svg>
									<strong>{selectedMember}</strong>
								</li>
								<li
									className="flex items-center p-2 hover:bg-red-600 cursor-pointer rounded-lg"
									onClick={handleBan}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480-60.65q-86.36 0-162.8-32.76-76.43-32.76-133.73-90.18-57.3-57.42-90.06-133.97-32.76-76.56-32.76-162.92 0-87.12 32.76-163.05 32.76-75.94 90.06-133.24 57.3-57.3 133.85-89.94 76.56-32.64 162.68-32.64 87.12 0 163.18 32.64 76.05 32.64 133.35 89.94t90.06 133.24q32.76 75.93 32.76 163.05 0 86.36-32.76 162.92-32.76 76.55-90.06 133.97-57.3 57.42-133.23 90.18Q567.36-60.65 480-60.65Zm0-105.18q50.57 0 96.75-15.54t84.99-43.59L224.48-661.98q-27.57 39.05-43.11 85.11-15.54 46.07-15.54 96.39 0 130.57 91.92 222.61 91.92 92.04 222.25 92.04Zm255.76-133.15q27.33-39.04 42.87-85.11 15.54-46.06 15.54-96.39 0-130.09-91.92-221.89-91.92-91.8-222.25-91.8-50.33 0-96.27 15.3-45.95 15.3-84.99 42.63l437.02 437.26Z" />
									</svg>
									⠀Ban
								</li>
								<li
									className="flex items-center p-2 hover:bg-orange-600 cursor-pointer rounded-lg"
									onClick={handleKick}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480.76-405.98 324.87-249.33q-16.96 16.96-37.39 16.08-20.44-.88-37.15-17.84-16.2-16.95-15.82-37.01.38-20.05 16.58-37.01L405.22-480 249.33-637.65q-16.2-16.96-15.7-37.01.5-20.06 16.7-37.01 16.71-16.96 37.65-17.34 20.93-.38 37.89 16.58l154.89 156.65 154.37-156.65q16.96-16.96 37.89-16.58 20.94.38 37.65 17.34 16.2 16.95 15.82 37.01-.38 20.05-16.58 37.01L554.78-480l155.13 155.89q16.2 16.2 16.58 36.13.38 19.94-15.82 36.89-16.71 16.96-37.65 17.34-20.93.38-37.89-16.58L480.76-405.98Z" />
									</svg>
									⠀Kick
								</li>
							</>
						)}
					</ul>
				</div>
			)}

			{/* Navbar */}
			<div className="flex items-center justify-between p-4 bg-neutral-900 text-white shadow-md rounded-lg">
				{/* Group Information */}
				<div className="flex items-center space-x-4">
					{groupId && (
						<>
							{/* Group Avatar with Photo Viewer */}
							<PhotoProvider>
								<PhotoView
									src={
										groupPicUrl ||
										"https://ui.avatar.com/default"
									}
								>
									<div className="avatar cursor-pointer">
										<div className="w-10 rounded-full ring ring-blue-600 ring-offset-base-100 ring-offset-2">
											<img
												src={
													groupPicUrl ||
													"https://ui.avatar.com/default"
												}
												alt={groupName}
												className="object-cover"
											/>
										</div>
									</div>
								</PhotoView>
							</PhotoProvider>

							{/* Group Name */}
							<div className="flex flex-col">
								<span className="text-lg font-semibold text-blue-500">
									{groupName}
								</span>

								{/* Members Display */}
								{members.length > 0 && (
									<span className="text-sm text-gray-400">
										Members:{" "}
										{members
											.map((m) => m.memberName)
											.join(", ")}
									</span>
								)}
							</div>
						</>
					)}
				</div>

				{/* Navbar Buttons */}
				<div className="flex items-center space-x-3">
					{/* Open Members Button */}
					<button
						onClick={() => setIsDrawerOpen(true)} // This opens the drawer
						className="btn btn-ghost text-white"
						title="Open Members"
					>
						<FaUsers size={24} />
					</button>

					{/* Close Chat Button */}
					<button
						onClick={onClose}
						className="btn btn-ghost text-white"
						title="Close Chat"
					>
						<FaArrowRight size={24} />
					</button>
				</div>
			</div>

			{/* Chat Messages */}
			<div
				ref={chatRef}
				className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 select-text scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-500 scrollbar-track-neutral-950 scrollbar-track-rounded-md"
			>
				{messages.length > 0 ? (
					messages.map((msg, idx) => {
						const isCurrentUser = msg.sender === currentUsername;
						const bgColor = isCurrentUser
							? "bg-blue-600 text-white"
							: "bg-gray-700 text-white";
						const alignment = isCurrentUser
							? "justify-end"
							: "justify-start";

						// Find the sender's info from the members list
						const senderInfo = members.find(
							(member) => member.memberName === msg.sender,
						);
						const avatar = isCurrentUser
							? currentUsername
							: senderInfo?.memberName;
						const avatarPic = isCurrentUser
							? currentUserPic
							: senderInfo?.memberProfilePicUrl;

						const displayName = adminUsername.includes(msg.sender)
							? `${msg.sender} 👑 - ADMIN`
							: modUsernames.includes(msg.sender)
							? `${msg.sender} 🛠️ - MOD`
							: msg.sender;

						const isExpanded = expandedMessages.includes(idx);
						const contentToShow = isExpanded
							? msg.content
							: msg.content.length > 300
							? msg.content.slice(0, 300) + "..."
							: msg.content;

						return (
							<div
								key={msg.id}
								data-createdat={msg.timestamp}
								onContextMenu={(e) =>
									handleRightClickMessage(e, msg)
								}
							>
								{idx === 0 ||
								renderMessageDate(
									messages[idx - 1].timestamp,
								) !== renderMessageDate(msg.timestamp) ? (
									<p className="text-center text-gray-300 text-sm mb-2 bg-gray-800/30 rounded px-3 py-1 mx-auto w-fit">
										{renderMessageDate(msg.timestamp)}
									</p>
								) : null}

								<div
									className={`flex ${alignment} items-end space-x-2`}
								>
									{!isCurrentUser && (
										<div className="avatar">
											<div className="w-8 rounded-full">
												<img
													src={avatarPic}
													alt={`${avatar}'s profile`}
												/>
											</div>
										</div>
									)}

									<div
										className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-md ${bgColor} relative`}
										style={{ wordBreak: "break-word" }}
									>
										<p className="font-semibold">
											{displayName}
										</p>

										{/* Display Reply Context */}
										{msg.replyUser &&
											msg.replyToTimestamp && (
												<div
													className="bg-gray-700 text-gray-300 p-2 mb-2 rounded-md border-l-4 border-blue-400 cursor-pointer"
													onClick={() =>
														scrollToMessage(
															msg.replyToTimestamp,
														)
													}
												>
													<p className="text-xs font-semibold text-blue-300">
														Replying to{" "}
														{msg.replyUser}
													</p>
													<p className="text-sm italic truncate">
														{msg.replyToContent
															? msg.replyToContent
															: msg.replyTogifUrl
															? "GIF"
															: msg.replyToaudioUrl
															? "Voice message"
															: "No content available"}
													</p>
												</div>
											)}

										{/* Render content with link detection */}
										<Linkify options={linkifyOptions}>
											{contentToShow}
										</Linkify>

										{/* Render Video Player only for valid video URLs */}
										{msg.content &&
											isVideoUrl(msg.content) && (
												<ReactPlayer
													url={msg.content}
													width="100%"
													height="400px"
													className="mt-2"
													controls={true} // Show player controls
												/>
											)}

										{/* Render GIF if available */}
										{msg.gifUrl && (
											<img
												src={msg.gifUrl}
												alt="GIF"
												className="mt-2 rounded-lg"
											/>
										)}

										{msg.audioUrl && (
											<div className="mt-2 flex items-center space-x-3 min-w-full overflow-hidden">
												<ReactAudioPlayer
													src={msg.audioUrl}
													controls
													className="react-audio-player min-w-full rounded-sm" // You can also add a class for additional styling
													onPlay={() =>
														console.log("Playing")
													}
													onPause={() =>
														console.log("Paused")
													}
													onEnded={() =>
														console.log("Ended")
													}
												/>
											</div>
										)}

										{msg.content.length > 300 &&
											!isExpanded && (
												<button
													className="text-xs text-gray-100 underline"
													onClick={() =>
														setExpandedMessages(
															(prev) => [
																...prev,
																idx,
															],
														)
													}
												>
													Read more
												</button>
											)}
										{isExpanded && (
											<button
												className="text-xs text-gray-100 underline"
												onClick={() =>
													setExpandedMessages(
														(prev) =>
															prev.filter(
																(i) =>
																	i !== idx,
															),
													)
												}
											>
												Show less
											</button>
										)}

										<div className="text-xs text-gray-400 mt-2">
											{formatTimestamp(msg.timestamp)}
										</div>
									</div>

									{isCurrentUser && (
										<div className="avatar">
											<div className="w-8 rounded-full">
												<img
													src={avatarPic}
													alt={`${avatar}'s profile`}
												/>
											</div>
										</div>
									)}
								</div>
							</div>
						);
					})
				) : (
					<div className="flex justify-center items-start w-full mt-6">
						<div className="bg-gray-800/70 p-6 rounded-lg text-center w-4/5 flex items-center">
							{/* GIF on the left */}
							<div className="w-1/3 flex justify-center items-center rounded-lg overflow-hidden">
								<img
									src="https://media1.tenor.com/m/J3mNIbj6A4wAAAAd/empty-shelves-john-travolta.gif"
									alt="Confused Travolta"
									className="w-full h-full  object-contain rounded-lg" // Rounded GIF
								/>
							</div>

							{/* Vertical separator */}
							<hr className="w-px h-64 bg-gray-500 mx-6" />

							{/* Text and Button on the right */}
							<div className="w-2/3 text-left">
								<p className="text-white text-lg mb-4 leading-relaxed">
									Looks a bit... empty here. <br />
									How about we{" "}
									<span className="text-blue-400 font-bold">
										get started
									</span>
									?
								</p>
								<button
									className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md transition-all mt-4"
									onClick={() =>
										handleSendMessage(
											"https://media1.tenor.com/m/VHsiL8B8P0wAAAAC/shincore-wave-emoji.gif",
											null,
											members,
										)
									}
								>
									Send Hi
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Display the "Uploading..." indicator */}
			{isUploading && (
				<div className="p-2 text-gray-500 italic rounded-t-lg">
					<strong>Uploading...</strong>
					{/* You can add a loading animation here if needed */}
				</div>
			)}

			{/* Display the "Members are typing..." indicator */}
			{typingMembers.length > 0 && (
				<div className="p-2 text-gray-500 italic rounded-t-lg">
					{typingMembers.length === 1 ? (
						<>
							<strong>{typingMembers[0]}</strong> is typing
							{typingDots}
						</>
					) : (
						<>
							<strong>
								{typingMembers.slice(0, 2).join(", ")}
							</strong>{" "}
							are typing{typingDots}
						</>
					)}
				</div>
			)}

			{/* Reply Indicator */}
			{replyingTo && (
				<div className="p-2 bg-gray-800 text-white rounded-t-lg">
					Replying to <strong>{replyingTo.sender}</strong>
					<button
						onClick={() => setReplyingTo(null)}
						className="ml-2 text-red-500"
					>
						⠀⠀Cancel
					</button>
				</div>
			)}

			{/* Chat Input */}
			<div className="p-3 bg-gray-900 shadow-md flex items-center relative">
				{/* Emoji Picker Toggle */}
				<button
					onClick={() => setShowEmojiPicker((prev) => !prev)}
					className="btn btn-ghost btn-sm text-white mr-2"
					title="Pick Emoji"
				>
					<FaSmile size={24} className="text-white" />
				</button>

				{/* GIF Picker Toggle */}
				<button
					onClick={() => setShowGifPicker((prev) => !prev)}
					className="btn btn-ghost btn-sm text-white mr-2"
					title="Pick GIF"
				>
					<MdGif size={34} className="text-white" />
				</button>

				{/* Message Input */}
				<input
					type="text"
					placeholder="Type your message..."
					value={message}
					maxLength={MAX_MESSAGE_LENGTH}
					onChange={handleTyping} // Call handleTyping on every keystroke
					onKeyDown={(e) =>
						e.key === "Enter" &&
						handleSendMessage(null, null, members)
					}
					className="flex-1 input input-bordered text-white bg-gray-800"
				/>

				<button
					onClick={handleRecordVoiceMessage}
					title={
						isRecording ? "Stop Recording" : "Record Voice Message"
					}
					className={`btn btn-ghost btn-sm text-white ml-2 ${
						isRecording ? "bg-red-600" : ""
					}`}
				>
					{isRecording ? (
						<FaStop size={24} className="text-white" />
					) : (
						<FaMicrophone size={24} className="text-white" />
					)}
				</button>

				{/* Send Button */}
				<button
					onClick={() => handleSendMessage(null, null, members)}
					title="Send"
					className="btn btn-primary btn-sm ml-2"
				>
					<FaPaperPlane size={18} />
				</button>

				{/* Emoji Picker Component */}
				{showEmojiPicker && (
					<div className="absolute bottom-16 left-0 z-50">
						<EmojiPicker
							onEmojiClick={handleEmojiClick}
							reactionsDefaultOpen={true}
							theme={Theme.DARK}
							emojiStyle={EmojiStyle.GOOGLE}
							skinTonePickerLocation={
								SkinTonePickerLocation.SEARCH
							}
						/>
					</div>
				)}

				{/* GIF Picker Component */}
				{showGifPicker && (
					<div className="absolute bottom-16 left-3 z-50">
						<GifPicker
							tenorApiKey={Tenor}
							onGifClick={handleGifSelect}
							theme={Theme.DARK}
						/>
					</div>
				)}
			</div>

			{/* Context Menu */}
			{showContextMenu && (
				<div
					className="absolute z-50 w-52 bg-gray-800 text-white shadow-lg p-2 rounded-lg"
					style={{
						top: `${showContextMenu.y - 50}px`, // Add slight offset for better UX
						left: `${showContextMenu.x - 70}px`,
					}}
					onMouseLeave={() => setShowContextMenu(null)}
				>
					<ul>
						{/* Reply Option */}
						<li
							className="p-2 hover:bg-blue-600 cursor-pointer rounded-lg flex items-center"
							onClick={() => setReplyingTo(selectedMessage)}
						>
							{/* Reply Icon */}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="20px"
								viewBox="0 -960 960 960"
								width="20px"
								fill="#e8eaed"
							>
								<path d="m309.04-458.17 73.31 73.3q15.72 15.72 15.83 37.77.12 22.06-15.59 37.49-15.96 15.72-37.51 14.72-21.56-1-36.51-15.96L145.28-474.13q-15.95-15.59-15.95-36.57 0-20.97 15.95-36.93l164.05-164.04q16.19-15.96 36.91-15.96 20.72 0 36.35 15.96 15.71 14.86 16.21 36.46t-15.45 37.32l-74.31 74.54h331.2q87.11 0 149.11 61.62 62 61.62 62 149.49v125q0 21.97-15.25 37.28-15.24 15.31-37.13 15.31-21.64 0-37.22-15.31-15.58-15.31-15.58-37.28v-125q0-44.56-31.18-75.25-31.19-30.68-74.75-30.68h-331.2Z" />
							</svg>
							⠀Reply
						</li>

						{/* Copy Option */}
						{selectedMessage?.content && (
							<li
								className="p-2 hover:bg-blue-600 cursor-pointer rounded-lg flex items-center"
								onClick={() => {
									navigator.clipboard.writeText(
										selectedMessage?.content || "",
									);
									setIsCopied(true); // Set copied state to true

									// Revert icon back to copy after 2 seconds
									setTimeout(() => {
										setIsCopied(false);
									}, 2000);
								}}
							>
								{/* Conditional Icon Rendering */}
								{isCopied ? (
									// Done Icon
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480-60.65q-86.72 0-162.93-32.62-76.22-32.62-133.7-90.1-57.48-57.48-90.1-133.7Q60.65-393.28 60.65-480q0-87.72 32.62-163.82 32.62-76.09 90.1-133.57 57.48-57.48 133.7-89.72 76.21-32.24 162.93-32.24 44.85 0 89.05 9.17 44.21 9.16 84.78 29.25 20.19 9 24.41 29.43 4.22 20.43-7.5 38.63-12.72 19.2-34.65 24.03-21.94 4.84-42.85-2.92-26.37-11.33-54.74-16.87-28.37-5.54-58.5-5.54-131.33 0-222.75 91.3-91.42 91.3-91.42 222.87t91.42 222.87q91.42 91.3 222.75 91.3 131.09 0 222.63-91.18 91.54-91.19 91.54-222.03 0-4.05.12-9.09t-.88-9.09q-.76-22.67 11.2-40.75 11.96-18.07 32.39-24.07 21.67-6 39.87 6.57 18.2 12.58 19.96 34.25.76 9.81 1.64 20.61.88 10.81.88 20.61 0 86.72-32.24 162.93-32.24 76.22-89.72 133.7-57.48 57.48-133.57 90.1Q567.72-60.65 480-60.65Zm-54.72-371.33L790.37-796.3q15.96-15.72 37.03-15.22 21.08.5 36.03 15.22 15.96 15.95 15.96 36.53 0 20.57-15.96 36.53L460.91-321.96q-15.95 16.2-36.63 16.2-20.67 0-36.63-16.2L279.48-430.13q-15.96-15.72-15.96-36.79 0-21.08 15.96-36.8 15.95-15.95 37.03-15.95 21.08 0 37.03 15.95l71.74 71.74Z" />
									</svg>
								) : (
									// Copy Icon
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M375.93-211.67q-43.29 0-74.23-30.94-30.94-30.94-30.94-74.24v-481.3q0-43.3 30.94-74.24 30.94-30.94 74.23-30.94h385.31q43.29 0 74.11 30.94t30.82 74.24v481.3q0 43.3-30.82 74.24-30.82 30.94-74.11 30.94H375.93Zm0-105.18h385.31v-481.3H375.93v481.3ZM198.76-34.74q-43.29 0-74.11-30.82t-30.82-74.11v-533.9q0-21.63 15.24-37.11 15.25-15.47 37.01-15.47 21.77 0 37.22 15.47 15.46 15.48 15.46 37.11v533.9h437.89q21.64 0 37.12 15.24 15.47 15.25 15.47 37.01 0 21.77-15.47 37.22-15.48 15.46-37.12 15.46H198.76Zm177.17-282.11v-481.3 481.3Z" />
									</svg>
								)}
								{isCopied ? "⠀Copied!" : "⠀Copy Text"}
							</li>
						)}

						{/* Copy Gif Url Option */}
						{selectedMessage?.gifUrl && (
							<li
								className="p-2 hover:bg-blue-600 cursor-pointer rounded-lg flex items-center"
								onClick={() => {
									navigator.clipboard.writeText(
										selectedMessage?.gifUrl || "",
									);
									setIsGifCopied(true); // Set copied state to true

									// Revert icon back to copy after 2 seconds
									setTimeout(() => {
										setIsGifCopied(false);
									}, 2000);
								}}
							>
								{/* Conditional Icon Rendering */}
								{isGifCopied ? (
									// Done Icon
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480-60.65q-86.72 0-162.93-32.62-76.22-32.62-133.7-90.1-57.48-57.48-90.1-133.7Q60.65-393.28 60.65-480q0-87.72 32.62-163.82 32.62-76.09 90.1-133.57 57.48-57.48 133.7-89.72 76.21-32.24 162.93-32.24 44.85 0 89.05 9.17 44.21 9.16 84.78 29.25 20.19 9 24.41 29.43 4.22 20.43-7.5 38.63-12.72 19.2-34.65 24.03-21.94 4.84-42.85-2.92-26.37-11.33-54.74-16.87-28.37-5.54-58.5-5.54-131.33 0-222.75 91.3-91.42 91.3-91.42 222.87t91.42 222.87q91.42 91.3 222.75 91.3 131.09 0 222.63-91.18 91.54-91.19 91.54-222.03 0-4.05.12-9.09t-.88-9.09q-.76-22.67 11.2-40.75 11.96-18.07 32.39-24.07 21.67-6 39.87 6.57 18.2 12.58 19.96 34.25.76 9.81 1.64 20.61.88 10.81.88 20.61 0 86.72-32.24 162.93-32.24 76.22-89.72 133.7-57.48 57.48-133.57 90.1Q567.72-60.65 480-60.65Zm-54.72-371.33L790.37-796.3q15.96-15.72 37.03-15.22 21.08.5 36.03 15.22 15.96 15.95 15.96 36.53 0 20.57-15.96 36.53L460.91-321.96q-15.95 16.2-36.63 16.2-20.67 0-36.63-16.2L279.48-430.13q-15.96-15.72-15.96-36.79 0-21.08 15.96-36.8 15.95-15.95 37.03-15.95 21.08 0 37.03 15.95l71.74 71.74Z" />
									</svg>
								) : (
									// Copy Icon
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M375.93-211.67q-43.29 0-74.23-30.94-30.94-30.94-30.94-74.24v-481.3q0-43.3 30.94-74.24 30.94-30.94 74.23-30.94h385.31q43.29 0 74.11 30.94t30.82 74.24v481.3q0 43.3-30.82 74.24-30.82 30.94-74.11 30.94H375.93Zm0-105.18h385.31v-481.3H375.93v481.3ZM198.76-34.74q-43.29 0-74.11-30.82t-30.82-74.11v-533.9q0-21.63 15.24-37.11 15.25-15.47 37.01-15.47 21.77 0 37.22 15.47 15.46 15.48 15.46 37.11v533.9h437.89q21.64 0 37.12 15.24 15.47 15.25 15.47 37.01 0 21.77-15.47 37.22-15.48 15.46-37.12 15.46H198.76Zm177.17-282.11v-481.3 481.3Z" />
									</svg>
								)}
								{isGifCopied ? "⠀Gif Copied!" : "⠀Copy Gif Url"}
							</li>
						)}

						{/* Copy AudioUrl Url Option */}
						{selectedMessage?.audioUrl && (
							<li
								className="p-2 hover:bg-blue-600 cursor-pointer rounded-lg flex items-center"
								onClick={() => {
									navigator.clipboard.writeText(
										selectedMessage?.audioUrl || "",
									);
									setIsAudioCopied(true); // Set copied state to true

									// Revert icon back to copy after 2 seconds
									setTimeout(() => {
										setIsAudioCopied(false);
									}, 2000);
								}}
							>
								{/* Conditional Icon Rendering */}
								{isAudioCopied ? (
									// Done Icon
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M480-60.65q-86.72 0-162.93-32.62-76.22-32.62-133.7-90.1-57.48-57.48-90.1-133.7Q60.65-393.28 60.65-480q0-87.72 32.62-163.82 32.62-76.09 90.1-133.57 57.48-57.48 133.7-89.72 76.21-32.24 162.93-32.24 44.85 0 89.05 9.17 44.21 9.16 84.78 29.25 20.19 9 24.41 29.43 4.22 20.43-7.5 38.63-12.72 19.2-34.65 24.03-21.94 4.84-42.85-2.92-26.37-11.33-54.74-16.87-28.37-5.54-58.5-5.54-131.33 0-222.75 91.3-91.42 91.3-91.42 222.87t91.42 222.87q91.42 91.3 222.75 91.3 131.09 0 222.63-91.18 91.54-91.19 91.54-222.03 0-4.05.12-9.09t-.88-9.09q-.76-22.67 11.2-40.75 11.96-18.07 32.39-24.07 21.67-6 39.87 6.57 18.2 12.58 19.96 34.25.76 9.81 1.64 20.61.88 10.81.88 20.61 0 86.72-32.24 162.93-32.24 76.22-89.72 133.7-57.48 57.48-133.57 90.1Q567.72-60.65 480-60.65Zm-54.72-371.33L790.37-796.3q15.96-15.72 37.03-15.22 21.08.5 36.03 15.22 15.96 15.95 15.96 36.53 0 20.57-15.96 36.53L460.91-321.96q-15.95 16.2-36.63 16.2-20.67 0-36.63-16.2L279.48-430.13q-15.96-15.72-15.96-36.79 0-21.08 15.96-36.8 15.95-15.95 37.03-15.95 21.08 0 37.03 15.95l71.74 71.74Z" />
									</svg>
								) : (
									// Copy Icon
									<svg
										xmlns="http://www.w3.org/2000/svg"
										height="20px"
										viewBox="0 -960 960 960"
										width="20px"
										fill="#e8eaed"
									>
										<path d="M375.93-211.67q-43.29 0-74.23-30.94-30.94-30.94-30.94-74.24v-481.3q0-43.3 30.94-74.24 30.94-30.94 74.23-30.94h385.31q43.29 0 74.11 30.94t30.82 74.24v481.3q0 43.3-30.82 74.24-30.82 30.94-74.11 30.94H375.93Zm0-105.18h385.31v-481.3H375.93v481.3ZM198.76-34.74q-43.29 0-74.11-30.82t-30.82-74.11v-533.9q0-21.63 15.24-37.11 15.25-15.47 37.01-15.47 21.77 0 37.22 15.47 15.46 15.48 15.46 37.11v533.9h437.89q21.64 0 37.12 15.24 15.47 15.25 15.47 37.01 0 21.77-15.47 37.22-15.48 15.46-37.12 15.46H198.76Zm177.17-282.11v-481.3 481.3Z" />
									</svg>
								)}
								{isGifCopied
									? "⠀Audio Url Copied!"
									: "⠀Copy Audio Url"}
							</li>
						)}

						{/* Delete Message Option */}
						<li
							className="p-2 hover:bg-red-600 cursor-pointer rounded-lg flex items-center"
							onClick={() => setShowDeleteModal(true)}
						>
							{/* Delete Icon */}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="20px"
								viewBox="0 -960 960 960"
								width="20px"
								fill="#e8eaed"
							>
								<path d="M305.85-108.65q-44.57 0-74.87-30.3-30.31-30.31-30.31-74.88v-483.06h-12q-21.73 0-37.04-15.25-15.3-15.24-15.3-37.01 0-21.76 15.3-37.34 15.31-15.58 37.04-15.58h188.07v-12q0-19.97 13.84-34.13 13.85-14.17 34.46-14.17H536q20.61 0 34.62 13.98 14.01 13.98 14.01 34.32v12h188.21q21.98 0 37.29 15.42 15.31 15.41 15.31 36.96 0 21.89-15.31 37.34-15.31 15.46-37.28 15.46h-12v482.63q0 45.3-30.3 75.46-30.31 30.15-74.88 30.15H305.85Zm349.82-588.24H305.85v483.06h349.82v-483.06ZM411.55-283.96q20.35 0 35.14-14.63 14.79-14.64 14.79-35.08v-243.37q0-20.45-14.58-35.08-14.57-14.64-34.93-14.64-20.35 0-35.26 14.64-14.91 14.63-14.91 35.08v243.37q0 20.44 14.7 35.08 14.7 14.63 35.05 14.63Zm138.48 0q20.35 0 35.14-14.63 14.79-14.64 14.79-35.08v-243.37q0-20.45-14.58-35.08-14.58-14.64-34.93-14.64t-35.26 14.64q-14.91 14.63-14.91 35.08v243.37q0 20.44 14.7 35.08 14.69 14.63 35.05 14.63ZM305.85-696.89v483.06-483.06Z" />
							</svg>
							⠀Delete Message
						</li>
					</ul>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && (
				<div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm transition-opacity duration-300 ease-in-out">
					<div className="bg-neutral-900 p-6 w-30 sm:w-1/3 rounded-lg space-y-4 flex flex-col items-center justify-center shadow-lg text-center">
						{/* Modal Title */}
						<h2 className="text-xl font-semibold mb-2 text-white">
							Delete Message
						</h2>

						{/* Information Text */}
						<p className="text-sm text-gray-400 mb-4">
							You can delete messages through this dialog.
						</p>

						{/* Delete Options */}
						{selectedMessage?.sender === currentUsername ? (
							<>
								<button
									onClick={() => handleDeleteMessage(true)}
									className="w-full py-2 mb-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 ease-in-out"
								>
									Delete for Everyone
								</button>
								<button
									onClick={() => handleDeleteMessage(false)}
									className="w-full py-2 mb-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200 ease-in-out"
								>
									Delete for Me
								</button>
							</>
						) : (
							<button
								onClick={() => handleDeleteMessage(false)}
								className="w-full py-2 mb-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200 ease-in-out"
							>
								Delete for Me
							</button>
						)}

						{/* Cancel Button */}
						<button
							onClick={() => setShowDeleteModal(false)}
							className="w-full py-2 mt-2 text-white bg-gray-700 hover:bg-gray-800 rounded-lg transition-colors duration-200 ease-in-out"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{showScrollToBottom && (
				<div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
					<span
						className="tooltip tooltip-top"
						data-tip="Scroll to Bottom"
					>
						<button
							className="p-2 rounded-full bg-blue-600 text-white shadow-lg hover:shadow-blue-500/50 transition-shadow"
							onClick={handleScrollToBottom}
							aria-label="Scroll to Bottom"
						>
							<FaArrowDown size={20} />
						</button>
					</span>
				</div>
			)}
		</div>
	);
};

export default GroupChat;
