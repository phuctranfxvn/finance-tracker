import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Wallet } from "lucide-react";

export default function Register() {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
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
            const res = await axios.post("/api/auth/register", { name, username, email, password });
            login(res.data.token, res.data.user);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.error || "Registration failed");
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
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Account</h1>
                    <p className="text-[var(--text-secondary)]">Start managing your wealth today</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <div className="p-3 bg-red-100 text-red-600 rounded-xl text-sm font-medium text-center">{error}</div>}

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-12 bg-gray-50 rounded-xl px-4 font-medium text-[var(--text-primary)] outline-none border border-transparent focus:bg-white focus:border-[var(--primary)] transition-all"
                            placeholder="John Doe"
                        />
                    </div>

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
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 bg-gray-50 rounded-xl px-4 font-medium text-[var(--text-primary)] outline-none border border-transparent focus:bg-white focus:border-[var(--primary)] transition-all"
                            placeholder="you@example.com"
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
                        {isLoading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
                    Already have an account? <Link to="/login" className="font-bold text-[var(--primary)] hover:underline">Log in</Link>
                </div>
            </div>
        </div>
    );
}
