import { useEffect, FC } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import Asthetic from "../components/Asthetic";

export const OfflinePage: FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleOnline = () => {
            if (navigator.onLine) {
                navigate("/App"); // Redirect to app page when online
            }
        };

        // Listen for online event to redirect user
        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("online", handleOnline);
        };
    }, [navigate]);

    return (
        <Layout>
            <div className="fixed w-screen flex flex-col items-center justify-center h-screen select-none overflow-hidden">
                {/* Background aesthetic */}
                <div className="absolute inset-0 z-[-1]">
                    <Asthetic />
                </div>

                {/* Blurred container */}
                <div className="bg-black bg-opacity-40 backdrop-blur-lg rounded-xl p-8 text-center">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Connection Lost
                    </h1>
                    <p className="text-lg text-gray-300 mb-8">
                        Oops! Looks like our chat just ghosted you. 👻
                    </p>
                    
                    {/* Spinner and message */}
                    <div className="flex flex-col items-center">
                        <div className="loader w-20 h-20 border-8 border-t-8 border-white border-t-black rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-300 text-center">
                            Check your internet connection and try refreshing the page.
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
