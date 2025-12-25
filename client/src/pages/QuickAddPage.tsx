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
    const [showWalletPopup, setShowWalletPopup] = useState(false);

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
            alert(t('failedToAddTransaction'));
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
                { id: 'food', name: t('catFood'), icon: '🍔' },
                { id: 'transport', name: t('catTransport'), icon: '🚕' },
                { id: 'shopping', name: t('catShopping'), icon: '🛍️' },
                { id: 'entertainment', name: t('catEntertainment'), icon: '🎬' },
            ]
            : [
                { id: 'salary', name: t('catSalary'), icon: '💰' },
                { id: 'freelance', name: t('catFreelance'), icon: '💻' },
                { id: 'gift', name: t('catGift'), icon: '🎁' },
                { id: 'investment', name: t('catInvestment'), icon: '📈' },
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

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-12 items-start flex-1 max-w-md lg:max-w-7xl mx-auto w-full h-full lg:p-8">

                    {/* Left Column */}
                    <div className="flex flex-col gap-4 lg:gap-6 lg:col-span-5 w-full">
                        {/* Title - Desktop Only */}
                        <div className="hidden lg:flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                                <TrendingDown size={28} />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800">{t('quickAdd')}</h2>
                            <div className="ml-auto bg-gray-100 p-2 rounded-full text-gray-400">
                                <Eye size={20} />
                            </div>
                        </div>

                        {/* Top Row: Type Toggle (Order 1) */}
                        <div className="w-full bg-white rounded-2xl p-1 flex shadow-sm shrink-0 order-1">
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

                        {/* Wallets Section (Order 4 Mobile, Order 2 Desktop) */}
                        <div className="w-full order-4 lg:order-2">
                            <label className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 block">{t('fromWallet')}</label>

                            {/* Mobile: 5 + Others */}
                            <div className="grid grid-cols-3 gap-3 lg:hidden">
                                {wallets.slice(0, 5).map(w => (
                                    <button
                                        key={w.id}
                                        onClick={() => setSelectedWalletId(w.id)}
                                        className={clsx(
                                            "flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all relative bg-white group",
                                            selectedWalletId === w.id
                                                ? (transactionType === 'EXPENSE' ? "border-orange-500 shadow-md bg-orange-50" : "border-green-500 shadow-md bg-green-50")
                                                : "border-transparent shadow-sm hover:border-gray-200"
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

                                {/* 6th Block: Others / Selected Other (Mobile Only) */}
                                {wallets.length > 5 && (
                                    <button
                                        onClick={() => setShowWalletPopup(true)}
                                        className={clsx(
                                            "flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all relative bg-white group",
                                            (wallets.slice(5).find(w => w.id === selectedWalletId))
                                                ? (transactionType === 'EXPENSE' ? "border-orange-500 shadow-md bg-orange-50" : "border-green-500 shadow-md bg-green-50")
                                                : "border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                                        )}
                                    >
                                        {(() => {
                                            const selectedOther = wallets.slice(5).find(w => w.id === selectedWalletId);
                                            if (selectedOther) {
                                                return (
                                                    <>
                                                        <div className={clsx(
                                                            "w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors bg-gray-50 text-gray-500",
                                                            transactionType === 'EXPENSE' ? "bg-white text-orange-500" : "bg-white text-green-500"
                                                        )}>
                                                            {selectedOther.type === 'BANK' ? (
                                                                selectedOther.bankName ? (
                                                                    <img
                                                                        src={VIETNAM_BANKS.find(b => b.code === selectedOther.bankName)?.logo || "https://api.vietqr.io/img/VCB.png"}
                                                                        alt={selectedOther.bankName}
                                                                        className="w-full h-full object-contain p-1"
                                                                    />
                                                                ) : <Landmark size={20} />
                                                            ) : selectedOther.type === 'CREDIT_CARD' ? (
                                                                selectedOther.creditCardType ? (
                                                                    <img
                                                                        src={CREDIT_CARD_TYPES.find(c => c.code === selectedOther.creditCardType)?.logo}
                                                                        alt={selectedOther.creditCardType}
                                                                        className="w-full h-full object-contain p-1"
                                                                    />
                                                                ) : <CreditCard size={20} />
                                                            ) : (
                                                                <WalletIcon size={20} />
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] font-bold text-center truncate w-full text-gray-700">
                                                            {selectedOther.name}
                                                        </div>
                                                        <div className={clsx(
                                                            "absolute top-3 right-3 w-2 h-2 rounded-full",
                                                            transactionType === 'EXPENSE' ? "bg-orange-500" : "bg-green-500"
                                                        )}></div>
                                                    </>
                                                );
                                            } else {
                                                return (
                                                    <>
                                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 bg-gray-50">
                                                            <div className="flex gap-0.5">
                                                                <div className="w-1 h-1 rounded-full bg-current"></div>
                                                                <div className="w-1 h-1 rounded-full bg-current"></div>
                                                                <div className="w-1 h-1 rounded-full bg-current"></div>
                                                            </div>
                                                        </div>
                                                        <div className="text-[11px] font-bold text-center truncate w-full text-gray-400">
                                                            {t('others')}
                                                        </div>
                                                    </>
                                                );
                                            }
                                        })()}
                                    </button>
                                )}
                            </div>

                            {/* Desktop: All Wallets */}
                            <div className="hidden lg:grid lg:grid-cols-4 gap-3">
                                {wallets.map(w => (
                                    <button
                                        key={w.id}
                                        onClick={() => setSelectedWalletId(w.id)}
                                        className={clsx(
                                            "flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all relative bg-white group",
                                            selectedWalletId === w.id
                                                ? (transactionType === 'EXPENSE' ? "border-orange-500 shadow-md bg-orange-50" : "border-green-500 shadow-md bg-green-50")
                                                : "border-transparent shadow-sm hover:border-gray-200"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors bg-gray-50 text-gray-500",
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

                                        <div className="text-xs font-bold text-center truncate w-full text-gray-800 group-hover:text-black">
                                            {w.name}
                                        </div>
                                        <div className="text-[10px] font-medium text-gray-400">
                                            {Number(w.balance).toLocaleString()} ₫
                                        </div>

                                        {selectedWalletId === w.id && (
                                            <div className={clsx(
                                                "absolute top-2 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-white",
                                                transactionType === 'EXPENSE' ? "bg-orange-500" : "bg-green-500"
                                            )}></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Wallet Selection Popup */}
                        {showWalletPopup && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                                    <div className="p-6 pb-2 shrink-0 flex justify-between items-center">
                                        <h3 className="text-lg font-bold">{t('selectWallet')}</h3>
                                        <button
                                            onClick={() => setShowWalletPopup(false)}
                                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                                        >
                                            <TrendingDown size={16} className="rotate-45" /> {/* Close Icon */}
                                        </button>
                                    </div>
                                    <div className="p-4 overflow-y-auto">
                                        <div className="grid grid-cols-1 gap-3">
                                            {wallets.slice(5).map(w => (
                                                <button
                                                    key={w.id}
                                                    onClick={() => {
                                                        setSelectedWalletId(w.id);
                                                        setShowWalletPopup(false);
                                                    }}
                                                    className={clsx(
                                                        "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                                                        selectedWalletId === w.id
                                                            ? "bg-gray-900 text-white border-transparent"
                                                            : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors",
                                                        selectedWalletId === w.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
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
                                                    <div>
                                                        <div className="font-bold text-sm">{w.name}</div>
                                                        <div className={clsx("text-xs font-medium", selectedWalletId === w.id ? "text-gray-300" : "text-gray-400")}>
                                                            {Number(w.balance).toLocaleString()} {w.currency}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Amount Input (Order 2 Mobile, Order 3 Desktop) */}
                        <div className="w-full bg-white rounded-3xl lg:rounded-[2rem] px-6 py-2 lg:px-6 lg:py-6 shadow-sm relative flex flex-col justify-center flex-[0.15] min-h-[65px] lg:min-h-[110px] order-2 lg:order-3">
                            <div className="flex justify-between items-center mb-1 lg:mb-2">
                                <label className="text-[10px] lg:text-xs font-bold text-orange-900/40 lg:text-gray-300 uppercase tracking-widest">{t('amount').toUpperCase()}</label>
                                {/* Restore Eye Icon for Mobile Privacy? Old layout had it. */}
                                <button
                                    onClick={toggleIncomeVisibility}
                                    className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors lg:hidden"
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
                                        "w-full bg-transparent text-4xl lg:text-6xl font-black outline-none transition-all placeholder:text-gray-200 lg:placeholder:text-gray-100",
                                        transactionType === 'EXPENSE' ? "text-orange-500" : "text-green-500"
                                    )}
                                />
                                <span className={clsx("text-lg lg:text-2xl font-bold ml-2", transactionType === 'EXPENSE' ? "text-orange-500 lg:text-gray-300" : "text-green-500 lg:text-gray-300")}>{currencyLabel}</span>
                            </div>
                        </div>

                        {/* Preset Chips (Order 3 Mobile, Order 4 Desktop) */}
                        <div className="flex gap-3 overflow-x-auto w-full hide-scrollbar order-3 lg:order-4 pb-2 lg:pb-0">
                            {presetAmounts.map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => setQuickAmount(formatNumber(amount))}
                                    className={clsx(
                                        "px-4 py-2 lg:px-5 lg:py-3 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm border",
                                        transactionType === 'EXPENSE'
                                            ? "bg-orange-100/50 lg:bg-orange-50 border-transparent lg:border-orange-100 text-orange-800 lg:text-orange-700 hover:bg-orange-200/50 lg:hover:bg-orange-100"
                                            : "bg-green-100/50 lg:bg-green-50 border-transparent lg:border-green-100 text-green-800 lg:text-green-700 hover:bg-green-200/50 lg:hover:bg-green-100"
                                    )}
                                >
                                    {amount.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column (Desktop) / Bottom Stack (Mobile) */}
                    <div className="flex flex-col h-full lg:col-span-7 relative">
                        {/* Decorative Background for Desktop */}
                        <div className="absolute -top-6 -right-6 w-64 h-32 bg-[#FFE4C4] rounded-bl-[4rem] -z-10 hidden lg:block opacity-50"></div>
                        <div className="absolute -top-4 -right-4 px-6 py-2 bg-[#FFE4C4] rounded-full hidden lg:block">
                            <span className="text-xs font-bold text-orange-800/60 uppercase tracking-widest">{t('selectCategory')}</span>
                        </div>

                        {/* Categories Grid */}
                        <div className="w-full flex-1 min-h-0 flex flex-col order-5 lg:order-1 lg:mt-12">
                            <label className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 block lg:hidden">{t('selectCategory')}</label>
                            <div className="grid grid-cols-4 gap-2 lg:gap-3 overflow-y-auto hide-scrollbar max-h-[400px] lg:max-h-none p-1">
                                {displayCategories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={clsx(
                                            "aspect-none h-16 lg:aspect-auto lg:h-auto lg:min-h-[100px] flex flex-col items-center justify-center gap-0.5 lg:gap-2 p-1 lg:p-3 rounded-xl transition-all duration-200 bg-white shadow-sm border-2",
                                            selectedCategory === cat.name
                                                ? (transactionType === 'EXPENSE'
                                                    ? "border-orange-500 shadow-md bg-orange-50 lg:bg-white"
                                                    : "border-green-500 shadow-md bg-green-50 lg:bg-white")
                                                : "border-transparent hover:bg-gray-50 lg:hover:border-gray-200 lg:hover:shadow-md"
                                        )}
                                    >
                                        <div className="text-xl lg:text-2xl lg:filter lg:drop-shadow-sm">
                                            {cat.icon}
                                        </div>
                                        <span className={clsx(
                                            "text-[10px] lg:text-xs font-bold text-center truncate w-full",
                                            selectedCategory === cat.name
                                                ? (transactionType === 'EXPENSE' ? "text-orange-600" : "text-green-600")
                                                : "text-gray-500 lg:text-gray-600"
                                        )}>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="w-full mt-auto pt-3 lg:mt-6 order-6 lg:order-2 lg:flex lg:justify-end">
                            <button
                                onClick={handleQuickAdd}
                                disabled={isSubmitting || !isValid}
                                className={clsx(
                                    "h-16 rounded-3xl lg:rounded-[2rem] font-bold transition-all active:scale-95 flex items-center justify-center gap-3 w-full lg:w-auto lg:px-12 text-lg text-white shadow-none lg:shadow-xl lg:shadow-orange-200/50",
                                    transactionType === 'EXPENSE'
                                        ? (isValid && !isSubmitting ? "bg-orange-500 lg:bg-orange-400 hover:bg-orange-600 lg:hover:bg-orange-500" : "bg-orange-200")
                                        : (isValid && !isSubmitting ? "bg-green-500 hover:bg-green-600" : "bg-green-200")
                                )}
                            >
                                <span className="drop-shadow-sm">
                                    {isSubmitting ? t('saving') : (transactionType === 'EXPENSE' ? t('confirmExpense') : t('confirmIncome'))}
                                </span>
                                {!isSubmitting && (
                                    <div className="bg-white/30 lg:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center">
                                        <TrendingDown className={clsx("w-4 h-4 lg:w-5 lg:h-5 text-white", transactionType === 'INCOME' && "rotate-180")} />
                                    </div>
                                )}
                            </button>
                        </div>
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
                        <span className="font-bold">{t('transactionSaved')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
