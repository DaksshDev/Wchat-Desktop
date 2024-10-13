// QRCodeGenerator.tsx
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
    userId: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ userId }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isCopied, setIsCopied] = useState(false); // State for button status (copied or not)

    const handleCopyUserId = () => {
        navigator.clipboard.writeText(userId)
            .then(() => {
                setIsCopied(true); // Change state to "Success"
                setTimeout(() => {
                    setIsCopied(false); // Revert back to "Copy" after 2 seconds
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    };

    useEffect(() => {
        const generateQRCode = async () => {
            if (canvasRef.current) {
                try {
                    await QRCode.toCanvas(canvasRef.current, userId, {
                        width: 200, // Increased width for a larger QR code
                        margin: 1,
                        color: {
                            dark: "#000000",  // QR code color
                            light: "#FFFFFF"  // Background color
                        }
                    });
                } catch (error) {
                    console.error("QR Code generation failed:", error);
                }
            }
        };
        generateQRCode();
    }, [userId]);

    return (
        <div className="qr-code-generator flex flex-col items-center justify-center p-4 rounded-lg">
        <h1 className="text-xl font-bold mb-4">QR Code for User ID</h1>
        {/* QR Code Canvas */}
        <div className="rounded-lg overflow-hidden">
            <canvas 
                ref={canvasRef} 
                className="rounded-lg" 
                style={{ width: '100%', maxWidth: '220px' }} 
            />
        </div>

        {/* User ID and Copy Button */}
        <div className="flex items-center space-x-2 mt-4">
            <b><i>{userId}</i></b>
            <button 
                onClick={handleCopyUserId}
                className="p-2 rounded-lg  hover:bg-slate-800"
            >
                {isCopied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
                        <path d="M480-44.65q-90.72 0-169.93-34.12-79.22-34.12-138.2-93.1-58.98-58.98-93.1-138.2Q44.65-389.28 44.65-480q0-90.72 34.12-170.32 34.12-79.59 93.1-138.57 58.98-58.98 138.2-92.72 79.21-33.74 169.93-33.74 44.85 0 88.05 8.67 43.21 8.66 83.78 26.75 21.19 9 26.91 31.43 5.72 22.43-7 41.63-13.72 20.2-37.15 26.03-23.44 5.84-46.35-1.92-26.37-9.33-53.24-14.37-26.87-5.04-55-5.04-134.33 0-228.25 93.8-93.92 93.8-93.92 228.37t93.92 228.37q93.92 93.8 228.25 93.8 134.09 0 228.13-93.68 94.04-93.69 94.04-227.53 0-1.05.12-1.59t.12-1.59q-.76-24.67 12.2-45.25 12.96-20.57 36.39-27.57 22.67-7 41.87 5.07 19.2 12.08 20.96 34.75.76 8.81 1.14 17.61.38 8.81.38 17.61 0 90.72-33.74 169.93-33.74 79.22-92.72 138.2-58.98 58.98-138.57 93.1Q570.72-44.65 480-44.65Zm-56.72-385.33L798.37-805.3q15.96-15.72 39.03-15.72 23.08 0 39.03 15.72 15.96 15.95 15.96 39.03 0 23.07-15.96 39.03L462.91-313.96q-16.95 17.2-39.63 17.2-22.67 0-39.63-17.2L271.48-426.13q-15.96-15.72-15.96-38.79 0-23.08 15.96-38.8 15.95-15.95 39.03-15.95 23.08 0 39.03 15.95l73.74 73.74Z"/>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
                        <path d="M375.93-211.67q-46.59 0-79.88-33.29-33.29-33.29-33.29-79.89v-481.3q0-46.6 33.29-79.89t79.88-33.29h361.31q46.59 0 79.76 33.29t33.17 79.89v481.3q0 46.6-33.17 79.89t-79.76 33.29H375.93Zm0-113.18h361.31v-481.3H375.93v481.3ZM182.76-18.74q-46.59 0-79.76-33.17t-33.17-79.76v-537.9q0-23.33 16.45-39.96 16.46-16.62 40.01-16.62 23.56 0 40.01 16.62 16.46 16.63 16.46 39.96v537.9h417.89q23.34 0 39.97 16.45 16.62 16.46 16.62 40.01 0 23.56-16.62 40.01-16.63 16.46-39.97 16.46H182.76Zm193.17-306.11v-481.3 481.3Z"/>
                    </svg>
                )}
            </button>
        </div>
    </div>
);
};
