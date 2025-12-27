import { useState, useEffect } from "react";
import { Plus, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import axios from "axios";
import CategoryManager from "../components/CategoryManager";
import BudgetManager from "../components/BudgetManager";
import { startRegistration } from '@simplewebauthn/browser';


export default function Settings() {
    const { user, login, token, logout } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const [quickAmounts, setQuickAmounts] = useState<number[]>([]);
    const [newAmount, setNewAmount] = useState("");
    const [saving, setSaving] = useState(false);
    const [wallets, setWallets] = useState<any[]>([]);
    const [defaultWalletId, setDefaultWalletId] = useState<string>("");
    const [requirePassword, setRequirePassword] = useState(false);

    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyPassword, setVerifyPassword] = useState("");
    const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        if (user?.preferences?.quick_amounts) {
            setQuickAmounts(user.preferences.quick_amounts);
        } else {
            // Default presets if none found
            setQuickAmounts([50000, 100000, 200000, 500000]);
        }
        if (user?.preferences?.defaultWalletId) {
            setDefaultWalletId(user.preferences.defaultWalletId);
        }
        // Default to false if not set
        setRequirePassword(!!user?.preferences?.requirePasswordForIncome);

    }, [user]);

    const handleTogglePrivacy = (checked: boolean) => {
        setPendingToggle(checked);
        setVerifyPassword("");
        setShowVerifyModal(true);
    };

    const handleVerifySubmit = async () => {
        if (!verifyPassword) return;
        try {
            const res = await axios.post('/api/auth/verify-password', { password: verifyPassword }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                if (pendingToggle !== null) {
                    setRequirePassword(pendingToggle);
                    await savePreferences({ requirePasswordForIncome: pendingToggle });
                }
                setShowVerifyModal(false);
            } else {
                setToast({ message: t('incorrectPassword'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('verificationFailed'), type: 'error' });
        }
    };

    useEffect(() => {
        const fetchWallets = async () => {
            try {
                const res = await axios.get("/api/wallets");
                setWallets(res.data);
            } catch (error) {
                console.error("Failed to fetch wallets", error);
            }
        };
        fetchWallets();
    }, []);

    const saveAmounts = async (amounts: number[]) => {
        setQuickAmounts(amounts);
        await savePreferences({ quick_amounts: amounts });
    };

    const saveDefaultWallet = async (walletId: string) => {
        setDefaultWalletId(walletId);
        await savePreferences({ defaultWalletId: walletId });
    };

    const savePreferences = async (newPrefs: any) => {
        if (!user || !token) return;

        setSaving(true);
        try {
            // Update local state first for responsiveness
            const updatedPreferences = { ...user.preferences, ...newPrefs };

            // Call API
            const res = await axios.put("/api/auth/profile", {
                preferences: updatedPreferences
            });

            // Update global auth state
            login(token, res.data);

        } catch (error) {
            console.error("Failed to save settings", error);
            setToast({ message: t('failedToSave'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = () => {
        const val = Number(newAmount);
        if (!val || val <= 0) return;
        if (quickAmounts.includes(val)) return alert(t('amountExists'));

        const next = [...quickAmounts, val].sort((a, b) => a - b);
        saveAmounts(next);
        setNewAmount("");
    };

    const handleRemove = (val: number) => {
        const next = quickAmounts.filter(a => a !== val);
        saveAmounts(next);
    };

    const [passkeys, setPasskeys] = useState<any[]>([]);

    useEffect(() => {
        const fetchPasskeys = async () => {
            // Since login() updates user context, we might rely on that or fetch fresh
            // But let's check if the current user object has passkeys if provided by login
            // Ideally calling /me or /profile would refresh it.
            // We can just fetch /me to be sure.
            if (token) {
                try {
                    const res = await axios.get("/api/auth/me", {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data.passkeys) {
                        setPasskeys(res.data.passkeys);
                    }
                } catch (err) {
                    console.error("Failed to fetch passkeys", err);
                }
            }
        };
        fetchPasskeys();
    }, [token, user]); // Refresh if user changes

    // ... existing savePreferences ...

    const handleRegisterPasskey = async () => {
        try {
            // 1. Get options
            const optsRes = await axios.post('/api/auth/passkey/register/options', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const options = optsRes.data;

            // 2. Browser interaction
            const attResp = await startRegistration({ optionsJSON: options });

            // 3. Verify
            const verifyRes = await axios.post('/api/auth/passkey/register/verify', {
                response: attResp
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (verifyRes.data.verified) {
                setToast({ message: t('passkeyRegistered'), type: 'success' });
                // Refresh list
                const meRes = await axios.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
                setPasskeys(meRes.data.passkeys || []);
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('passkeyRegisterFail'), type: 'error' });
        }
    };

    const handleDeletePasskey = (id: string) => {
        setDeleteConfirmationId(id);
    };

    const proceedDeletePasskey = async () => {
        if (!deleteConfirmationId) return;
        try {
            await axios.delete(`/api/auth/passkeys/${deleteConfirmationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPasskeys(prev => prev.filter(p => p.id !== deleteConfirmationId));
            setDeleteConfirmationId(null);
        } catch (err) {
            console.error(err);
            setToast({ message: t('passkeyDeleteFail'), type: 'error' });
        }
    };


    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-3xl font-bold">{t('settings')}</h1>

            {/* Language Settings */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">🌐</span>
                        {t('language')}
                    </h2>
                </div>
                <p className="text-sm text-gray-500 mb-6">{t('selectLanguage')}</p>

                <div className="flex gap-4">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all border-2 ${language === 'en'
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md"
                            : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => setLanguage('vi')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all border-2 ${language === 'vi'
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md"
                            : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        Tiếng Việt
                    </button>
                </div>
            </div>

            {/* Quick Amounts Config */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">⚡</span>
                        {t('quickExpensePresets')}
                    </h2>
                    {saving && <span className="text-xs text-gray-400">{t('saving')}</span>}
                </div>

                <p className="text-sm text-gray-500 mb-6">{t('managePresets')}</p>

                <div className="flex flex-wrap gap-3 mb-6">
                    {quickAmounts.map(amount => (
                        <div key={amount} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-700">
                            {amount.toLocaleString()} ₫
                            <button onClick={() => handleRemove(amount)} className="text-gray-400 hover:text-red-500">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4 items-center max-w-md">
                    <input
                        type="number"
                        placeholder="Enter amount (e.g. 50000)"
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        className="flex-1 h-12 bg-gray-50 rounded-xl px-4 font-bold border border-gray-200 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newAmount}
                        className="h-12 w-12 bg-black text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Default Wallet Config */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">💳</span>
                        {t('defaultQuickWallet')}
                    </h2>
                </div>
                <p className="text-sm text-gray-500 mb-6">{t('selectDefaultWallet')}</p>

                <div className="flex flex-wrap gap-3">
                    {wallets.map(wallet => (
                        <button
                            key={wallet.id}
                            onClick={() => saveDefaultWallet(wallet.id)}
                            className={`px-4 py-3 rounded-xl font-bold border-2 transition-all text-sm flex flex-col items-start gap-1 min-w-[120px] ${defaultWalletId === wallet.id
                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                                : "border-gray-100 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            <span>{wallet.name}</span>
                            <span className="text-[10px] opacity-70 font-normal">
                                {Number(wallet.balance).toLocaleString()} {wallet.currency}
                            </span>
                        </button>
                    ))}
                    {wallets.length === 0 && <p className="text-gray-400 italic">{t('noWallets')}</p>}
                </div>
            </div>

            {/* Privacy & Security */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">🔒</span>
                        {t('privacySecurity')}
                    </h2>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                        <h3 className="font-bold text-gray-900">{t('requirePasswordIncome')}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('requirePasswordDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={requirePassword}
                            onChange={(e) => handleTogglePrivacy(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">{t('passkeys')}</h3>
                            <p className="text-sm text-gray-500">{t('passkeyDesc')}</p>
                        </div>
                        <button
                            onClick={handleRegisterPasskey}
                            className="px-4 py-2 bg-black text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                            <Plus size={14} />
                            {t('addPasskey')}
                        </button>
                    </div>

                    {passkeys.length > 0 ? (
                        <div className="space-y-3">
                            {passkeys.map((p: any) => (
                                <div key={p.id} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-sm">Passkey</span>
                                        <span className="text-[10px] text-gray-400">{t('passkeyCreated')}: {new Date(p.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeletePasskey(p.id)}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center gap-1 text-[10px] font-bold">
                                            <X size={12} /> {t('remove')}
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                            <p className="text-sm text-gray-400">{t('noPasskeys')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Budget Manager */}
            <hr className="border-gray-200" />
            <div>
                <BudgetManager />
            </div>

            {/* Category Manager */}
            <hr className="border-gray-200" />



            <div>
                <h2 className="text-xl font-bold mb-6">{t('manageCategories')}</h2>
                <CategoryManager />
            </div>

            {/* Logout Section */}
            <div className="mt-8">
                <button
                    onClick={logout}
                    className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <LogOut size={20} />
                    {t('logout')}
                </button>
                <p className="text-center text-xs text-gray-400 mt-4">
                    Version 1.0.0
                </p>
            </div>

            {/* Password Verification Modal */}
            {showVerifyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('verifyPassword')}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t('verifyPasswordDesc')}</p>

                        <input
                            type="password"
                            autoFocus
                            placeholder={t('currentPassword')}
                            value={verifyPassword}
                            onChange={(e) => setVerifyPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleVerifySubmit()}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold mb-6 focus:outline-none focus:border-black transition-colors"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowVerifyModal(false)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleVerifySubmit}
                                disabled={!verifyPassword}
                                className="flex-1 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmationId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('removePasskeyTitle')}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t('removePasskeyMsg')}</p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmationId(null)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={proceedDeletePasskey}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
                            >
                                {t('remove')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm ${toast.type === 'success' ? 'bg-black text-white' : 'bg-red-500 text-white'
                        }`}>
                        {toast.type === 'success' ? <div className="w-2 h-2 rounded-full bg-green-400"></div> : <X size={16} />}
                        {toast.message}
                    </div>
                </div>
            )}
        </div >
    );
}
