import { useEffect, useRef, useState } from "react";

interface AstheticProps {}

const Asthetic: React.FC<AstheticProps> = ({}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const particles: any[] = [];
	const [refreshKey, setRefreshKey] = useState(0); // For refresh logic

	// Create particles with random positions and velocities
	const createParticles = (
		count: number,
		canvasWidth: number,
		canvasHeight: number,
	) => {
		for (let i = 0; i < count; i++) {
			const size = Math.random() * 2 + 1;
			particles.push({
				x: Math.random() * canvasWidth,
				y: Math.random() * canvasHeight,
				vx: (Math.random() - 0.5) * 0.5,
				vy: (Math.random() - 0.5) * 0.5,
				size,
				maxSize: size * 10,
			});
		}
	};

	// Handle mouse move effect
	const handleMouseMove = (e: MouseEvent, canvas: HTMLCanvasElement) => {
		const mouseX = e.clientX - canvas.getBoundingClientRect().left;
		const mouseY = e.clientY - canvas.getBoundingClientRect().top;

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

	// Draw particles
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

			// Add shades of dark blue and purple
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

	// Refresh logic and FPS check
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const canvasWidth = window.innerWidth;
		const canvasHeight = window.innerHeight;
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		createParticles(200, canvasWidth, canvasHeight);

		const animate = () => {
			const start = performance.now(); // Start time of the animation frame

			drawParticles(ctx, canvas.width, canvas.height);

			requestAnimationFrame(() => {
				animate(); // Continue animation
			});
		};

		const handleResize = () => {
			setRefreshKey((prevKey) => prevKey + 1); // Trigger remount on resize
		};

		window.addEventListener("mousemove", (e) => handleMouseMove(e, canvas));
		window.addEventListener("resize", handleResize);
		animate();

		return () => {
			window.removeEventListener("mousemove", (e) =>
				handleMouseMove(e, canvas),
			);
			window.removeEventListener("resize", handleResize);
		};
	}, [refreshKey]);

	return (
		<div
			className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none rounded-lg"
			key={refreshKey}
		>
			{/* Fluid Simulation Canvas */}
			<canvas
				ref={canvasRef}
				className="absolute top-0 left-0 w-full h-full blur-[50px] transform-gpu will-change-contents"
			/>

			{/* Noise Overlay */}
			<div
				className="absolute top-0 left-0 w-full h-full bg-[rgba(255,255,255,0.1) bg-[url('noise.png')] 
                mix-blend-overlay bg-noise opacity-40 rounded-lg"
			/>
		</div>
	);
};

export default Asthetic;
