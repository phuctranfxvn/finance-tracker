import { useEffect, useState } from "react";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, PiggyBank, Briefcase, Eye, EyeOff, Landmark, CreditCard, MoreHorizontal, X } from "lucide-react";
import clsx from "clsx";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PasswordModal from "../components/PasswordModal";
import { formatNumber, parseNumber } from "../lib/utils";
import { CREDIT_CARD_TYPES, VIETNAM_BANKS } from "../lib/constants";

interface DashboardStats {
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    recentTransactions: any[];
    spendingByCategory: Record<string, number>;
}

export default function Dashboard() {
    // 1. All Hooks Must Be At The Top (Before any conditional returns)
    const { user, token } = useAuth();
    const { t } = useLanguage();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [quickAmount, setQuickAmount] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wallets, setWallets] = useState<any[]>([]);
    const [presetAmounts, setPresetAmounts] = useState<number[]>([]);
    const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [selectedWalletId, setSelectedWalletId] = useState<string>("");

    // Privacy Logic
    // Privacy Logic
    const [showIncome, setShowIncome] = useState(false);
    const [showOtherWalletsModal, setShowOtherWalletsModal] = useState(false);

    // Derived State
    const hiddenWallets = wallets.slice(5);

    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    const currencyLabel = selectedWallet?.currency || 'VND';

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            try {
                const res = await axios.get("/api/dashboard", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [token]);

    useEffect(() => {
        if (!token) return;
        // Fetch wallets
        axios.get("/api/wallets", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setWallets(res.data);
            if (res.data.length > 0) {
                // Default to preference if available, else first wallet
                if (user?.preferences?.defaultWalletId) {
                    const found = res.data.find((w: any) => w.id === user.preferences.defaultWalletId);
                    setSelectedWalletId(found ? found.id : res.data[0].id);
                } else {
                    setSelectedWalletId(res.data[0].id);
                }
            }
        }).catch(console.error);
    }, [user, token]);

    useEffect(() => {
        // Fetch presets from user preference
        if (user?.preferences?.quick_amounts) {
            setPresetAmounts(user.preferences.quick_amounts);
        } else {
            setPresetAmounts([50000, 100000, 200000, 500000]);
        }
    }, [user]);

    const handleQuickAdd = async () => {
        if (!quickAmount || parseNumber(quickAmount) <= 0) return alert("Please enter a valid amount");
        if (!selectedCategory) return alert("Please select a category");
        if (wallets.length === 0) return alert("No wallet found to deduct from");

        setIsSubmitting(true);
        try {
            await axios.post("/api/transactions", {
                amount: parseNumber(quickAmount),
                type: transactionType,
                category: selectedCategory,
                accountId: selectedWalletId, // Use selected wallet
                note: `Quick Add: ${selectedCategory}`,
                date: new Date(),
                // userId is handled by backend token
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh Dashboard
            const res = await axios.get("/api/dashboard", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
            setQuickAmount("");
            setSelectedCategory(null);
        } catch (error) {
            console.error("Quick add failed", error);
            alert("Failed to add transaction");
        } finally {
            setIsSubmitting(false);
        }
    };

    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const toggleIncomeVisibility = () => {
        if (showIncome) {
            setShowIncome(false);
        } else {
            // Check if user requires password
            const requirePassword = user?.preferences?.requirePasswordForIncome;
            if (requirePassword) {
                setShowPasswordModal(true);
            } else {
                setShowIncome(true);
            }
        }
    };

    const handlePasswordSuccess = () => {
        setShowIncome(true);
    };

    const handleTransactionTypeChange = (type: 'EXPENSE' | 'INCOME') => {
        setTransactionType(type);
        setSelectedCategory(null);
    };

    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        if (!token) return;
        // Fetch categories
        axios.get("/api/categories", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setCategories(res.data)).catch(console.error);
    }, [token]);

    // Fallback if no categories exist yet
    const displayCategories = categories.length > 0
        ? categories.filter(c => c.type === transactionType)
        : transactionType === 'EXPENSE'
            ? [
                { id: 'food', name: 'Food', icon: '🍔' },
                { id: 'transport', name: 'Transport', icon: '🚕' },
                { id: 'shopping', name: 'Shopping', icon: '🛍️' },
                { id: 'entertainment', name: 'Fun', icon: '🎬' },
            ]
            : [
                { id: 'salary', name: 'Salary', icon: '💰' },
                { id: 'freelance', name: 'Freelance', icon: '💻' },
                { id: 'gift', name: 'Gift', icon: '🎁' },
                { id: 'investment', name: 'Invest', icon: '📈' },
            ];

    // 2. Conditional Returns (After all hooks)
    if (loading) {
        return <div className="h-full flex items-center justify-center text-gray-400">Loading dashboard...</div>;
    }

    if (!stats) {
        return <div className="h-full flex items-center justify-center text-red-400">Failed to load data</div>;
    }

    // 3. Render
    const statCards = [
        { label: t('totalBalance'), value: Number(stats.totalBalance).toLocaleString() + " ₫", icon: WalletIcon, color: "bg-blue-100 text-blue-600", bg: "bg-blue-50" },
        {
            label: t('totalIncome'),
            value: showIncome ? Number(stats.totalIncome).toLocaleString() + " ₫" : "******",
            icon: TrendingUp,
            color: "bg-green-100 text-green-600",
            bg: "bg-green-50",
            isPrivacy: true // Flag to identify income card
        },
        { label: t('totalExpense'), value: Number(stats.totalExpense).toLocaleString() + " ₫", icon: TrendingDown, color: "bg-orange-100 text-orange-600", bg: "bg-orange-50" },
        { label: t('totalSavings'), value: "0 ₫", icon: PiggyBank, color: "bg-pink-100 text-pink-600", bg: "bg-pink-50" },
    ];

    const totalSpending = stats.totalExpense || 1;
    const spendingArray = Object.entries(stats.spendingByCategory || {}).map(([label, amount]) => ({
        label,
        val: Math.round((amount / totalSpending) * 100),
        amount
    })).sort((a, b) => b.val - a.val);

    return (
        <div className="flex flex-col gap-8 pb-20">
            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onSuccess={handlePasswordSuccess}
            />
            {/* Other Wallets Modal */}
            {showOtherWalletsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Select Wallet</h3>
                            <button onClick={() => setShowOtherWalletsModal(false)} className="p-2 -mr-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {hiddenWallets.map(w => (
                                <button
                                    key={w.id}
                                    onClick={() => {
                                        setSelectedWalletId(w.id);
                                        setShowOtherWalletsModal(false);
                                    }}
                                    className={clsx(
                                        "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group relative",
                                        selectedWalletId === w.id
                                            ? "bg-orange-50 border-orange-200"
                                            : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                                        {w.type === 'BANK' ? <Landmark size={20} /> : w.type === 'CREDIT_CARD' ? <CreditCard size={20} /> : <WalletIcon size={20} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-gray-900">{w.name}</div>
                                        <div className="text-xs text-gray-500">{Number(w.balance).toLocaleString()} {w.currency}</div>
                                    </div>
                                    {selectedWalletId === w.id && (
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Quick Add Section - Flat Material with Color (Bold) */}
            <div className={clsx(
                "p-4 lg:p-8 rounded-[2rem] shadow-sm border relative overflow-hidden transition-all duration-300",
                transactionType === 'EXPENSE'
                    ? "bg-orange-50 border-orange-200"
                    : "bg-green-50 border-green-200"
            )}>
                {/* Subtle Decorative Circle (Flat) */}
                <div className={clsx(
                    "absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-40",
                    transactionType === 'EXPENSE' ? "bg-orange-200" : "bg-green-200"
                )}></div>

                <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">

                    {/* Left Column: Input & Toggle */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-3 lg:gap-6">

                        {/* Header & Toggle */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg lg:text-xl font-bold flex items-center gap-2 lg:gap-3 text-gray-900">
                                <div className={clsx("w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors", transactionType === 'EXPENSE' ? "bg-orange-500" : "bg-green-500")}>
                                    {transactionType === 'EXPENSE' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                                </div>
                                {t('quickAdd')}

                                <button
                                    onClick={toggleIncomeVisibility}
                                    className="ml-2 w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                                >
                                    {showIncome ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                            </h3>
                        </div>

                        {/* Material Styled Toggle - Colored */}
                        <div className="flex p-1 bg-white border border-gray-100 rounded-xl relative shadow-sm">
                            <div className={clsx(
                                "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-spring",
                                transactionType === 'EXPENSE' ? "bg-orange-500 translate-x-0" : "bg-green-500 translate-x-[calc(100%+8px)]"
                            )}></div>
                            <button
                                onClick={() => handleTransactionTypeChange('EXPENSE')}
                                className={clsx("flex-1 py-1.5 lg:py-2 px-4 rounded-lg text-xs lg:text-sm font-bold z-10 transition-colors relative flex items-center justify-center gap-2", transactionType === 'EXPENSE' ? "text-white" : "text-gray-500 hover:text-gray-700")}
                            >
                                {t('expense')}
                            </button>
                            <button
                                onClick={() => handleTransactionTypeChange('INCOME')}
                                className={clsx("flex-1 py-1.5 lg:py-2 px-4 rounded-lg text-xs lg:text-sm font-bold z-10 transition-colors relative flex items-center justify-center gap-2", transactionType === 'INCOME' ? "text-white" : "text-gray-500 hover:text-gray-700")}
                            >
                                {t('income')}
                            </button>
                        </div>

                        {/* Wallet Selector - Material Outline */}
                        <div className="relative">
                            <label className="text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-2 block">{t('fromWallet')}</label>
                            <div className="grid grid-cols-3 gap-2">
                                {/* Top 5 Wallets */}
                                {wallets.slice(0, 5).map(w => (
                                    <button
                                        key={w.id}
                                        onClick={() => setSelectedWalletId(w.id)}
                                        className={clsx(
                                            "flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all group relative overflow-hidden",
                                            selectedWalletId === w.id
                                                ? (transactionType === 'EXPENSE' ? "bg-orange-50 border-orange-500 shadow-md transform scale-105" : "bg-green-50 border-green-500 shadow-md transform scale-105")
                                                : "bg-white border-transparent hover:border-gray-200"
                                        )}
                                    >
                                        {/* Icon Container - Centered */}
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors",
                                            selectedWalletId === w.id
                                                ? (transactionType === 'EXPENSE' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")
                                                : "bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600"
                                        )}>
                                            {w.type === 'BANK' ? (
                                                w.bankName ? (
                                                    <img
                                                        src={VIETNAM_BANKS.find(b => b.code === w.bankName)?.logo || "https://api.vietqr.io/img/VCB.png"}
                                                        alt={w.bankName}
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                ) : <Landmark size={20} />
                                            ) : w.type === 'CREDIT_CARD' ? (
                                                w.creditCardType ? (
                                                    <img
                                                        src={CREDIT_CARD_TYPES.find(c => c.code === w.creditCardType)?.logo}
                                                        alt={w.creditCardType}
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                ) : <CreditCard size={20} />
                                            ) : (
                                                <WalletIcon size={20} />
                                            )}
                                        </div>

                                        <div className="text-center w-full z-10">
                                            <div className="text-[10px] lg:text-xs font-bold truncate w-full px-1">
                                                {w.name}
                                            </div>
                                            <div className={clsx(
                                                "text-[9px] lg:text-[10px] font-medium",
                                                selectedWalletId === w.id
                                                    ? (transactionType === 'EXPENSE' ? "text-orange-600/80" : "text-green-600/80")
                                                    : "text-gray-400"
                                            )}>
                                                {Number(w.balance).toLocaleString()} {w.currency === 'VND' ? '₫' : '$'}
                                            </div>
                                        </div>

                                        {/* Status Indicator Dot */}
                                        {selectedWalletId === w.id && (
                                            <div className={clsx(
                                                "absolute top-2 right-2 w-1.5 h-1.5 rounded-full",
                                                transactionType === 'EXPENSE' ? "bg-orange-500" : "bg-green-500"
                                            )}></div>
                                        )}
                                    </button>
                                ))}

                                {/* Others Button - Shows if > 5 wallets */}
                                {wallets.length > 5 && (
                                    <button
                                        onClick={() => setShowOtherWalletsModal(true)}
                                        className={clsx(
                                            "flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all group relative overflow-hidden",
                                            !wallets.slice(0, 5).some(w => w.id === selectedWalletId)
                                                ? (transactionType === 'EXPENSE' ? "bg-orange-50 border-orange-500 shadow-md transform scale-105" : "bg-green-50 border-green-500 shadow-md transform scale-105")
                                                : "bg-white border-transparent hover:border-gray-200"
                                        )}
                                    >
                                        {!wallets.slice(0, 5).some(w => w.id === selectedWalletId) && selectedWallet ? (
                                            <>
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors",
                                                    transactionType === 'EXPENSE' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                                                )}>
                                                    {selectedWallet.type === 'BANK' ? (
                                                        selectedWallet.bankName ? (
                                                            <img
                                                                src={VIETNAM_BANKS.find(b => b.code === selectedWallet.bankName)?.logo || "https://api.vietqr.io/img/VCB.png"}
                                                                alt={selectedWallet.bankName}
                                                                className="w-full h-full object-contain p-1"
                                                            />
                                                        ) : <Landmark size={20} />
                                                    ) : selectedWallet.type === 'CREDIT_CARD' ? (
                                                        selectedWallet.creditCardType ? (
                                                            <img
                                                                src={CREDIT_CARD_TYPES.find(c => c.code === selectedWallet.creditCardType)?.logo}
                                                                alt={selectedWallet.creditCardType}
                                                                className="w-full h-full object-contain p-1"
                                                            />
                                                        ) : <CreditCard size={20} />
                                                    ) : (
                                                        <WalletIcon size={20} />
                                                    )}
                                                </div>
                                                <div className="text-center w-full z-10">
                                                    <div className="text-[10px] lg:text-xs font-bold truncate w-full px-1">
                                                        {selectedWallet.name}
                                                    </div>
                                                    <div className={clsx(
                                                        "text-[9px] lg:text-[10px] font-medium",
                                                        transactionType === 'EXPENSE' ? "text-orange-600/80" : "text-green-600/80"
                                                    )}>
                                                        {Number(selectedWallet.balance).toLocaleString()} {selectedWallet.currency === 'VND' ? '₫' : '$'}
                                                    </div>
                                                </div>
                                                <div className={clsx(
                                                    "absolute top-2 right-2 w-1.5 h-1.5 rounded-full",
                                                    transactionType === 'EXPENSE' ? "bg-orange-500" : "bg-green-500"
                                                )}></div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600">
                                                    <MoreHorizontal size={20} />
                                                </div>
                                                <div className="text-center w-full z-10">
                                                    <div className="text-[10px] lg:text-xs font-bold truncate w-full px-1">
                                                        {t('others') || 'Others'}
                                                    </div>
                                                    <div className="text-[9px] lg:text-[10px] font-medium text-gray-400">
                                                        {wallets.length - 5} more
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Amount Input - White for contrast */}
                        <div className="flex flex-col justify-center p-2 lg:p-4 rounded-xl lg:rounded-2xl transition-colors bg-white shadow-sm border border-white/50">
                            <label className={clsx("text-[10px] lg:text-xs font-bold uppercase tracking-wider ml-1 mb-1", transactionType === 'EXPENSE' ? "text-orange-900/60" : "text-green-900/60")}>{t('amount')}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={quickAmount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                        setQuickAmount(formatNumber(val.replace(/,/g, '')));
                                    }}
                                    className={clsx(
                                        "w-full bg-transparent text-3xl lg:text-5xl font-black outline-none transition-all py-0 lg:py-1 placeholder:text-gray-200",
                                        transactionType === 'EXPENSE' ? "text-orange-600" : "text-green-600"
                                    )}
                                />
                                <span className={clsx(
                                    "absolute right-0 top-1/2 -translate-y-1/2 text-sm lg:text-lg font-bold",
                                    transactionType === 'EXPENSE' ? "text-orange-400" : "text-green-400"
                                )}>{currencyLabel}</span>
                            </div>
                        </div>

                        {/* Preset Chips - Tonal Fill (Darker) */}
                        <div className="flex flex-wrap gap-1.5 lg:gap-2">
                            {presetAmounts.map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => setQuickAmount(formatNumber(amount))}
                                    className={clsx(
                                        "px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-bold transition-all active:scale-95 border",
                                        transactionType === 'EXPENSE'
                                            ? "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
                                            : "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                                    )}
                                >
                                    {amount.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Categories & Submit */}
                    <div className="flex-1 flex flex-col gap-6 w-full">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider lg:text-right">{t('selectCategory')}</label>

                        <div className="grid grid-cols-4 gap-2 lg:gap-4">
                            {displayCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className={clsx(
                                        "group flex flex-col items-center justify-center gap-1 lg:gap-3 p-2 lg:p-4 rounded-xl lg:rounded-2xl transition-all duration-200 border relative overflow-hidden h-20 lg:h-32",
                                        selectedCategory === cat.name
                                            ? (transactionType === 'EXPENSE'
                                                ? "bg-orange-500 border-orange-600 text-white shadow-md scale-105"
                                                : "bg-green-500 border-green-600 text-white shadow-md scale-105")
                                            : (transactionType === 'EXPENSE'
                                                ? "bg-white border-orange-100 text-gray-500 hover:bg-orange-50 hover:border-orange-200"
                                                : "bg-white border-green-100 text-gray-500 hover:bg-green-50 hover:border-green-200")
                                    )}
                                >
                                    <div className={clsx(
                                        "w-8 h-8 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-xl lg:text-3xl transition-transform duration-200 group-hover:scale-110",
                                        // Keep basic emoji look
                                    )}>
                                        {cat.icon}
                                    </div>
                                    <span className={clsx(
                                        "text-[10px] lg:text-xs font-bold transition-colors text-center truncate w-full",
                                        selectedCategory === cat.name
                                            ? (transactionType === 'EXPENSE' ? "text-orange-100" : "text-green-100")
                                            : "text-gray-500 group-hover:text-gray-900"
                                    )}>{cat.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Submit Button - Solid & Flat */}
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleQuickAdd}
                                disabled={isSubmitting || !quickAmount || !selectedCategory}
                                className={clsx(
                                    "h-14 px-8 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2",
                                    transactionType === 'EXPENSE'
                                        ? "bg-orange-600 hover:bg-orange-700 text-white disabled:bg-orange-300"
                                        : "bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300",
                                    "disabled:opacity-50 disabled:shadow-none w-full lg:w-auto min-w-[200px]"
                                )}
                            >
                                {isSubmitting ? t('processing') : (
                                    <>
                                        {transactionType === 'EXPENSE' ? t('confirmExpense') : t('confirmIncome')}
                                        <div className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center">
                                            <TrendingDown className={clsx("w-3 h-3 text-white", transactionType === 'INCOME' && "rotate-180")} />
                                        </div>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className={clsx("p-6 rounded-[2rem] flex flex-col justify-between h-40 card-hover glass-panel relative overflow-hidden", stat.bg)}>
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>

                        <div className="flex justify-between items-start z-10">
                            <div>
                                <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                    {stat.label}
                                    {/* Privacy Toggle Button */}
                                    {stat.isPrivacy && (
                                        <button
                                            onClick={toggleIncomeVisibility}
                                            className="text-gray-400 hover:text-black transition-colors"
                                        >
                                            {showIncome ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    )}
                                </div>
                                <div className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{stat.value}</div>
                            </div>
                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", stat.color)}>
                                <stat.icon size={20} />
                            </div>
                        </div>

                        <div className="z-10 mt-auto">
                            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                <div className="h-full bg-black/10 w-2/3 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-8">
                    <div className="glass-panel p-8 rounded-[2rem] flex-1 min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">{t('spendingByCategory')}</h3>
                            <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">{t('highPriority')}</span>
                        </div>

                        {spendingArray.length > 0 ? (
                            <div className="flex items-center gap-8">
                                <div className="relative w-40 h-40 rounded-full border-[12px] border-red-500 flex items-center justify-center shrink-0">
                                    <span className="text-2xl font-bold text-[var(--text-primary)]">{spendingArray[0].val}%</span>
                                    <span className="absolute bottom-8 text-[10px] text-[var(--text-secondary)]">{t('topCat')}</span>
                                </div>

                                <div className="flex-1 flex flex-col gap-4">
                                    {spendingArray.map(cat => (
                                        <div key={cat.label}>
                                            <div className="flex justify-between text-sm font-semibold mb-1">
                                                <span>{cat.label}</span>
                                                <span>{cat.val}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${cat.val}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">{t('noSpendingData')}</div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="glass-panel p-6 rounded-[2rem] bg-white">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Briefcase size={20} className="text-blue-500" />
                            {t('savingsGoals')}
                        </h3>
                        <div className="text-xs text-gray-400">{t('noActiveGoals')}</div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="font-bold text-[var(--text-secondary)] text-sm">{t('recentTransactions')}</div>
                        <div className="space-y-3">
                            {stats.recentTransactions.map((tx: any) => (
                                <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center", tx.type === 'INCOME' ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500")}>
                                            {tx.type === 'INCOME' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        </div>
                                        <div className="text-xs">
                                            <div className="font-bold">{tx.note || tx.category}</div>
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(tx.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={clsx("text-xs font-bold", tx.type === 'INCOME' ? "text-green-500" : "text-red-500")}>
                                        {tx.type === 'INCOME'
                                            ? ((!tx.isPrivate || showIncome) ? `+${Number(tx.amount).toLocaleString()}` : "******")
                                            : `-${Number(tx.amount).toLocaleString()}`
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
