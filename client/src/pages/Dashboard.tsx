import { useEffect, useState } from "react";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, PiggyBank, Briefcase, Eye, EyeOff, Landmark, CreditCard, X, ArrowRight } from "lucide-react";
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

    // Derived State
    const hiddenWallets = wallets.slice(5);

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
                if (user?.preferences?.defaultWalletId) {
                    const found = res.data.find((w: any) => w.id === user.preferences.defaultWalletId);
                    setSelectedWalletId(found ? found.id : res.data[0].id);
                } else {
                    setSelectedWalletId(res.data[0].id);
                }
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
        return <div className="h-full flex items-center justify-center text-gray-400">Loading dashboard...</div>;
    }

    if (!stats) {
        return <div className="h-full flex items-center justify-center text-red-400">Failed to load data</div>;
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

                    {/* Transaction List (Moved Here) */}
                    <div>
                        <div className="flex justify-between items-center mb-6 px-2">
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">{t('recentTransactions')}</h3>
                            <Link to="/transactions" className="text-sm font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                                Xem thêm <ArrowRight size={14} />
                            </Link>
                        </div>
                        <TransactionList showControls={false} limit={10} />
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
            </div>
        </div>
    );
}
