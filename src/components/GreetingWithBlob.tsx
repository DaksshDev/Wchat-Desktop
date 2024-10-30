import { useEffect, useRef, useState } from "react";
import LogoIcon from "./LogoIcon.png";
import ICON from "../FlareAI/ICON.jpg";
import { Gemini } from "../pages/FirebaseConfig";

interface GreetingWithBlobProps {
	currentUsername: string;
	currentDate: string;
	currentTime: string;
}

const GreetingWithBlob: React.FC<GreetingWithBlobProps> = ({
	currentUsername,
	currentDate,
	currentTime,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	// State to hold the greeting toggle value from localStorage
	const [isGreetingEnabled, setIsGreetingEnabled] = useState<boolean>(false);

	// Function to check and update the greeting status from localStorage
	const checkGreetingStatus = () => {
		const storedValue = localStorage.getItem("Greeting");
		setIsGreetingEnabled(storedValue ? JSON.parse(storedValue) : false);
	};

	// Continuously watch for changes in the localStorage value
	useEffect(() => {
		checkGreetingStatus(); // Initial check on component mount

		// Set up a polling interval to check for changes
		const intervalId = setInterval(checkGreetingStatus, 1000);

		return () => clearInterval(intervalId); // Clear the interval on component unmount
	}, []);

	const getGreeting = () => {
		const hour = new Date().getHours();

		if (hour >= 5 && hour < 12) {
			return `🌅 Good Morning`;
		}
		if (hour >= 12 && hour < 17) {
			return `🌞 Good Afternoon`;
		}
		if (hour >= 17 && hour < 21) {
			return `🌇 Good Evening`;
		}
		return `🌙 Good Night`;
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Check localStorage for selected theme
		const selectedTheme = localStorage.getItem("selectedTheme") || "Aurora";

		// Set canvas size
		const setCanvasSize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		setCanvasSize();
		window.addEventListener("resize", setCanvasSize);

		// Aurora colors based on theme
		let auroras: { baseY: number; amplitude: number; color: string }[] = [];

		switch (selectedTheme) {
			case "Red Neon":
				auroras = [
					{
						baseY: canvas.height * 0.4,
						amplitude: canvas.height * 0.15,
						color: "rgba(255, 0, 0, 0.3)", // Red Neon
					},
					{
						baseY: canvas.height * 0.6,
						amplitude: canvas.height * 0.2,
						color: "rgba(255, 69, 0, 0.3)", // Orange
					},
				];
				break;
			case "Gamer Blue":
				auroras = [
					{
						baseY: canvas.height * 0.4,
						amplitude: canvas.height * 0.15,
						color: "rgba(0, 50, 255, 0.3)", // Deep Blue
					},
					{
						baseY: canvas.height * 0.6,
						amplitude: canvas.height * 0.2,
						color: "rgba(0, 255, 255, 0.3)", // Cyan
					},
				];
				break;
			case "Festival":
				auroras = [
					{
						baseY: canvas.height * 0.4,
						amplitude: canvas.height * 0.15,
						color: "rgba(255, 0, 255, 0.3)", // Magenta
					},
					{
						baseY: canvas.height * 0.6,
						amplitude: canvas.height * 0.2,
						color: "rgba(255, 215, 0, 0.3)", // Gold
					},
				];
				break;
			default:
				auroras = [
					{
						baseY: canvas.height * 0.4,
						amplitude: canvas.height * 0.15,
						color: "rgba(72, 209, 204, 0.3)", // Turquoise (default Aurora)
					},
					{
						baseY: canvas.height * 0.6,
						amplitude: canvas.height * 0.2,
						color: "rgba(147, 51, 234, 0.3)", // Purple
					},
				];
				break;
		}

		let animationFrameId: number;
		const animate = () => {
			// Clear canvas with fade effect
			ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const time = Date.now() / 4000; // Slow, smooth movement

			auroras.forEach((aurora) => {
				ctx.beginPath();
				ctx.moveTo(0, aurora.baseY);

				// Smooth curve for aurora drawing, covering the entire width
				for (let x = 0; x < canvas.width; x++) {
					const y =
						aurora.baseY +
						Math.sin((x / canvas.width) * 6 + time) *
							aurora.amplitude;
					ctx.lineTo(x, y);
				}

				// Close aurora shape
				ctx.lineTo(canvas.width, canvas.height);
				ctx.lineTo(0, canvas.height);
				ctx.closePath();

				// Fill with gradient for smoother transitions
				const gradient = ctx.createLinearGradient(
					0,
					aurora.baseY - aurora.amplitude,
					0,
					aurora.baseY + aurora.amplitude,
				);
				gradient.addColorStop(0, "transparent");
				gradient.addColorStop(0.5, aurora.color);
				gradient.addColorStop(1, "transparent");

				ctx.fillStyle = gradient;
				ctx.fill();
			});

			animationFrameId = requestAnimationFrame(animate);
		};

		animate();

		return () => {
			window.removeEventListener("resize", setCanvasSize);
			cancelAnimationFrame(animationFrameId);
		};
	}, []);

	return (
		<div className="relative w-[100%] h-screen right-0 bg-black overflow-hidden select-none rounded-lg">
			{isGreetingEnabled && (
				<h1 className="absolute font-helvetica z-10 text-3xl text-white top-5 ml-9">
					{getGreeting()}
				</h1>
			)}

			{/* Date on bottom-right */}
			<p className="absolute z-10 text-lg text-white bottom-10 right-1 mr-2">
				{currentDate}
			</p>

			{/* Time on bottom-right */}
			<p className="absolute z-10 text-3xl text-white bottom-16 right-1 mr-2">
				{currentTime}
			</p>

			{/* FLARE AI BUTTON!  */}
			<div className="absolute bottom-10 left-6 z-50">
				<div
					className="tooltip tooltip-top tooltip-info"
					data-tip="FlareAI"
				>
					<button className="relative rounded-full cursor-pointer z-50 overflow-hidden w-16 h-16 transition-transform duration-300 transform hover:scale-125 flex items-center justify-center bg-gradient-to-r from-blue-500 to-green-500 border-4 border-blue-500 group">
						<img
							src={ICON} // Replace ICON with your JPG icon path
							alt="Profile"
							className="w-full h-full object-cover"
						/>
						{/* Shadow effect using borders */}
						<span className="absolute inset-0 rounded-full border-4 border-blue-500 group-hover:border-orange-500 blur transition-all duration-300"></span>
						<span className="absolute inset-0 rounded-full border-4 border-green-500 group-hover:border-yellow-500 blur transition-all duration-300 delay-200"></span>
					</button>
				</div>
			</div>

			{/* Getting Started section in the center */}
			<div className="absolute z-10 text-center w-full h-full flex flex-col items-center justify-center text-white">
				{/* Logo Image */}
				<img
					src={LogoIcon} // Replace with the actual path to your logo
					alt="BonFire Logo"
					className="mb-4 w-64 h-64 pointer-events-none " // Adjust width and height as necessary
				/>

				<h2 className="text-4xl mb-4">Welcome to BonFire</h2>
				<p className="text-lg mb-2">
					Get started by sending a message to your friends!
				</p>
				<p className="text-sm text-gray-400">
					Or explore some{" "}
					<span className="text-blue-500 cursor-pointer">
						features
					</span>{" "}
					to learn more.
				</p>
			</div>

			{/* Canvas for Aurora effect */}
			<canvas
				ref={canvasRef}
				className="absolute top-0 left-0 w-full h-full blur-[200px] transform-gpu will-change-transform"
			/>

			{/* Overlay effect */}
			<div
				className="absolute top-0 left-0 w-full h-full bg-[rgba(255,255,255,0.1)] bg-[url('noise.png')] 
		  mix-blend-overlay opacity-30"
			/>
		</div>
	);
};

export default GreetingWithBlob;
