/** @type {import("tailwindcss").Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
	darkMode: "media",
	theme: {
		extend: {
		  fontFamily: {
			helvetica: ['Helvetica'],
		  },
		},
	  },
	plugins: [
		require('daisyui')
	  ],
	  daisyui: {
		themes: ["light", "dark", "cupcake"],
		"fontFamily": "Helvetica", // Set Helvetica in Daisy UI theme
	  },
};
