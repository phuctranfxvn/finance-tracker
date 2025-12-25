import { useState, useEffect } from "react";
import axios from "axios";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Eye, EyeOff, Landmark, CreditCard } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PasswordModal from "../components/PasswordModal";
import { formatNumber, parseNumber } from "../lib/utils";
import { CREDIT_CARD_TYPES, VIETNAM_BANKS } from "../lib/constants";

export default function QuickAddPage() {
    const { user, token } = useAuth();
    const { t } = useLanguage();
    const [showSuccess, setShowSuccess] = useState(false);
    const [quickAmount, setQuickAmount] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wallets, setWallets] = useState<any[]>([]);
    const [presetAmounts, setPresetAmounts] = useState<number[]>([]);
    const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [selectedWalletId, setSelectedWalletId] = useState<string>("");

    // Privacy Logic
    const [showIncome, setShowIncome] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Derived State
    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    const currencyLabel = selectedWallet?.currency || 'VND';
    const isValid = quickAmount && parseNumber(quickAmount) > 0 && selectedCategory && selectedWalletId;

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
        if (!isValid) return;

        setIsSubmitting(true);
        try {
            await axios.post("/api/transactions", {
                amount: parseNumber(quickAmount),
                type: transactionType,
                category: selectedCategory,
                accountId: selectedWalletId,
                note: `Quick Add: ${selectedCategory}`,
                date: new Date(),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Show success message
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

            setQuickAmount("");
            setSelectedCategory(null);
        } catch (error) {
            console.error("Quick add failed", error);
            alert("Failed to add transaction");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ... existing toggleIncomeVisibility ...


    const toggleIncomeVisibility = () => {
        if (showIncome) {
            setShowIncome(false);
        } else {
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
        setShowPasswordModal(false);
    };

    const handleTransactionTypeChange = (type: 'EXPENSE' | 'INCOME') => {
        setTransactionType(type);
        setSelectedCategory(null);
    };

    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        if (!token) return;
        axios.get("/api/categories", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setCategories(res.data)).catch(console.error);
    }, [token]);

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

    return (
        <div
            className={clsx(
                "flex flex-col h-full w-full overflow-y-auto scrollbar-hide pb-24 lg:pb-0 transition-colors duration-300",
                transactionType === 'EXPENSE' ? "bg-orange-50" : "bg-green-50"
            )}
            style={{ "--tab-bg": transactionType === 'EXPENSE' ? '#fff7ed' : '#f0fdf4' } as React.CSSProperties}
        >
            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onSuccess={handlePasswordSuccess}
            />

            {/* Quick Add Section - Content */}
            <div className="flex-1 flex flex-col p-4 lg:p-8 relative">
                {/* Subtle Decorative Circle */}
                <div className={clsx(
                    "absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-40 pointer-events-none fixed",
                    transactionType === 'EXPENSE' ? "bg-orange-200" : "bg-green-200"
                )}></div>

                <div className="relative z-10 flex flex-col gap-4 justify-between items-start flex-1 max-w-md mx-auto w-full h-full">

                    {/* Top Row: Type Toggle */}
                    <div className="w-full bg-white rounded-2xl p-1 flex shadow-sm shrink-0">
                        <div className="relative flex-1 flex">
                            <div className={clsx(
                                "absolute top-0 bottom-0 w-1/2 rounded-xl shadow-md transition-all duration-300 ease-spring",
                                transactionType === 'EXPENSE' ? "bg-orange-500 left-0" : "bg-green-500 left-1/2"
                            )}></div>
                            <button
                                onClick={() => handleTransactionTypeChange('EXPENSE')}
                                className={clsx("flex-1 py-3 text-sm font-bold z-10 transition-colors flex items-center justify-center gap-2", transactionType === 'EXPENSE' ? "text-white" : "text-gray-500")}
                            >
                                <TrendingDown size={16} />
                                {t('expense')}
                            </button>
                            <button
                                onClick={() => handleTransactionTypeChange('INCOME')}
                                className={clsx("flex-1 py-3 text-sm font-bold z-10 transition-colors flex items-center justify-center gap-2", transactionType === 'INCOME' ? "text-white" : "text-gray-500")}
                            >
                                <TrendingUp size={16} />
                                {t('income')}
                            </button>
                        </div>
                    </div>

                    {/* Amount Input Card - Flexible height */}
                    <div className="w-full bg-white rounded-3xl px-6 py-3 shadow-sm relative flex flex-col justify-center flex-[0.2] min-h-[80px]">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-orange-900/40 uppercase tracking-widest">{t('amount').toUpperCase()}</label>
                            <button
                                onClick={toggleIncomeVisibility}
                                className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                            >
                                {showIncome ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                        </div>
                        <div className="flex items-baseline mt-1">
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
                                    "w-full bg-transparent text-4xl font-black outline-none transition-all placeholder:text-gray-200",
                                    transactionType === 'EXPENSE' ? "text-orange-500" : "text-green-500"
                                )}
                            />
                            <span className={clsx("text-lg font-bold ml-2", transactionType === 'EXPENSE' ? "text-orange-500" : "text-green-500")}>{currencyLabel}</span>
                        </div>
                    </div>

                    {/* Preset Chips - Moved Here */}
                    <div className="flex gap-3 overflow-x-auto w-full hide-scrollbar">
                        {presetAmounts.map(amount => (
                            <button
                                key={amount}
                                onClick={() => setQuickAmount(formatNumber(amount))}
                                className={clsx(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap",
                                    transactionType === 'EXPENSE'
                                        ? "bg-orange-100/50 text-orange-800 hover:bg-orange-200/50"
                                        : "bg-green-100/50 text-green-800 hover:bg-green-200/50"
                                )}
                            >
                                {amount.toLocaleString()}
                            </button>
                        ))}
                    </div>

                    {/* Wallets Section */}
                    <div className="w-full">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 block">{t('fromWallet')}</label>
                        <div className="grid grid-cols-3 gap-3">
                            {wallets.slice(0, 6).map(w => (
                                <button
                                    key={w.id}
                                    onClick={() => setSelectedWalletId(w.id)}
                                    className={clsx(
                                        "flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all relative bg-white",
                                        selectedWalletId === w.id
                                            ? (transactionType === 'EXPENSE' ? "border-orange-500 shadow-md bg-orange-50" : "border-green-500 shadow-md bg-green-50")
                                            : "border-transparent shadow-sm"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors bg-gray-50 text-gray-500",
                                        selectedWalletId === w.id && (transactionType === 'EXPENSE' ? "bg-white text-orange-500" : "bg-white text-green-500")
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

                                    <div className="text-[11px] font-bold text-center truncate w-full text-gray-700">
                                        {w.name}
                                    </div>

                                    {selectedWalletId === w.id && (
                                        <div className={clsx(
                                            "absolute top-3 right-3 w-2 h-2 rounded-full",
                                            transactionType === 'EXPENSE' ? "bg-orange-500" : "bg-green-500"
                                        )}></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>



                    {/* Categories Section - Takes most remaining space */}
                    <div className="w-full flex-1 min-h-0 flex flex-col">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 block">{t('selectCategory')}</label>
                        <div className="grid grid-cols-4 gap-2">
                            {displayCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className={clsx(
                                        "flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl transition-all duration-200 bg-white shadow-sm border-2 h-16",
                                        selectedCategory === cat.name
                                            ? (transactionType === 'EXPENSE'
                                                ? "border-transparent bg-white shadow-md ring-2 ring-orange-500"
                                                : "border-transparent bg-white shadow-md ring-2 ring-green-500")
                                            : "border-transparent hover:bg-gray-50"
                                    )}
                                >
                                    <div className="text-xl">
                                        {cat.icon}
                                    </div>
                                    <span className={clsx(
                                        "text-[10px] font-bold text-center truncate w-full",
                                        selectedCategory === cat.name
                                            ? (transactionType === 'EXPENSE' ? "text-orange-600" : "text-green-600")
                                            : "text-gray-500"
                                    )}>{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button - Sticky Bottom of Container */}
                    <div className="w-full mt-auto">
                        <button
                            onClick={handleQuickAdd}
                            disabled={isSubmitting || !isValid}
                            className={clsx(
                                "h-16 rounded-3xl font-bold transition-all active:scale-95 flex items-center justify-center gap-3 w-full text-lg text-white",
                                transactionType === 'EXPENSE'
                                    ? (isValid && !isSubmitting ? "bg-orange-500 hover:bg-orange-600" : "bg-orange-200")
                                    : (isValid && !isSubmitting ? "bg-green-500 hover:bg-green-600" : "bg-green-200")
                            )}
                        >
                            <span className="drop-shadow-sm">
                                {isSubmitting ? "Đang lưu..." : (transactionType === 'EXPENSE' ? "Xác nhận chi" : "Xác nhận thu")}
                            </span>
                            {!isSubmitting && (
                                <div className="bg-white/30 w-8 h-8 rounded-full flex items-center justify-center">
                                    <TrendingDown className={clsx("w-4 h-4 text-white", transactionType === 'INCOME' && "rotate-180")} />
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Success Toast */}
                <div className={clsx(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 pointer-events-none",
                    showSuccess ? "opacity-100 scale-100" : "opacity-0 scale-95"
                )}>
                    <div className="bg-black/80 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <TrendingDown className="w-4 h-4 text-white rotate-180" /> {/* Mimic checkmark or just up arrow */}
                        </div>
                        <span className="font-bold">Đã lưu giao dịch!</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
