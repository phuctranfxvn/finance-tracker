import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Wallet, Fingerprint } from "lucide-react";
import { startAuthentication } from '@simplewebauthn/browser';

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await axios.post("/api/auth/login", { username, password });
            login(res.data.token, res.data.user);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.error || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasskeyLogin = async () => {
        try {
            setError("");
            setIsLoading(true);

            // 1. Get options
            const optsRes = await axios.post('/api/auth/passkey/login/options');
            const options = optsRes.data;

            // 2. Browser interaction
            const authResp = await startAuthentication({ optionsJSON: options });

            // 3. Verify
            const verifyRes = await axios.post('/api/auth/passkey/login/verify', {
                response: authResp,
                challenge: options.challenge
            });

            if (verifyRes.data.verified) {
                login(verifyRes.data.token, verifyRes.data.user);
                navigate("/");
            }
        } catch (err: any) {
            console.error(err);
            setError("Passkey login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-[var(--primary)] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 mb-4">
                        <Wallet size={32} strokeWidth={3} />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome Back</h1>
                    <p className="text-[var(--text-secondary)]">Sign in to manage your finances</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <div className="p-3 bg-red-100 text-red-600 rounded-xl text-sm font-medium text-center">{error}</div>}

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full h-12 bg-gray-50 rounded-xl px-4 font-medium text-[var(--text-primary)] outline-none border border-transparent focus:bg-white focus:border-[var(--primary)] transition-all"
                            placeholder="username"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 bg-gray-50 rounded-xl px-4 font-medium text-[var(--text-primary)] outline-none border border-transparent focus:bg-white focus:border-[var(--primary)] transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 w-full h-14 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? "Signing in..." : "Sign In"}
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={isLoading}
                        className="w-full h-14 bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-[var(--text-primary)] font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Fingerprint size={20} className="text-[var(--primary)]" />
                        Sign in with Passkey
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
                    Don't have an account? <Link to="/register" className="font-bold text-[var(--primary)] hover:underline">Create one</Link>
                </div>
            </div>
        </div>
    );
}
