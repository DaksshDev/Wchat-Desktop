/** @type {import("tailwindcss").Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
	darkMode: ["media", '[data-theme="dark"]'],
	theme: {
		extend: {
			fontFamily: {
				helvetica: ["Helvetica"],
			},
			animation: {
				flicker: "flicker 1.5s infinite alternate",
				intenseFlicker: "intenseFlicker 0.1s infinite alternate",
			},
			keyframes: {
				flicker: {
					"0%": { opacity: "1", transform: "scale(1)" },
					"50%": {
						opacity: "0.6",
						transform: "scale(1.1) rotate(-3deg)",
					},
					"100%": {
						opacity: "1",
						transform: "scale(1) rotate(3deg)",
					},
				},
				intenseFlicker: {
					"0%": { opacity: "0.8" },
					"50%": { opacity: "0.4" },
					"100%": { opacity: "0.8" },
				},
			},
		},
	},
	plugins: [
		require("daisyui"),
		require("tailwind-scrollbar")({ nocompatible: true }),
	],
	daisyui: {
		themes: ["dark", "black", "dark"],
		fontFamily: "Helvetica", // Set Helvetica in Daisy UI theme
	},
};

