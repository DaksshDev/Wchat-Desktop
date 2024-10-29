import { useEffect, useRef } from "react";

interface ChatBgProps {}

const ChatBg: React.FC<ChatBgProps> = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
			case "Festival":
				auroras = [
					{
						baseY: canvas.height * 0.4,
						amplitude: canvas.height * 0.15,
						color: "rgba(255, 105, 180, 0.3)", // Hot Pink
					},
					{
						baseY: canvas.height * 0.6,
						amplitude: canvas.height * 0.2,
						color: "rgba(255, 215, 0, 0.3)", // Gold
					},
				];
				break;
			case "Red Neon":
				auroras = [
					{
						baseY: canvas.height * 0.4,
						amplitude: canvas.height * 0.15,
						color: "rgba(255, 0, 0, 0.3)", // Neon Red
					},
					{
						baseY: canvas.height * 0.6,
						amplitude: canvas.height * 0.2,
						color: "rgba(255, 165, 0, 0.3)", // Neon Orange
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
			default: // Default Aurora Theme
				auroras = [
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

				// Smooth curve for aurora drawing
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
		<div className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none rounded-lg -z-50">
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

export default ChatBg;
