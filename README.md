<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wchat README</title>
</head>
<body>

<h1 align="center">Wchat</h1>
<p align="center">🕹️ <b>A Chat App for Gamers</b></p>

<h3 align="center">🚧 IN DEVELOPMENT 🚧</h3>
<p align="center">[======> 70% Complete]</p>

<hr>

<h2>Overview</h2>
<p>Wchat is a chat application tailored for gamers, providing real-time communication with a focus on a smooth user experience and gaming-friendly features. Stay connected with your friends, share moments, and coordinate gameplay through a modern chat interface.</p>

<hr>

<h2>⚙️ Features (Planned/Implemented)</h2>
<ul>
    <li>Real-time messaging powered by Firebase</li>
    <li>User authentication with email/password and social providers</li>
    <li>Cloud Storage for profile pictures and shared files</li>
    <li>Friends List Management</li>
    <li>Cross-platform Support</li>
</ul>

<hr>

<h2>📖 Setup Instructions</h2>

<h3>Step 1: Clone the Repository</h3>
<pre><code>
git clone https://github.com/your-username/wchat.git
cd wchat
</code></pre>

<h3>Step 2: Create <code>firebaseConfig.js</code></h3>
<p>Inside the <code>pages</code> folder, create a file named <code>firebaseConfig.js</code>.</p>

<pre><code>
// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Firebase Storage
import { getDatabase } from "firebase/database"; // Firebase Realtime Database

// Replace with your Firebase configuration
var firebaseConfig = {
  // Add your Firebase API keys here
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Initialize Storage
export const rtdb = getDatabase(app); // Initialize Realtime Database
export const Tenor = (""); // Enter your Tenor apikey here. Get One from Google Cloud

export default firebaseConfig;
</code></pre>

<h3>Step 3: Install Dependencies</h3>
<pre><code>
npm install
</code></pre>

<h3>Step 4: Run the App</h3>
<pre><code>
npm run dev
</code></pre>

<hr>

<h2>🤝 Contributing</h2>
<p>Contributions are welcome! Feel free to fork the repository and submit a pull request with your improvements.</p>

<hr>

<h2>📄 License</h2>
<p>This project is licensed under the MIT License – see the <a href="LICENSE">LICENSE</a> file for details.</p>

<hr>

<h2>📧 Contact</h2>
<p>For any questions or suggestions, feel free to reach out to:</p>
<ul>
    <li><b>Discord:</b> YourUsername#1234</li>
    <li><b>Twitter:</b> <a href="https://twitter.com/your_twitter_handle">@your_twitter_handle</a></li>
</ul>

</body>
</html>
