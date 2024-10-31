import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage } from "../pages/FirebaseConfig";

interface ProfileBannerProps {
	currentUsername: string;
}

const ProfileBanner: React.FC<ProfileBannerProps> = ({ currentUsername }) => {
	const [bannerUrl, setBannerUrl] = useState<string | null>(null);

	useEffect(() => {
		const fetchBannerUrl = async () => {
			try {
				const userDocRef = doc(db, "users", currentUsername);
				const userDoc = await getDoc(userDocRef);

				if (userDoc.exists() && userDoc.data().bannerUrl) {
					const bannerRef = ref(storage, userDoc.data().bannerUrl);
					const url = await getDownloadURL(bannerRef);
					setBannerUrl(url);
				} else {
					const fallbackBanner = `https://ui-avatars.com/api/?name=${encodeURIComponent(
						currentUsername,
					)}&background=random&size=600`;
					setBannerUrl(fallbackBanner);
					console.log("No banner URL found, using fallback avatar.");
				}
			} catch (error) {
				console.error("Error fetching banner:", error);
			}
		};

		fetchBannerUrl();
	}, [currentUsername]);

	return (
		<div className="relative w-full h-36 rounded-t-lg overflow-hidden bg-neutral-800">
			{bannerUrl ? (
				<img
					src={bannerUrl}
					alt="User Banner"
					className="object-cover w-full h-full"
				/>
			) : (
				<div className="flex justify-center items-center text-gray-500">
					No Banner Available
				</div>
			)}
		</div>
	);
};

export default ProfileBanner;
