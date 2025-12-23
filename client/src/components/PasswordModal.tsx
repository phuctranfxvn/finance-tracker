import { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PasswordModal({ isOpen, onClose, onSuccess }: PasswordModalProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { token } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(
                '/api/auth/verify-password',
                { password },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                onSuccess();
                onClose();
                setPassword('');
            } else {
                setError('Incorrect password');
            }
        } catch (err) {
            setError('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                <ShieldCheck size={20} />
                            </div>
                            <h3 className="font-bold text-lg">Verify Identity</h3>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 mb-6">
                        Please enter your current password to reveal hidden transaction details.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold text-gray-900"
                                placeholder="••••••••"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{error}</p>}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!password || loading}
                                className={clsx(
                                    "flex-1 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-95",
                                    loading || !password ? "bg-gray-300" : "bg-orange-500 hover:bg-orange-600 shadow-orange-200"
                                )}
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                Confirm
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
