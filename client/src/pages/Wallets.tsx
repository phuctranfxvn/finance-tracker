import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Plus, Wallet as WalletIcon, Star, PenLine, RotateCcw, Landmark, Trash2, History } from "lucide-react";
import { cn } from "../lib/utils";

interface Wallet {
    id: string;
    name: string;
    type: "WALLET" | "BANK";
    balance: number;
    currency: string;
    bankName?: string;
}

const VIETNAM_BANKS = [
    { code: "VCB", name: "Vietcombank", logo: "/banks/VCB.jpeg" },
    { code: "MB", name: "MB Bank", logo: "/banks/MB.jpeg" },
    { code: "TCB", name: "Techcombank", logo: "/banks/TCB.jpeg" },
    { code: "VPB", name: "VPBank", logo: "/banks/VPB.jpeg" },
    { code: "CTG", name: "VietinBank", logo: "/banks/CTG.jpeg" }, // VietinBank is ICB in VietQR
    { code: "ACB", name: "ACB", logo: "/banks/ACB.jpeg" },
    { code: "BIDV", name: "BIDV", logo: "/banks/BIDV.jpeg" },
    { code: "HDB", name: "HDBank", logo: "/banks/HDB.jpeg" },
    { code: "STB", name: "Sacombank", logo: "/banks/STB.jpeg" },
    { code: "TPB", name: "TPBank", logo: "/banks/TPB.jpeg" },
    { code: "VIB", name: "VIB", logo: "/banks/VIB.jpeg" },
    { code: "MSB", name: "MSB", logo: "/banks/MSB.jpeg" },
    { code: "OCB", name: "OCB", logo: "/banks/OCB.jpeg" },
    { code: "MOMO", name: "Momo", logo: "/banks/MOMO.jpeg" },
    { code: "ZALOPAY", name: "ZaloPay", logo: "/banks/ZALOPAY.jpeg" },
    { code: "SHOPEEPAY", name: "ShopeePay", logo: "/banks/SHOPEEPAY.jpeg" },
];

export default function Wallets() {
    const { user, login, token } = useAuth(); // Use Auth Context
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [defaultWalletId, setDefaultWalletId] = useState<string>("");

    useEffect(() => {
        if (user?.preferences?.defaultWalletId) {
            setDefaultWalletId(user.preferences.defaultWalletId);
        }
    }, [user]);

    // New Wallet Form State
    const [newWalletName, setNewWalletName] = useState("");
    const [newWalletType, setNewWalletType] = useState<"WALLET" | "BANK">("WALLET");
    const [newWalletCurrency, setNewWalletCurrency] = useState("VND");
    const [newWalletBalance, setNewWalletBalance] = useState("");
    const [selectedBankCode, setSelectedBankCode] = useState("");
    const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

    const fetchWallets = async () => {
        try {
            const res = await axios.get("/api/wallets");
            setWallets(res.data);
        } catch (error) {
            console.error("Failed to fetch wallets", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallets();
    }, []);

    const handleSubmitWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !token) return; // Guard

        try {
            if (editingWallet) {
                // Update implementation
                await axios.put(`/api/wallets/${editingWallet.id}`, {
                    name: newWalletName,
                    type: newWalletType,
                    currency: newWalletCurrency,
                    bankName: selectedBankCode || undefined,
                });
            } else {
                // Create implementation
                await axios.post("/api/wallets", {
                    name: newWalletName,
                    type: newWalletType,
                    currency: newWalletCurrency,
                    balance: Number(newWalletBalance) || 0,
                    bankName: selectedBankCode || undefined,
                });
            }

            setIsModalOpen(false);
            setEditingWallet(null);
            fetchWallets();
            // Reset form
            setNewWalletName("");
            setNewWalletBalance("");
            setSelectedBankCode("");
            setNewWalletType("WALLET");
        } catch (error) {
            alert(editingWallet ? "Failed to update wallet" : "Failed to create wallet");
        }
    };

    const handleOpenEdit = (wallet: Wallet) => {
        setEditingWallet(wallet);
        setNewWalletName(wallet.name);
        setNewWalletType(wallet.type);
        setNewWalletCurrency(wallet.currency);
        if (wallet.bankName) setSelectedBankCode(wallet.bankName);
        setIsModalOpen(true);
    };

    const handleSetDefault = async (walletId: string) => {
        if (!user || !token) return;
        setDefaultWalletId(walletId);

        try {
            const updatedPreferences = { ...user.preferences, defaultWalletId: walletId };
            const res = await axios.put("/api/auth/profile", {
                preferences: updatedPreferences
            });
            login(token, res.data); // Update context
        } catch (error) {
            console.error("Failed to set default wallet", error);
        }
    };

    // Balance Adjustment State
    const [adjustWalletId, setAdjustWalletId] = useState<string | null>(null);
    const [adjustBalanceValue, setAdjustBalanceValue] = useState("");

    const handleOpenAdjust = (wallet: Wallet) => {
        setAdjustWalletId(wallet.id);
        setAdjustBalanceValue(wallet.balance.toString());
    };

    const handleConfirmAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustWalletId || !user || !token) return;

        const wallet = wallets.find(w => w.id === adjustWalletId);
        if (!wallet) return;

        const newBalance = Number(adjustBalanceValue);
        const currentBalance = Number(wallet.balance);
        const diff = newBalance - currentBalance;

        if (diff === 0) {
            setAdjustWalletId(null);
            return;
        }

        try {
            await axios.post("/api/transactions", {
                amount: Math.abs(diff),
                type: diff > 0 ? 'INCOME' : 'EXPENSE',
                category: t('adjustment'), // Use translated string as category name for now
                accountId: adjustWalletId,
                note: t('adjustment'),
                date: new Date(),
                // userId handled by backend
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchWallets();
            setAdjustWalletId(null);
        } catch (error) {
            console.error("Failed to adjust balance", error);
            alert("Failed to adjust balance");
        }
    };

    const handleViewTransactions = (walletId: string) => {
        navigate(`/transactions?accountId=${walletId}`);
    };

    const handleDeleteWallet = async (walletId: string) => {
        if (!confirm(t('confirmDeleteWallet'))) return;

        try {
            await axios.delete(`/api/wallets/${walletId}`);
            fetchWallets();
        } catch (error: any) {
            console.error("Failed to delete wallet", error);
            if (error.response?.data?.error) {
                alert(error.response.data.error);
            } else {
                alert("Failed to delete wallet");
            }
        }
    };

    return (
        <div className="flex flex-col min-h-full gap-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('myWallets')}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">{t('manageWallets')}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-10">Loading wallets...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wallets.map((wallet) => (
                        <div
                            key={wallet.id}
                            className={cn(
                                "relative p-6 rounded-[2rem] h-48 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-xl group",
                                wallet.type === 'BANK'
                                    ? "bg-gradient-to-br from-white to-gray-50 text-gray-900 border border-gray-200"
                                    : "bg-white text-[var(--text-primary)] border border-[var(--border)]"
                            )}
                        >
                            {/* Background Pattern / Watermark for Bank Cards */}
                            {wallet.type === 'BANK' && wallet.bankName && (
                                <div className="absolute -bottom-6 -right-6 w-48 h-48 opacity-[0.25] pointer-events-none rotate-12">
                                    <img
                                        src={VIETNAM_BANKS.find(b => b.code === wallet.bankName)?.logo || "https://api.vietqr.io/img/VCB.png"}
                                        alt=""
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}

                            <div className="flex justify-between items-start z-10">
                                <div className={cn(
                                    "flex items-center justify-center w-16 h-16 rounded-2xl text-xl transition-all",
                                    wallet.type === 'BANK' ? "bg-blue-50 text-blue-500" : "bg-orange-50 text-orange-500"
                                )}>
                                    {wallet.type === 'BANK' ? <Landmark size={24} /> : <WalletIcon size={24} />}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSetDefault(wallet.id)}
                                        className={cn(
                                            "p-2 rounded-full transition-colors",
                                            defaultWalletId === wallet.id
                                                ? "bg-yellow-400 text-white shadow-lg"
                                                : "hover:bg-gray-100 text-gray-300"
                                        )}
                                        title={t('setAsDefault')}
                                    >
                                        <Star size={20} fill={defaultWalletId === wallet.id ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={() => handleOpenEdit(wallet)}
                                        className={cn(
                                            "p-2 rounded-full transition-colors hover:bg-gray-100 text-gray-300"
                                        )}
                                        title={t('editWallet')}
                                    >
                                        <PenLine size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleOpenAdjust(wallet)}
                                        className={cn(
                                            "p-2 rounded-full transition-colors hover:bg-gray-100 text-gray-300"
                                        )}
                                        title={t('adjustBalance')}
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleViewTransactions(wallet.id)}
                                        className={cn(
                                            "p-2 rounded-full transition-colors hover:bg-gray-100 text-gray-300"
                                        )}
                                        title={t('viewTransactions')}
                                    >
                                        <History size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteWallet(wallet.id)}
                                        className={cn(
                                            "p-2 rounded-full transition-colors hover:bg-red-50 text-gray-300 hover:text-red-500"
                                        )}
                                        title={t('deleteWallet')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="z-10">
                                <div className={cn("text-xs font-bold uppercase tracking-wider mb-1 opacity-70")}>
                                    {wallet.type} • {wallet.currency}
                                </div>
                                <div className="text-3xl font-bold truncate">
                                    {Number(wallet.balance).toLocaleString()} <span className="text-base font-medium opacity-50">{wallet.currency === 'VND' ? '₫' : '$'}</span>
                                </div>
                                <div className="text-sm font-medium mt-1 opacity-80">{wallet.name}</div>
                            </div>
                        </div>
                    ))}

                    {/* New Wallet Ghost Card */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="h-48 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50/50 transition-all gap-3"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center">
                            <Plus size={24} />
                        </div>
                        <span className="font-semibold">{t('createWallet')}</span>
                    </button>
                    {/* Add Spacer for last item if odd number of wallets to prevent layout shift or add padding */}
                </div>
            )}

            {/* Create / Edit Wallet Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingWallet(null); }}></div>
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md z-10 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-6">{editingWallet ? t('editWallet') : t('createWallet')}</h3>

                        <form onSubmit={handleSubmitWallet} className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('walletName')}</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[var(--primary)] outline-none transition-all font-medium"
                                    placeholder="e.g. Main Wallet, TPBank"
                                    value={newWalletName}
                                    onChange={e => setNewWalletName(e.target.value)}
                                />

                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                                    <select
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border-r-[16px] border-transparent outline-none focus:bg-white font-medium"
                                        value={newWalletType}
                                        onChange={e => setNewWalletType(e.target.value as any)}
                                    >
                                        <option value="WALLET">Cash</option>
                                        <option value="BANK">Bank Account</option>
                                    </select>
                                </div>

                                {newWalletType === 'BANK' && (
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Select Bank</label>
                                        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                                            {VIETNAM_BANKS.map(bank => (
                                                <button
                                                    key={bank.code}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedBankCode(bank.code);
                                                        setNewWalletName(bank.name);
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all",
                                                        selectedBankCode === bank.code
                                                            ? "border-[var(--primary)] bg-orange-50"
                                                            : "border-gray-100 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <img src={bank.logo} alt={bank.name} className="h-10 w-auto object-contain" />
                                                    <span className="text-[10px] font-bold text-center truncate w-full">{bank.code}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Currency</label>
                                    <select
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border-r-[16px] border-transparent outline-none focus:bg-white font-medium"
                                        value={newWalletCurrency}
                                        onChange={e => setNewWalletCurrency(e.target.value)}
                                    >
                                        <option value="VND">VND</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            {!editingWallet && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">{t('initialBalance')}</label>
                                    <input
                                        type="number"
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[var(--primary)] outline-none transition-all font-medium"
                                        placeholder="0"
                                        value={newWalletBalance}
                                        onChange={e => setNewWalletBalance(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); setEditingWallet(null); }}
                                    className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-12 rounded-xl bg-[var(--primary)] text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-orange-200"
                                >
                                    {editingWallet ? 'Save Changes' : t('createWallet')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Adjust Balance Modal */}
            {adjustWalletId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setAdjustWalletId(null)}></div>
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md z-10 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-6">{t('adjustBalance')}</h3>
                        <p className="text-sm text-gray-500 mb-6 -mt-4">
                            {wallets.find(w => w.id === adjustWalletId)?.name}
                        </p>

                        <form onSubmit={handleConfirmAdjustment} className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('newBalance')}</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        className="w-full h-14 pl-4 pr-12 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[var(--primary)] outline-none transition-all font-bold text-2xl"
                                        placeholder="0"
                                        value={adjustBalanceValue}
                                        onChange={e => setAdjustBalanceValue(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                                        {wallets.find(w => w.id === adjustWalletId)?.currency}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setAdjustWalletId(null)}
                                    className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-12 rounded-xl bg-[var(--primary)] text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={18} />
                                    {t('adjustBalance')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
