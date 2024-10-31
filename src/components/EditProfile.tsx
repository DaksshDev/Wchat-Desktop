import React, { useState, useEffect } from "react";
import { db, storage } from "../pages/FirebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FaEdit } from "react-icons/fa";

interface EditProfileProps {
  currentUsername: string | null;
  onClose: () => void;
}

const EditProfile: React.FC<EditProfileProps> = ({
  currentUsername,
  onClose,
}) => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [newGender, setNewGender] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newPronouns, setNewPronouns] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    youtube: "",
    twitter: "",
    instagram: "",
    discord: "",
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (currentUsername) {
        const userDocRef = doc(db, "users", currentUsername);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
          setNewGender(userDoc.data().gender || "");
          setNewAge(userDoc.data().age || "");
          setNewPronouns(userDoc.data().pronouns || "");
          setSocialLinks({
            youtube: userDoc.data().socialLinks?.youtube || "",
            twitter: userDoc.data().socialLinks?.twitter || "",
            instagram: userDoc.data().socialLinks?.instagram || "",
            discord: userDoc.data().socialLinks?.discord || "",
          });
        } else {
          console.log("User does not exist");
        }
      }
      setLoading(false);
    };
    fetchUserInfo();
  }, [currentUsername]);

  const handleImageUpload = async (
    file: File | null,
    type: "banner" | "profile"
  ) => {
    if (!file || !currentUsername) return;
    const fileRef = ref(storage, `${type}/${currentUsername}/${type}.png`);
    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);
    await updateDoc(doc(db, "users", currentUsername), {
      [`${type}Url`]: fileUrl,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUsername) {
      const updatedData: any = {
        gender: newGender,
        age: newAge,
        pronouns: newPronouns,
        socialLinks,
      };
      if (bannerFile) await handleImageUpload(bannerFile, "banner");
      if (profileFile) await handleImageUpload(profileFile, "profile");
      await updateDoc(doc(db, "users", currentUsername), updatedData);
      setUnsavedChanges(false);
      onClose();
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setUnsavedChanges(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="modal modal-open fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-lg flex items-center justify-center">
      <div className="modal-box w-full max-w-4xl bg-neutral-800 text-white rounded-lg shadow-2xl p-8">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">
          Edit Profile
        </h2>

        {/* Banner */}
        <div className="relative mb-6 group">
          <img
            src={userInfo?.bannerUrl || "default-banner-url"}
            alt="Banner"
            className="w-full h-40 rounded-lg object-cover cursor-pointer group-hover:opacity-90"
            onClick={() => document.getElementById("banner-input")?.click()}
          />
          <FaEdit className="absolute top-4 right-4 text-gray-200 opacity-0 group-hover:opacity-100" />
          <input
            id="banner-input"
            title="Change Banner"
            type="file"
            accept="image/*"
            onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>

        {/* Profile Picture */}
        <div className="absolute top-40 left-1/2 transform -translate-x-1/2 group">
          <div
            className="w-32 h-32 rounded-full border-4 border-neutral-900 overflow-hidden cursor-pointer"
            onClick={() => document.getElementById("profile-input")?.click()}
          >
            <img
              src={userInfo?.profilePicUrl || "default-pfp-url"}
              alt="Profile"
              className="w-full h-full object-cover group-hover:opacity-90"
            />
            <FaEdit className="absolute bottom-0 right-0 mb-4 mr-4 text-gray-200 opacity-0 group-hover:opacity-100" />
          </div>
          <input
            id="profile-input"
            title="ChangeProfileImage"
            type="file"
            accept="image/*"
            onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="gender" className="block text-gray-400 mb-2">
                Gender:
              </label>
              <input
                type="text"
                id="gender"
                value={newGender}
                onChange={(e) => handleInputChange(setNewGender, e.target.value)}
                className="input input-bordered w-full text-gray-200 bg-neutral-700 placeholder-gray-500 rounded-lg"
                placeholder="Enter gender"
              />
            </div>
            <div>
              <label htmlFor="age" className="block text-gray-400 mb-2">
                Age:
              </label>
              <input
                type="number"
                id="age"
                value={newAge}
                onChange={(e) => handleInputChange(setNewAge, e.target.value)}
                className="input input-bordered w-full text-gray-200 bg-neutral-700 placeholder-gray-500 rounded-lg"
                placeholder="Enter age"
              />
            </div>
            <div>
              <label htmlFor="pronouns" className="block text-gray-400 mb-2">
                Pronouns:
              </label>
              <input
                type="text"
                id="pronouns"
                value={newPronouns}
                onChange={(e) => handleInputChange(setNewPronouns, e.target.value)}
                className="input input-bordered w-full text-gray-200 bg-neutral-700 placeholder-gray-500 rounded-lg"
                placeholder="Enter pronouns"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">Social Links:</label>
              {["YouTube", "Twitter", "Instagram", "Discord"].map(
                (platform, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={(socialLinks as any)[platform.toLowerCase()]}
                    onChange={(e) =>
                      handleInputChange(setSocialLinks, {
                        ...socialLinks,
                        [platform.toLowerCase()]: e.target.value,
                      })
                    }
                    className="input input-bordered w-full mb-2 text-gray-200 bg-neutral-700 placeholder-gray-500 rounded-lg"
                    placeholder={`${platform} link`}
                  />
                )
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end mt-8">
            {unsavedChanges && (
              <button
                type="submit"
                className="btn bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-500 transition duration-300"
              >
                Save Changes
              </button>
            )}
            <button
              type="button"
              className="btn bg-red-600 text-white font-semibold px-6 py-2 ml-4 rounded-lg hover:bg-red-500 transition duration-300"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
