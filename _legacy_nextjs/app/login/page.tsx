"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Fingerprint, Apple } from "lucide-react";
import clsx from "clsx";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        // Simulate Passkey / Network delay
        setTimeout(() => {
            // Set a dummy cookie
            document.cookie = "auth=true; path=/";
            router.push("/");
        }, 1500);
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-[var(--background)] relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-400/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="glass-panel p-10 rounded-[2.5rem] w-full max-w-md flex flex-col items-center gap-8 relative z-10 shadow-2xl">
                <div className="w-20 h-20 bg-[var(--primary)] rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200 mb-2">
                    <Lock className="text-white" size={40} />
                </div>

                <div className="text-center">
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Welcome Back</h1>
                    <p className="text-[var(--text-secondary)] mt-2">Secure Finance Management</p>
                </div>

                <div className="w-full flex flex-col gap-4 mt-4">
                    <button
                        onClick={handleLogin}
                        className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-gray-900 transition-all active:scale-95 shadow-lg"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Apple size={24} />
                                Sign in with Apple
                            </>
                        )}
                    </button>

                    <button className="w-full h-14 bg-white text-[var(--text-primary)] border border-[var(--border)] rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-[var(--surface-hover)] transition-all active:scale-95">
                        <Fingerprint size={24} className="text-[var(--primary)]" />
                        Use Passkey
                    </button>
                </div>

                <p className="text-xs text-[var(--text-tertiary)] max-w-xs text-center">
                    By signing in, you agree to our Terms of Service and Privacy Policy. Your financial data is encrypted.
                </p>
            </div>
        </div>
    );
}
