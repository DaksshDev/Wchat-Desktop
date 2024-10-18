Wchat A CHAT APP FOR GAMERS

IN DEVELOPMENT!!!!!!! [======>  70%   ]

for setup create filecalled FirebaseConfig.js in pages folder

add this-
// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import Firebase storage
import { getDatabase } from "firebase/database"; // Import Firebase Realtime Database

var firebaseConfig = {
	\\all your firebase api keys
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Initialize Firebase storage
export const rtdb = getDatabase(app); // Initialize Firebase Realtime Database

export default firebaseConfig;
