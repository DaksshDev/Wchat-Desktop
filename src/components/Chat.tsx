import { useEffect, useRef, useState } from "react";
import React from "react";
import { rtdb, storage, Tenor } from "../pages/FirebaseConfig";
import { FaMicrophone, FaStop } from "react-icons/fa";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import ReactAudioPlayer from "react-audio-player";
import { FixedSizeList as List } from "react-window";
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
import ReactPlayer from "react-player";

interface ChatProps {
	friendUsername?: string;
	friendPic?: string;
	onClose: () => void;
	currentUsername?: string;
	currentUserPic?: string;
}

const Chat: React.FC<ChatProps> = ({
	friendUsername,
	friendPic,
	onClose,
	currentUsername,
	currentUserPic,
}) => {
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState<any[]>([]);
	const [expandedMessages, setExpandedMessages] = useState<number[]>([]);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [showGifPicker, setShowGifPicker] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const contextMenuRef = useRef<HTMLDivElement>(null);
	const isVideoUrl = (url: string) => {
		return ReactPlayer.canPlay(url); // Use ReactPlayer's built-in method to check if the URL is playable
	};

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
	const [isCopied, setIsCopied] = useState(false);
	const [isGifCopied, setIsGifCopied] = useState(false);
	const [isAudioCopied, setIsAudioCopied] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [mediaRecorderInstance, setMediaRecorderInstance] =
		useState<MediaRecorder | null>(null);

	const linkifyOptions = {
		className: "text-blue-300 underline cursor-pointer",
		defaultProtocol: "https", // Ensures links without protocol still work
	};

	const [isTyping, setIsTyping] = useState(false); // Whether the current user is typing
	const [isFriendTyping, setIsFriendTyping] = useState(false); // Whether the friend is typing
	const [typingDots, setTypingDots] = useState("."); // Animated typing dots
	const [recordingTime, setRecordingTime] = useState(0); // To track elapsed recording time

	// Effect to handle timer when recording
	useEffect(() => {
		let interval: NodeJS.Timeout;

		if (isRecording) {
			interval = setInterval(() => {
				setRecordingTime((prev) => prev + 1); // Increment every second
			}, 1000);
		} else {
			setRecordingTime(0); // Reset recording time when not recording
		}

		return () => clearInterval(interval); // Clean up the interval on unmount or when recording state changes
	}, [isRecording]);

	// Ref to store the timeout ID
	const typingTimeout = useRef<NodeJS.Timeout | null>(null);

	// Update typing status in RTDB
	const updateTypingStatus = async (isTyping: boolean) => {
		const typingRef = ref(
			rtdb,
			`dm/${friendUsername}/${currentUsername}/typing`,
		);
		await set(typingRef, isTyping);
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

	// Listen to friend's typing status from RTDB
	useEffect(() => {
		const typingRef = ref(
			rtdb,
			`dm/${currentUsername}/${friendUsername}/typing`,
		);
		const unsubscribe = onValue(typingRef, (snapshot) => {
			const typingStatus = snapshot.val();
			setIsFriendTyping(typingStatus);
		});

		return () => unsubscribe(); // Cleanup listener on component unmount
	}, [currentUsername, friendUsername]);

	// Animate the typing dots (up to 3 dots)
	useEffect(() => {
		if (isFriendTyping) {
			const interval = setInterval(() => {
				setTypingDots((prev) => (prev.length < 3 ? prev + "." : "."));
			}, 500); // Change every 500ms

			return () => clearInterval(interval); // Cleanup the interval
		}
	}, [isFriendTyping]);

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

	// Close context menu on click outside
	const handleClickOutside = (event: MouseEvent) => {
		if (
			contextMenuRef.current &&
			!contextMenuRef.current.contains(event.target as Node)
		) {
			setShowContextMenu(null);
			setSelectedMessage(null); // Reset selected message when clicking outside
		}
	};

	useEffect(() => {
		// Add event listener for clicks outside
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			// Clean up event listener on unmount
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		if (friendUsername) {
			const chatPath = `dm/${currentUsername}/${friendUsername}/messages/`;
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
	}, [currentUsername, friendUsername]);

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
				handleSendMessage(null, downloadURL);

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

	// Handle sending messages
	const handleSendMessage = async (
		gifUrl: string | null = null,
		audioUrl: string | null = null,
	) => {
		if (
			(message.trim() || gifUrl || audioUrl) &&
			friendUsername &&
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
				replyToTimestamp: replyingTo ? replyingTo.timestamp : null, // Add the replyToTimestamp
				replyTogifUrl: replyingTo?.gifUrl || null,
				replyToaudioUrl: replyingTo?.audioUrl || null,
			};

			// Push message to recipient's chat and get the ID
			const recipientChatRef = ref(
				rtdb,
				`dm/${friendUsername}/${currentUsername}/messages/`,
			);
			const recipientMessageRef = push(recipientChatRef);
			await set(recipientMessageRef, {
				...newMessage,
				id: recipientMessageRef.key,
			});

			// Push message to sender's chat and get the ID
			const senderChatRef = ref(
				rtdb,
				`dm/${currentUsername}/${friendUsername}/messages/`,
			);
			const senderMessageRef = push(senderChatRef);
			await set(senderMessageRef, {
				...newMessage,
				id: senderMessageRef.key,
				recipientId: recipientMessageRef.key,
			});

			// Reset message input and hide GIF picker
			// Reset typing status after sending the message
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
					`dm/${currentUsername}/${friendUsername}/messages/${id}`,
				);
				const recipientRef = ref(
					rtdb,
					`dm/${friendUsername}/${currentUsername}/messages/${recipientId}`,
				);

				// Remove message from both chats
				await Promise.all([remove(senderRef), remove(recipientRef)]);
			} else {
				// Reference only for the current user's chat
				const userRef = ref(
					rtdb,
					`dm/${currentUsername}/${friendUsername}/messages/${id}`,
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
		<div className=" w-full h-full right-0 bg-black rounded-lg flex flex-col overflow-hidden select-none relative z-40">
			<ChatBg />
			{/* Navbar */}
			<div className="flex items-center justify-between p-4 bg-neutral-900 text-white shadow-md rounded-lg">
				{/* Group Information */}
				<div className="flex items-center space-x-4">
					{friendUsername && (
						<>
							{/* Group Avatar with Photo Viewer */}
							<PhotoProvider>
								<PhotoView
									src={
										friendPic ||
										"https://ui.avatar.com/default"
									}
								>
									<div className="avatar cursor-pointer">
										<div className="w-10 rounded-full ring ring-neutral-800 ring-offset-base-100 ring-offset-2">
											<img
												src={
													friendPic ||
													"https://ui.avatar.com/default"
												}
												alt={friendUsername}
												className="object-cover"
											/>
										</div>
									</div>
								</PhotoView>
							</PhotoProvider>

							{/* Friend Name */}
							<div className="flex flex-col">
								<span className="text-lg font-semibold text-white">
									{friendUsername}
								</span>
							</div>
						</>
					)}
				</div>

				{/* Navbar Buttons */}
				<div className="flex items-center space-x-3">
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
				className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1 select-text scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-500 scrollbar-track-neutral-950 scrollbar-track-rounded-md"
			>
				{messages.length > 0 ? (
					messages.map((msg, idx) => {
						const isCurrentUser = msg.sender === currentUsername;
						const bgColor = isCurrentUser
							? "bg-violet-600 text-white"
							: "bg-neutral-800 text-white";
						const Rounded = isCurrentUser
							? "rounded-t-lg rounded-bl-lg"
							: "rounded-t-lg rounded-br-lg";
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
							: msg.content.length > 1300
							? msg.content.slice(0, 1300) + "..."
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
										className={`max-w-xs md:max-w-md lg:max-w-lg p-3 ${Rounded} shadow-md ${bgColor} relative ${
											selectedMessage?.id === msg.id
												? "border-yellow-500 border-2"
												: ""
										}`}
										style={{ wordBreak: "break-word" }}
									>
										<p className="font-semibold">
											{msg.sender}
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
													height="230px"
													className="mt-2"
													controls={true} // Show player controls
												/>
											)}

										{/* Render GIF if available */}
										{msg.gifUrl && (
											<img
												src={msg.gifUrl}
												alt="GIF"
												width="100%"
												height="230px"
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
						<div className="bg-neutral-900/60 backdrop-blur-3xl p-6 rounded-lg text-center w-4/5 flex items-center">
							{/* GIF on the left */}
							<div className="w-1/3 flex justify-center items-center rounded-lg overflow-hidden">
								<img
									src="https://media1.tenor.com/m/J3mNIbj6A4wAAAAd/empty-shelves-john-travolta.gif"
									alt="Confused Travolta"
									className="w-full h-full  object-contain rounded-lg" // Rounded GIF
								/>
							</div>

							{/* Vertical separator */}
							<hr className="w-1 rounded-full h-64 bg-white mx-6" />

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
				<div className="p-2 text-gray-300 italic rounded-t-lg bg-neutral-950/60 backdrop-blur-2xl shadow-inner shadow-green-600">
					<strong>Uploading...</strong>
					{/* You can add a loading animation here if needed */}
				</div>
			)}

			{/* Display the "Friend is typing..." indicator */}
			{isFriendTyping && (
				<div className="p-2 text-gray-300 italic rounded-t-lg bg-neutral-950/60 backdrop-blur-2xl shadow-inner shadow-blue-600">
					<strong>{friendUsername}</strong> is typing{typingDots}
				</div>
			)}

			{/* Reply Indicator */}
			{replyingTo && (
				<div className="p-2 bg-neutral-900/60 backdrop-blur-2xl text-white rounded-t-lg">
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
			<div className="p-3 bg-neutral-950/50 backdrop-blur-lg shadow-md flex items-center relative">
				{/* Emoji Picker Toggle */}
				{!isRecording && (
					<button
						onClick={() => setShowEmojiPicker((prev) => !prev)}
						className="btn btn-ghost btn-sm text-white mr-2"
						title="Pick Emoji"
					>
						<FaSmile size={24} className="text-white" />
					</button>
				)}

				{/* GIF Picker Toggle */}
				{!isRecording && (
					<button
						onClick={() => setShowGifPicker((prev) => !prev)}
						className="btn btn-ghost btn-sm text-white mr-2"
						title="Pick GIF"
					>
						<MdGif size={34} className="text-white" />
					</button>
				)}

				{isRecording ? (
					<div className="relative flex w-screen items-center mb-4 p-2 bg-neutral-950/60 backdrop-blur-3xl shadow-inner shadow-blue-600 rounded-lg">
						<span className="text-white text-lg font-semibold mr-2">
							Recording: {recordingTime}s
						</span>
						<span className="absolute w-4 h-4 rounded-full bg-red-500 animate-ping" />
						<span className="text-red-500 ml-1">🔴</span>{" "}
						{/* Optional red dot emoji for extra visual cue */}
					</div>
				) : null}

				{/* Message Input, hidden during recording */}
				{!isRecording && (
					<input
						type="text"
						placeholder="Type your message..."
						value={message}
						maxLength={MAX_MESSAGE_LENGTH}
						onChange={handleTyping} // Call handleTyping on every keystroke
						onKeyDown={(e) =>
							e.key === "Enter" && handleSendMessage()
						} // Send message on Enter
						className="flex-1 input input-bordered text-white bg-neutral-900 transition-all duration-200 ease-in-out"
					/>
				)}

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
				{!isRecording && (
					<button
						onClick={() => handleSendMessage()}
						title="Send"
						className="btn bg-blue-600 hover:bg-neutral-800 btn-sm ml-2"
					>
						<FaPaperPlane size={18} color="white" />
					</button>
				)}

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
					className="absolute z-50 w-52 bg-neutral-900 text-white shadow-lg p-2 rounded-lg"
					style={{
						top: `${showContextMenu.y - 30}px`, // Add slight offset for better UX
						left: `${showContextMenu.x - 230}px`,
					}}
					onMouseLeave={() => {
						setShowContextMenu(null);
						setSelectedMessage(null); // Reset selected message when mouse leaves context menu
					}}
					ref={contextMenuRef} // Assign ref to context menu
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
				<div className="fixed animate-bounce bottom-24 right-12 flex flex-col items-center">
					<span
						className="tooltip tooltip-top"
						data-tip="Scroll to Bottom"
					>
						<button
							className="p-2 rounded-md bg-neutral-800/70 backdrop-blur-lg text-white shadow-lg hover:shadow-blue-500/50 transition-shadow"
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
