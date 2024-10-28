import { useEffect, useRef, useState } from "react";

interface ChatBgProps {}

const ChatBg: React.FC<ChatBgProps> = ({}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [refreshKey, setRefreshKey] = useState(0); // For refresh logic

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
		  }
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
				aurora.baseY + Math.sin((x / canvas.width) * 6 + time) * aurora.amplitude;
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
			  aurora.baseY + aurora.amplitude
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
		<div
			className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none rounded-lg -z-50"
			key={refreshKey}
		>
			{/* Fluid Simulation Canvas */}
			<canvas
				ref={canvasRef}
				className="absolute top-0 left-0 w-full h-full blur-[200px] transform-gpu will-change-contents"
			/>

			{/* Noise Overlay */}
			<div
				className="absolute top-0 left-0 w-full h-full bg-[rgba(255,255,255,0.1) bg-[url('noise.png')] 
                mix-blend-overlay bg-noise opacity-40 rounded-lg"
			/>
		</div>
	);
};

export default ChatBg;
