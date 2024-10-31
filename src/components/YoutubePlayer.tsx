import React, { useState } from "react";
import ReactPlayer from "react-player/youtube";
import Draggable from "react-draggable";
import { FaTimes } from "react-icons/fa";

interface YouTubePlayerProps {
  initialUrl: string;
  onClose: () => void; // Callback for closing the player
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  initialUrl,
  onClose,
}) => {
  const [url, setUrl] = useState(initialUrl);

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  return (
    <Draggable bounds="parent" handle=".drag-handle">
      <div className="youtube-player-wrapper fixed z-50 bg-black rounded-lg overflow-hidden shadow-lg w-[500px]">
        
        {/* Top Bar for Dragging */}
        <div className="drag-handle bg-gray-800 p-2 flex justify-between items-center cursor-move rounded-t-lg">
          <span className="text-white font-semibold">YouTube Player</span>
          <button
            title="Close"
            className="text-white bg-red-500 rounded-full p-1 hover:bg-red-600 transition"
            onClick={onClose}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* URL Input Field */}
        <div className="p-2 bg-gray-900">
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            className="w-full p-2 bg-gray-700 text-white rounded focus:outline-none focus:ring focus:ring-blue-500"
            placeholder="Enter YouTube URL"
          />
        </div>

        {/* YouTube Player */}
        <ReactPlayer
          url={url}
          controls={true}
          width="100%"
          height="270px"
        />
      </div>
    </Draggable>
  );
};