import { useEffect, FC, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { FaFire, FaServer, FaGamepad, FaSyncAlt } from "react-icons/fa";
import offlineFacts from "../json/offlineFacts.json";

// Function to randomly pick a fun fact
function didYouKnowRandomizer() {
	const randomIndex = Math.floor(Math.random() * offlineFacts.length);
	return offlineFacts[randomIndex];
}

export const OfflinePage: FC = () => {
	const navigate = useNavigate();
	const [funFact, setFunFact] = useState("");

	useEffect(() => {
		const handleOnline = () => {
			if (navigator.onLine) {
				navigate("/App"); // Redirect to app page when online
			}
		};

		// Listen for online event to redirect user
		window.addEventListener("online", handleOnline);

		return () => {
			window.removeEventListener("online", handleOnline);
		};
	}, [navigate]);

	// Update fun fact every 15 seconds
	useEffect(() => {
		setFunFact(didYouKnowRandomizer());
		const interval = setInterval(() => {
			setFunFact(didYouKnowRandomizer());
		}, 15000);

		return () => clearInterval(interval);
	}, []);

	return (
		<Layout>
			<div className="flex items-center justify-center h-screen fixed w-screen bg-neutral-950 text-white">
				<div className="flex flex-col items-center space-y-6 text-center">
					{/* Burning Fire Icon */}
					<FaFire className="text-6xl text-red-500 animate-[flicker_1.5s_infinite_alternate]" />
					
					{/* Fun Fact Section */}
					<p className="text-xl font-bold">Did you know?</p>
					<p className="text-gray-400 text-sm italic max-w-md">{funFact}</p>

					{/* Offline Message */}
					<p className="absolute bottom-20 text-base font-semibold">You Are Offline. I Guess</p>

					{/* Links Section */}
					<div className="absolute bottom-10 flex space-x-6 mt-2">
						<button onClick={() => navigate("/server-status")} className="flex items-center text-blue-500 hover:underline transition">
							<FaServer className="mr-1" />
							Server Status
						</button>
						<button onClick={() => navigate("/play-game")} className="flex items-center text-blue-500 hover:underline transition">
							<FaGamepad className="mr-1" />
							Play a Game
						</button>
						<button onClick={() => window.location.reload()} className="flex items-center text-blue-500 hover:underline transition">
							<FaSyncAlt className="mr-1" />
							Reload
						</button>
					</div>
				</div>
			</div>
		</Layout>
	);
};
