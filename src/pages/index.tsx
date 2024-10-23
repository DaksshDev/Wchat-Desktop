import { FC, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "./FirebaseConfig";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
} from "firebase/auth";
import {
	doc,
	setDoc,
	getDoc,
	query,
	where,
	collection,
	getDocs,
	Timestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Layout } from "../components/Layout";
import Asthetic from "../components/Asthetic";


export const IndexPage: FC = () => {
	const [isLogin, setIsLogin] = useState(false);
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [profilePic, setProfilePic] = useState<File | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [gender, setGender] = useState("");
	const [age, setAge] = useState("");
	const [pronouns, setPronouns] = useState("");
	const [description, setDescription] = useState("");

	const navigate = useNavigate();

    useEffect(() => {
        const storedUsername = localStorage.getItem("username");
        if (storedUsername) {
            navigate("App"); // Redirect to AppPage if the username exists
        }
    }, [navigate]);


	// Check if username exists
	const checkUsernameExists = async (username: string): Promise<boolean> => {
		const docRef = doc(db, "users", username);
		const docSnap = await getDoc(docRef);
		return docSnap.exists();
	};

	// Function to retrieve the username using userId
	const fetchUsernameByUserId = async (userId: string) => {
		const q = query(collection(db, "users"), where("userId", "==", userId));
		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			const userData = querySnapshot.docs[0].data();
			return userData.username;
		}
		return null;
	};

	const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			if (isLogin) {
				const userCredential = await signInWithEmailAndPassword(
					auth,
					email,
					password,
				);
				const userId = userCredential.user.uid;
				const user = userCredential.user;
                const token = await user.getIdToken(); // Retrieve token from the user object

				// Fetch username using the userId and store in localStorage
				const fetchedUsername = await fetchUsernameByUserId(userId);
				if (fetchedUsername) {
					setUsername(fetchedUsername);
					localStorage.setItem("username", fetchedUsername);
				} else {
					setError("Username not found for this account.");
				}

				navigate("/App");
			} else {
				const usernameExists = await checkUsernameExists(username);
				if (usernameExists) {
					setError("Username already exists!");
				} else {
					// Show the modal for additional details, do NOT create the Firebase user yet
					setShowModal(true);
				}
			}
		} catch (error: any) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	// Handle modal form submission
	const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
	
		try {
			// Create Firebase Auth user only after the modal form has been submitted
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				email,
				password,
			);
			const userId = userCredential.user.uid;
			const user = userCredential.user;
	
			// Validate profile picture size (no larger than 10MB)
			if (profilePic && profilePic.size > 10 * 1024 * 1024) {
				setError("Profile picture must be smaller than 10MB.");
				setLoading(false);
				return;
			}
	
			let profilePicUrl = "";
	
			if (profilePic) {
				// Upload profile picture to Firebase Storage with progress tracking
				const profilePicRef = ref(storage, `users/${username}/profilePicture`);
				const uploadTask = uploadBytesResumable(profilePicRef, profilePic);
	
				uploadTask.on(
					"state_changed",
					(snapshot) => {
						const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
						setUploadProgress(Math.floor(progress));
					},
					(error) => {
						setError("Error uploading image: " + error.message);
					},
					async () => {
						profilePicUrl = await getDownloadURL(uploadTask.snapshot.ref);
						await saveUserData(profilePicUrl, userId); // Save user data after successful upload
					},
				);
			} else {
				// Set default profile picture using UI Avatars API
				profilePicUrl = `https://ui-avatars.com/api/?name=${username}&background=random`;
				await saveUserData(profilePicUrl, userId);
			}
		} catch (error: any) {
			setError(error.message);
		} finally {
			setLoading(false);
			setShowModal(false);
		}
	};
	
	// Function to save user data in Firestore
	const saveUserData = async (profilePicUrl: string, userId: string) => {
		await setDoc(doc(db, "users", username), {
			username,
			userId,
			gender,
			age,
			pronouns,
			description,
			profilePicUrl,
			creationDate: Timestamp.now(),
		});
		setLoading(false);
		setShowModal(false);
		localStorage.setItem("username", username);
		navigate("/App");
	};

	const toggleForm = () => {
		setIsLogin(!isLogin);
		setError(null);
	};

	return (
		<Layout>
			<Asthetic /> {/* Use Aesthetic as the background */}
			<div className="fixed w-screen h-screen flex items-center justify-center overflow-hidden">
				<div className="w-full max-w-md p-6 space-y-6 bg-black bg-opacity-50 backdrop-blur-md shadow-lg rounded-lg">
					<h2 className="text-center text-2xl font-bold">
						{isLogin ? "Welcome Back!👋" : "Create Account"}
					</h2>

					{error && (
						<div className="alert alert-error shadow-lg">
							<div>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="stroke-current flex-shrink-0 h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
								<span>{error}</span>
							</div>
						</div>
					)}

					<form onSubmit={handleFormSubmit}>
						<div className="form-control">
							<label className="label">
								<span className="label-text">Email</span>
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter your email"
								className="input input-bordered w-full"
								required
							/>
						</div>

						{!isLogin && (
							<div className="form-control">
								<label className="label">
									<span className="label-text">Username</span>
								</label>
								<input
									type="text"
									value={username}
									onChange={(e) =>
										setUsername(e.target.value)
									}
									placeholder="Enter your username"
									className="input input-bordered w-full"
									required
								/>
							</div>
						)}

						<div className="form-control">
							<label className="label">
								<span className="label-text">Password</span>
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter your password"
								className="input input-bordered w-full"
								required
							/>
						</div>

						<div className="form-control mt-6">
							<button
								className={`btn btn-primary w-full ${
									loading ? "loading loading-sm loading-spinner" : ""
								}`}
								disabled={loading}
							>
								{isLogin ? "Login" : "Register"}
							</button>
						</div>
					</form>

					<p className="text-center">
						{isLogin
							? "Don't have an account?"
							: "Already have an account?"}{" "}
						<button
							type="button"
							className="btn btn-link"
							onClick={toggleForm}
						>
							{isLogin ? "Register" : "Login"}
						</button>
					</p>
				</div>
			</div>

			{/* Modal for additional details */}
			{showModal && (
				<div className="modal modal-open">
					<div className="modal-box bg-base-100">
						<h3 className="font-bold text-lg">One More Step...</h3>
						<form onSubmit={handleModalSubmit}>
							{/* Profile Picture Upload */}
							<div className="form-control">
								<label className="label">
									<span className="label-text">
										Profile Picture
									</span>
								</label>
								<div className="flex justify-center items-center">
									<label className="avatar">
										<div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 cursor-pointer">
											{profilePic ? (
												<img
													src={URL.createObjectURL(
														profilePic,
													)}
													alt="Profile Preview"
													className="object-cover w-full h-full rounded-full"
												/>
											) : (
												<span className="flex items-center justify-center h-full text-gray-500">
													Upload
												</span>
											)}
										</div>
										<input
											type="file"
											accept="image/*"
											className="hidden"
											onChange={(e) =>
												setProfilePic(
													e.target.files
														? e.target.files[0]
														: null,
												)
											}
										/>
									</label>
								</div>
								<br></br>
								{uploadProgress > 0 && (
									<progress
										className="progress progress-info mt-2"
										value={uploadProgress}
										max="100"
									>
										{uploadProgress}%
									</progress>
								)}
							</div>
							<span className=" label-text text-warning justify-center items-center text-center">If profile picture Is not uploaded then It will use <b>default profile picture</b></span>

							{/* Gender Dropdown */}
							<div className="form-control">
								<label className="label">
									<span className="label-text">Gender</span>
								</label>
								<select
									title="gender"
									value={gender}
									onChange={(e) => setGender(e.target.value)}
									className="select select-bordered w-full"
									required
								>
									<option value="" disabled>
										Select Gender
									</option>
									<option value="Male">Male</option>
									<option value="Female">Female</option>
									<option value="Other">Other</option>
								</select>
							</div>

							{/* Age */}
							<div className="form-control">
								<label className="label">
									<span className="label-text">Age</span>
								</label>
								<input
									type="number"
									value={age}
									onChange={(e) => setAge(e.target.value)}
									placeholder="Enter your age"
									className="input input-bordered w-full"
									required
								/>
							</div>

							{/* Pronouns */}
							<div className="form-control">
								<label className="label">
									<span className="label-text">Pronouns</span>
								</label>
								<input
									type="text"
									value={pronouns}
									onChange={(e) =>
										setPronouns(e.target.value)
									}
									placeholder="Enter your pronouns"
									className="input input-bordered w-full"
									required
								/>
							</div>

							{/* Description */}
							<div className="form-control">
								<label className="label">
									<span className="label-text">
										Description
									</span>
								</label>
								<textarea
									value={description}
									onChange={(e) =>
										setDescription(e.target.value)
									}
									placeholder="Tell us a bit about yourself"
									className="textarea textarea-bordered w-full"
									required
								></textarea>
							</div>

							{/* Save Button */}
							<div className="modal-action">
								<button
									type="submit"
									className="btn btn-primary"
									disabled={loading}
								>
									{loading ? (
										<span className="loading loading-dots loading-md"></span>
									) : (
										"Save"
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</Layout>
	);
};

