import { useEffect, useState } from "react";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, PiggyBank, Briefcase, Eye, EyeOff, Landmark, CreditCard, X, ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PasswordModal from "../components/PasswordModal";
import TransactionList from "../components/TransactionList";

interface DashboardStats {
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    recentTransactions: any[];
    spendingByCategory: Record<string, number>;
    budget?: {
        items: { category: string; amount: number | string }[];
    };
}

export default function Dashboard() {
    const { user, token } = useAuth();
    const { t } = useLanguage();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [wallets, setWallets] = useState<any[]>([]);
    const [selectedWalletId, setSelectedWalletId] = useState<string>("");

    // Privacy Logic
    const [showIncome, setShowIncome] = useState(false);
    const [showOtherWalletsModal, setShowOtherWalletsModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    // Period Logic
    const [selectedPeriod, setSelectedPeriod] = useState("this_month");
    const periods = [
        { value: "this_month", label: t('thisMonth') || "This Month" },
        { value: "last_month", label: t('lastMonth') || "Last Month" },
        { value: "month_before_last", label: t('monthBeforeLast') || "Month Before Last" },
        { value: "this_year", label: t('thisYear') || "This Year" },
        { value: "last_year", label: t('lastYear') || "Last Year" },
        { value: "year_before_last", label: t('yearBeforeLast') || "Year Before Last" }
    ];
    // Derived State
    const hiddenWallets = wallets.slice(5);

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            try {
                const res = await axios.get(`/api/dashboard?period=${selectedPeriod}`, {
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
        fetchStats();
    }, [token, selectedPeriod]);

    useEffect(() => {
        if (!token) return;
        // Fetch wallets
        axios.get("/api/wallets", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setWallets(res.data);
            if (res.data.length > 0) {
                setSelectedWalletId(res.data[0].id);
            }
        }).catch(console.error);
    }, [user, token]);

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

    if (loading) {
        return <div className="h-full flex items-center justify-center text-gray-400">{t('loadingDashboard')}</div>;
    }

    if (!stats) {
        return <div className="h-full flex items-center justify-center text-red-400">{t('failedLoadData')}</div>;
    }

    const statCards = [
        { label: t('totalBalance'), value: Number(stats.totalBalance).toLocaleString() + " ₫", icon: WalletIcon, color: "bg-blue-100 text-blue-600", bg: "bg-blue-50" },
        {
            label: t('totalIncome'),
            value: showIncome ? Number(stats.totalIncome).toLocaleString() + " ₫" : "******",
            icon: TrendingUp,
            color: "bg-green-100 text-green-600",
            bg: "bg-green-50",
            isPrivacy: true
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

    const progressColors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-orange-500",
        "bg-pink-500",
        "bg-purple-500",
        "bg-teal-500",
        "bg-indigo-500",
        "bg-red-500",
        "bg-yellow-500",
        "bg-cyan-500",
    ];

    return (
        <div className="flex flex-col gap-8 pb-32 h-full overflow-y-auto hide-scrollbar">
            <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
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
                            <h3 className="font-bold text-lg text-gray-900">{t('selectWallet')}</h3>
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className={clsx("p-6 rounded-[2rem] flex flex-col justify-between h-40 card-hover glass-panel relative overflow-hidden", stat.bg)}>
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>

                        <div className="flex justify-between items-start z-10">
                            <div>
                                <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                    {stat.label}
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
                    {/* Charts / Graphs */}
                    <div className="glass-panel p-8 rounded-[2rem] flex-1 min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">{t('spendingByCategory')}</h3>

                            <div className="flex items-center gap-2">
                                {/* Period Selector */}
                                <div className="relative group">
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                        className="appearance-none bg-white/50 pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 hover:bg-white transition-colors cursor-pointer"
                                    >
                                        {periods.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {spendingArray.length > 0 ? (
                            <div className="flex items-center gap-8">


                                <div className="flex-1 flex flex-col gap-4">
                                    {spendingArray.map((cat, index) => {
                                        // Find budget item for this category
                                        const budgetItem = stats.budget?.items?.find((i: any) => i.category === cat.label);
                                        const budgetAmount = budgetItem ? Number(budgetItem.amount) : 0;
                                        const hasBudget = budgetAmount > 0;

                                        // Calculate percentage based on budget if it exists, otherwise use total share like before (or just visual relative to max?)
                                        // Actually existing logic used % of total expense. 
                                        // User requested "Apply the budget...". 
                                        // So visual length should be relative to budget if present.

                                        const percentage = hasBudget
                                            ? Math.min(100, Math.round((cat.amount / budgetAmount) * 100))
                                            : cat.val; // Keep original % share if no budget

                                        const isOverBudget = hasBudget && cat.amount > budgetAmount;
                                        const displayColor = isOverBudget ? "bg-red-500" : progressColors[index % progressColors.length];

                                        return (
                                            <div key={cat.label}>
                                                <div className="flex justify-between text-sm font-semibold mb-1">
                                                    <span>{cat.label}</span>
                                                    <div className="flex items-center gap-1">
                                                        <span>{Number(cat.amount).toLocaleString()} ₫</span>
                                                        {hasBudget && (
                                                            <span className="text-gray-400 text-xs font-normal">
                                                                / {budgetAmount.toLocaleString()} ₫
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={clsx("w-full bg-white border p-1 rounded-full overflow-hidden", isOverBudget ? "border-red-200" : "border-gray-200")}>
                                                    <div
                                                        className={clsx("h-2 rounded-full transition-all duration-500", displayColor)}
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundImage: "linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)",
                                                            backgroundSize: "1rem 1rem"
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">{t('noSpendingData')}</div>
                        )}
                    </div>
                </div>

                {/* Transaction List (Moved Here) */}
                <div>
                    <TransactionList
                        showControls={false}
                        limit={5}
                        title={t('recentTransactions')}
                        headerAction={
                            <Link to="/transactions" className="text-sm font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                                {t('seeMore')} <ArrowRight size={14} />
                            </Link>
                        }
                    />
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
            </div>
        </div >
    );
}
