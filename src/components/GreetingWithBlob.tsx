import { useEffect, useRef, useState } from "react";

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
	const [refreshKey, setRefreshKey] = useState(0);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [showTooltip, setShowTooltip] = useState<boolean>(false);
	const [fps, setFps] = useState<number>(60); // Initialize with 60 FPS as a default
	const refreshTimeout = 5000; // Check interval for FPS (5 seconds)
	const tooltipDuration = 3000; // Tooltip visibility time (3 seconds)
	const [lastFrameTime, setLastFrameTime] = useState<number>(performance.now()); // State for last frame time
  
	useEffect(() => {
		let lastFrameTime = performance.now(); // Track the last frame time locally
		let frames = 0;
		let animationFrameId: number;
	
		const calculateFps = () => {
		  const now = performance.now();
		  frames++;
	
		  // If 1 second has passed, calculate FPS
		  if (now > lastFrameTime + 1000) {
			const fpsCalc = (frames * 1000) / (now - lastFrameTime);
			setFps(fpsCalc); // Update the FPS state
	
			// Check if FPS is below threshold
			if (fpsCalc < 40) {
			  setShowTooltip(true);
	
			  // Hide tooltip after tooltipDuration
			  setTimeout(() => {
				setShowTooltip(false);
			  }, tooltipDuration);
			}
	
			// Reset for the next second
			frames = 0;
			lastFrameTime = now; // Update the last frame time to the current time
		  }
	
		  animationFrameId = requestAnimationFrame(calculateFps); // Request the next animation frame
		};
	
		animationFrameId = requestAnimationFrame(calculateFps); // Start FPS calculation
	
		// Clean up function when component unmounts
		return () => cancelAnimationFrame(animationFrameId);
	  }, [refreshTimeout]);

	let particles: {
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
	}[] = [];

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour >= 5 && hour < 12) return "Morning";
		if (hour >= 12 && hour < 17) return "Afternoon";
		if (hour >= 17 && hour < 21) return "Evening";
		return "Night";
	};
	

	const createParticles = (
		count: number,
		canvasWidth: number,
		canvasHeight: number,
	) => {
		particles = []; // Reset particles on every refresh
		for (let i = 0; i < count; i++) {
			const size = Math.random() * 2 + 1;
			particles.push({
				x: Math.random() * canvasWidth,
				y: Math.random() * canvasHeight,
				vx: (Math.random() - 0.5) * 0.5,
				vy: (Math.random() - 0.5) * 0.5,
				size,
			});
		}
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!canvasRef.current) return;
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		particles.forEach((particle) => {
			const dx = particle.x - mouseX;
			const dy = particle.y - mouseY;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < 100) {
				const angle = Math.atan2(dy, dx);
				const force = (100 - dist) / 100;
				particle.vx += Math.cos(angle) * force * 0.2;
				particle.vy += Math.sin(angle) * force * 0.2;
			}
		});
	};

	const drawParticles = (
		ctx: CanvasRenderingContext2D,
		canvasWidth: number,
		canvasHeight: number,
	) => {
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		particles.forEach((particle) => {
			particle.x += particle.vx;
			particle.y += particle.vy;

			if (particle.x > canvasWidth || particle.x < 0) particle.vx *= -1;
			if (particle.y > canvasHeight || particle.y < 0) particle.vy *= -1;

			const gradient = ctx.createRadialGradient(
				particle.x,
				particle.y,
				0,
				particle.x,
				particle.y,
				particle.size * 20,
			);
			gradient.addColorStop(0, "rgba(29, 78, 216, 0.8)");
			gradient.addColorStop(0.3, "rgba(58, 101, 226, 0.6)");
			gradient.addColorStop(0.5, "rgba(111, 66, 193, 0.5)");
			gradient.addColorStop(0.7, "rgba(148, 59, 225, 0.4)");
			gradient.addColorStop(1, "rgba(168, 85, 247, 0)");

			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(particle.x, particle.y, particle.size * 10, 0, Math.PI * 2);
			ctx.fill();
		});
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const canvasWidth = window.innerWidth;
		const canvasHeight = window.innerHeight;
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		createParticles(250, canvasWidth, canvasHeight);

		const animate = () => {
		
			drawParticles(ctx, canvas.width, canvas.height);
		
			requestAnimationFrame(() => {
				animate(); // Continue animation
			});
		};
		
		const handleResize = () => {
			setRefreshKey((prevKey) => prevKey + 1); // Trigger remount on resize
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("resize", handleResize);
		animate();

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("resize", handleResize);
		};
	}, [refreshKey]); // Remount when refreshKey changes

	const PageRefresh = () => {
		window.location.reload();
		setLastFrameTime(performance.now()); // Reset refresh time
		setShowTooltip(false); // Hide tooltip if manually refreshed

	};

	return (
		<div
			className="fixed w-screen h-screen bg-black overflow-hidden select-none"
			key={refreshKey} // Force remount on refresh
		>
			<h1 className="absolute font-helvetica z-10 text-5xl text-center w-full text-white top-1/4">
				Good {getGreeting()}, {currentUsername}
			</h1>
			<p className="absolute z-10 text-center w-full text-white top-1/3 text-xl">
				{currentDate}
			</p>
			<p className="absolute z-10 text-center font-helvetica w-full text-white bottom-40 text-2xl">
				{currentTime}
			</p>

			<canvas
				ref={canvasRef}
				className="absolute top-0 left-0 w-full h-full blur-[50px] transform-gpu will-change-contents"
			/>

			<div
				className="absolute top-0 left-0 w-full h-full bg-[rgba(255,255,255,0.1)] bg-[url('noise.png')] 
                mix-blend-overlay opacity-60"
			/>

			{/* Refresh button with tooltip */}
			<div className={` ${showTooltip ? 'tooltip tooltip-open tooltip-right fixed bottom-10 left-28 p-4 font-helvetica' : ' '}`} data-tip="Effect feeling slow? Refresh">
				<button
					className="fixed bottom-6 left-24 p-4 bg-transparent rounded-full shadow-lg"
					onClick={PageRefresh}
					title="Refresh Bg Effect"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						height="24px"
						viewBox="0 -960 960 960"
						width="24px"
						fill="#e8eaed"
					>
						<path d="M478.35-122.89q-147.5 0-251.58-103.96Q122.7-330.8 122.7-478.24q0-147.43 104.07-253.15 104.08-105.72 251.51-105.72 71.99 0 137.39 29.6 65.4 29.6 115.63 79.99v-56.59q0-22 15.34-37.5 15.33-15.5 37.54-15.5 22.22 0 37.67 15.5 15.45 15.5 15.45 37.5v228.24q0 23.34-16.62 39.96-16.62 16.63-39.96 16.63H552q-21.9 0-37.33-15.52t-15.43-37.55q0-21.93 15.5-37.31 15.5-15.38 37.5-15.38h130.69q-33.76-53.05-87.78-83.45-54.02-30.4-116.87-30.4-101.32 0-171.87 70.02-70.54 70.03-70.54 170.63 0 101.41 70.54 171.79 70.55 70.38 171.87 70.38 63.61 0 118.22-30.9 54.62-30.9 86.8-85.12 12.11-18.99 32.83-26.33t41.85.38q21.5 7.71 31.48 27.17 9.97 19.46.26 38.75-42.69 76.76-122.77 123.41Q599.88-122.89 478.35-122.89Z" />
					</svg>
				</button>
			</div>
		</div>
	);
};

export default GreetingWithBlob;
