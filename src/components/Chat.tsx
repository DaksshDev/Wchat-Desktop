import { useEffect, useRef, useState } from "react";
import React from "react";
import { rtdb } from "../pages/FirebaseConfig";
import ChatBg from "./ChatBg";
import {
	FaArrowRight,
	FaPaperPlane,
	FaSmile,
	FaArrowDown,
} from "react-icons/fa";
import { ref, push, set, onValue, off, remove } from "firebase/database"; // Import remove for deleting messages
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
import YouTube from "react-youtube";

interface ChatProps {
	isDM: boolean;
	friendUsername?: string;
	friendPic?: string;
	groupId?: string;
	onClose: () => void;
	currentUsername?: string;
	currentUserPic?: string;
}

const Chat: React.FC<ChatProps> = ({
	isDM,
	friendUsername,
	friendPic,
	groupId,
	onClose,
	currentUsername,
	currentUserPic,
}) => {
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState<any[]>([]);
	const [expandedMessages, setExpandedMessages] = useState<number[]>([]);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [showGifPicker, setShowGifPicker] = useState(false);
	const youtubeRegex =
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

	const [showContextMenu, setShowContextMenu] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [selectedMessage, setSelectedMessage] = useState<any>(null);
	const chatRef = useRef<HTMLDivElement>(null);
	const MAX_MESSAGE_LENGTH = 30000;
	const [showScrollToBottom, setShowScrollToBottom] = useState(false);
	const [replyingTo, setReplyingTo] = useState<any>(null); // Track reply state

	const linkifyOptions = {
		className: "text-blue-400 underline cursor-pointer",
		defaultProtocol: "https", // Ensures links without protocol still work
	};

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
			chatRef.current.scrollTop = chatRef.current.scrollHeight;
		}
	};

	useEffect(() => {
		if (isDM && friendUsername) {
			const chatPath = `dm/${currentUsername}/${friendUsername}`;
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
							}),
					  }))
					: [];

				setMessages(messagesList);
			});

			return () => {
				off(messagesRef, "value", listener);
			};
		}
	}, [currentUsername, friendUsername, isDM]);

	useEffect(() => {
		if (chatRef.current) {
			chatRef.current.scrollTop = chatRef.current.scrollHeight;
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

	// Handle sending messages
	const handleSendMessage = async (gifUrl: string | null = null) => {
		if (
			(message.trim() || gifUrl) &&
			friendUsername &&
			message.length <= MAX_MESSAGE_LENGTH
		) {
			const newMessage = {
				sender: currentUsername,
				content: message,
				gifUrl,
				timestamp: Date.now(),
				isReply: !!replyingTo,
				replyTo: replyingTo ? replyingTo.id : null,
				replyToContent: replyingTo ? replyingTo.content : null,
				replyUser: replyingTo ? replyingTo.sender : null,
				replyToTimestamp: replyingTo ? replyingTo.timestamp : null, // Add the replyToTimestamp
			};

			// Push message to recipient's chat and get the ID
			const recipientChatRef = ref(
				rtdb,
				`dm/${friendUsername}/${currentUsername}`,
			);
			const recipientMessageRef = push(recipientChatRef);
			await set(recipientMessageRef, {
				...newMessage,
				id: recipientMessageRef.key,
			});

			// Push message to sender's chat and get the ID
			const senderChatRef = ref(
				rtdb,
				`dm/${currentUsername}/${friendUsername}`,
			);
			const senderMessageRef = push(senderChatRef);
			await set(senderMessageRef, {
				...newMessage,
				id: senderMessageRef.key,
				recipientId: recipientMessageRef.key,
			});

			// Reset message input and hide GIF picker
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
				behavior: "auto",
				block: "center",
			});
		} else {
			console.warn("invalid timestamp" + messageTimestamp);
		}
	};

	// Handle emoji selection
	const handleEmojiClick = (emojiData: EmojiClickData) => {
		setMessage((prevMessage) => prevMessage + emojiData.emoji);
	};

	// Handle GIF selection
	const handleGifSelect = (gif: any) => {
		handleSendMessage(gif.url);
	};

	// Handle right-click to show context menu
	const handleRightClickMessage = (e: React.MouseEvent, msg: any) => {
		e.preventDefault();
		setShowContextMenu({ x: e.pageX, y: e.pageY });
		setSelectedMessage(msg);
	};

	// Handle delete message logic
	const handleDeleteMessage = async (deleteForEveryone: boolean) => {
		if (!selectedMessage) return; // Ensure a message is selected

		const { id, recipientId } = selectedMessage;

		try {
			if (deleteForEveryone) {
				// References for both sender and recipient chats
				const senderRef = ref(
					rtdb,
					`dm/${currentUsername}/${friendUsername}/${id}`,
				);
				const recipientRef = ref(
					rtdb,
					`dm/${friendUsername}/${currentUsername}/${recipientId}`,
				);

				// Remove message from both chats
				await Promise.all([remove(senderRef), remove(recipientRef)]);
			} else {
				// Reference only for the current user's chat
				const userRef = ref(
					rtdb,
					`dm/${currentUsername}/${friendUsername}/${id}`,
				);
				await remove(userRef);
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
			{/* Navbar */}
			<div className="flex items-center justify-between p-4 bg-gray-900 text-white shadow-md">
				<div className="flex items-center space-x-2">
					{isDM && friendUsername ? (
						<>
							<div className="avatar">
								<div className="w-10 rounded-full">
									<img
										src={friendPic}
										alt={`${friendUsername}'s profile`}
									/>
								</div>
							</div>
							<span className="text-lg font-semibold">
								{friendUsername}
							</span>
						</>
					) : (
						<span className="text-lg font-semibold">
							Group: {groupId}
						</span>
					)}
				</div>
				<button
					onClick={onClose}
					className="btn btn-ghost btn-sm text-white"
					title="Close Chat"
				>
					<FaArrowRight size={24} />
				</button>
			</div>

			{/* Chat Messages */}
			<div
				ref={chatRef}
				className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 select-text"
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
						const avatar = isCurrentUser
							? currentUsername
							: friendUsername;
						const avatarPic = isCurrentUser
							? currentUserPic
							: friendPic;

						const isExpanded = expandedMessages.includes(idx);
						const contentToShow = isExpanded
							? msg.content
							: msg.content.length > 300
							? msg.content.slice(0, 300) + "..."
							: msg.content;

						const youtubeMatch = msg.content.match(youtubeRegex);
						const videoId = youtubeMatch ? youtubeMatch[1] : null;

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
									<p className="text-center text-gray-400 text-sm mb-2">
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
											{msg.sender}
										</p>

										{/* Display Reply Context */}
										{msg.replyToContent &&
											msg.replyUser &&
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
														{msg.replyToContent}
													</p>
												</div>
											)}

										{/* Render content with link detection */}
										<Linkify options={linkifyOptions}>
											{contentToShow}
										</Linkify>

										{/* Render YouTube video if URL detected */}
										{videoId && (
											<YouTube
												videoId={videoId}
												opts={{
													width: "100%",
													height: "200px",
												}}
												className="mt-2"
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
					<p className="text-gray-400 text-center">
						No messages yet...
					</p>
				)}
			</div>

			{/* Reply Indicator */}
			{replyingTo && (
				<div className="p-2 bg-gray-800 text-white">
					Replying to <strong>{replyingTo.sender}</strong>
					<button
						onClick={() => setReplyingTo(null)}
						className="ml-2 text-red-500"
					>
						Cancel
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
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
					className="flex-1 input input-bordered text-white bg-gray-800"
				/>

				{/* Send Button */}
				<button
					onClick={() => handleSendMessage()}
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
							tenorApiKey="AIzaSyAdR-HqdHJaxyWFkiSijrOQdxICQyzy4Wc"
							onGifClick={handleGifSelect}
							theme={Theme.DARK}
						/>
					</div>
				)}
			</div>

			{/* Context Menu */}
			{showContextMenu && (
				<div
					className="absolute z-50 w-80 bg-gray-800 text-white rounded shadow-lg p-2"
					style={{
						top: `${showContextMenu.y - 50}px`, // Add slight offset for better UX
						left: `${showContextMenu.x - 70}px`,
					}}
					onMouseLeave={() => setShowContextMenu(null)}
				>
					<ul>
						<li
							className="p-2 hover:bg-gray-700 cursor-pointer"
							onClick={() => setShowDeleteModal(true)}
						>
							Delete Message
						</li>
						<li
							className="p-2 hover:bg-gray-700 cursor-pointer"
							onClick={() => setReplyingTo(selectedMessage)}
						>
							Reply
						</li>
						<li className="p-2 hover:bg-gray-700 cursor-pointer">
							More
						</li>
					</ul>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && (
				<div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
					<div className="bg-neutral-950 p-6 rounded-lg space-y-1 flex flex-col items-center justify-center">
						<h2 className="text-lg font-semibold mb-4">
							Delete Message
						</h2>
						{selectedMessage?.sender === currentUsername ? (
							<>
								<button
									onClick={() => handleDeleteMessage(true)}
									className="btn bg-red-600 text-white"
								>
									Delete for Everyone
								</button>
								<br />
								<button
									onClick={() => handleDeleteMessage(false)}
									className="btn bg-yellow-500 text-white"
								>
									Delete for Me
								</button>
							</>
						) : (
							<button
								onClick={() => handleDeleteMessage(false)}
								className="btn bg-yellow-500 text-white"
							>
								Delete for Me
							</button>
						)}
						<br />
						<button
							onClick={() => setShowDeleteModal(false)}
							className="btn bg-gray-900 text-white"
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

export default Chat;
