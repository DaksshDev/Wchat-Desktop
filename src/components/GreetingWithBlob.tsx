import { useEffect, useRef } from "react";

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

		// Set canvas size
		const setCanvasSize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		setCanvasSize();
		window.addEventListener("resize", setCanvasSize);

		// Create 2 auroras with updated positions and amplitudes for better centering
		const auroras = [
			{
				baseY: canvas.height * 0.4,
				amplitude: canvas.height * 0.15,
				color: "rgba(72, 209, 204, 0.3)", // Turquoise
			},
			{
				baseY: canvas.height * 0.6,
				amplitude: canvas.height * 0.2,
				color: "rgba(147, 51, 234, 0.3)", // Purple
			},
		];

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
		<div className="fixed w-[89%] h-screen bg-black overflow-hidden select-none">
			{/* Greeting on bottom-left */}
			<h1 className="absolute font-helvetica z-10 text-3xl text-white bottom-28 ml-9">
				{getGreeting()}
			</h1>

			{/* Date on bottom-right */}
			<p className="absolute z-10 text-lg text-white bottom-28 right-16 mr-9">
				{currentDate}
			</p>

			{/* Time on bottom-right */}
			<p className="absolute z-10 text-3xl text-white bottom-36 right-16 mr-9">
				{currentTime}
			</p>

			{/* Getting Started section in the center */}
			<div className="absolute z-10 text-center w-full h-full flex flex-col items-center justify-center text-white">
				<h2 className="text-4xl mb-4">Welcome to W Chat</h2>
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

			{/* Current time at the bottom */}
			<p className="absolute z-10 text-center font-helvetica w-full text-white bottom-8 text-2xl">
				{currentTime}
			</p>

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
