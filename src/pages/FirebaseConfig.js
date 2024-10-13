// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import Firebase storage
import { getDatabase } from "firebase/database"; // Import Firebase Realtime Database

var firebaseConfig = {
	apiKey: "AIzaSyBV-Q8deoONr6IBN-otlcMrmOTPkCSDM-c",
	authDomain: "wchat-main.firebaseapp.com",
	projectId: "wchat-main",
	storageBucket: "wchat-main.appspot.com",
	messagingSenderId: "49910636322",
	appId: "1:49910636322:web:14c4473144f59c555f0f7b",
	measurementId: "G-L65C7XPYHK",
	databaseURL: "https://wchat-main-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Initialize Firebase storage
export const rtdb = getDatabase(app); // Initialize Firebase Realtime Database

export default firebaseConfig;
