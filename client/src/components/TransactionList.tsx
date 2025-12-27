import { useEffect, useState } from "react";
import axios from "axios";
import { Search, TrendingUp, TrendingDown, Eye, EyeOff, PenLine, ArrowRightLeft } from "lucide-react";
import { cn } from "../lib/utils";
import TransactionModal from "./TransactionModal";
import PasswordModal from "./PasswordModal";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

interface Transaction {
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    category: string;
    note?: string;
    date: string;
    isPrivate: boolean;
    accountId: string;
    account: {
        name: string;
    };
}

interface TransactionListProps {
    className?: string;
    limit?: number;
    showControls?: boolean;
    title?: string;
    headerAction?: React.ReactNode;
}

export default function TransactionList({ className, limit = 20, showControls = true, title, headerAction }: TransactionListProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Privacy State
    const [showPrivate, setShowPrivate] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTransactions = async (page = 1) => {
        setLoading(true);
        try {
            const params: any = { page, limit };
            const res = await axios.get(`/api/transactions`, { params });
            // Handle both old array format (fallback) and new object format
            if (Array.isArray(res.data)) {
                setTransactions(res.data);
            } else {
                setTransactions(res.data.data);
                setTotalPages(res.data.meta.totalPages);
            }
        } catch (error) {
            console.error("Failed to fetch transactions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions(currentPage);
    }, [currentPage, limit]);

    const togglePrivacy = () => {
        if (showPrivate) {
            setShowPrivate(false);
        } else {
            if (user?.preferences?.requirePasswordForIncome) {
                setShowPasswordModal(true);
            } else {
                setShowPrivate(true);
            }
        }
    };

    const handlePasswordSuccess = () => {
        setShowPrivate(true);
        setShowPasswordModal(false);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            // Scroll to top of list if needed, or maybe just list top
        }
    };

    const filteredTransactions = transactions.filter(tx =>
        tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.account.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={cn("flex flex-col gap-6", className)}>
            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onSuccess={handlePasswordSuccess}
            />

            {/* Header & Controls */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">{title || t('transactions')}</h2>
                        <p className="text-sm text-[var(--text-secondary)] truncate">{t('trackActivity')}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {headerAction ? headerAction : (
                            <button
                                onClick={togglePrivacy}
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all"
                                title={showPrivate ? t('hidePrivate') : t('showPrivate')}
                            >
                                {showPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                {showControls && (
                    <div className="flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                className="w-full h-12 pl-12 pr-4 rounded-xl bg-white border border-transparent focus:border-[var(--primary)] outline-none transition-all shadow-sm truncate"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Filter button could go here */}
                    </div>
                )}
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-[2rem] p-3 sm:p-6 shadow-sm">
                {loading ? (
                    <div className="text-center text-gray-400 py-10">{t('loadingTransactions')}</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">{t('noTransactions')}</div>
                ) : (
                    <div className="space-y-2 sm:space-y-4">
                        {filteredTransactions.map((tx) => {
                            const isMasked = tx.isPrivate && !showPrivate;

                            return (
                                <div key={tx.id} className="relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-1",
                                        tx.type === 'INCOME' ? "bg-green-100 text-green-600" :
                                            tx.type === 'TRANSFER' ? (
                                                tx.category === 'Transfer In' ? "bg-teal-100 text-teal-600" : "bg-rose-100 text-rose-600"
                                            ) : "bg-red-100 text-red-600"
                                    )}>
                                        {tx.type === 'INCOME' ? <TrendingUp size={20} /> :
                                            tx.type === 'TRANSFER' ? <ArrowRightLeft size={20} /> : <TrendingDown size={20} />}
                                    </div>

                                    <div className="flex-1 min-w-0 pt-0.5 pr-8 sm:pr-0">
                                        <div className="font-bold text-[var(--text-primary)] break-words leading-tight mb-1">{tx.category}</div>
                                        <div className="text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-0.5">
                                            <span className="shrink-0 font-medium">{new Date(tx.date).toLocaleDateString()}</span>
                                            <span className="hidden sm:inline text-gray-300">•</span>
                                            <span className="break-words text-gray-500">{tx.account.name}</span>
                                        </div>
                                        {tx.note && <div className="text-xs text-gray-400 mt-1 italic break-words">{tx.note}</div>}
                                    </div>

                                    <div className={cn(
                                        "text-lg font-bold flex items-center justify-end whitespace-nowrap pt-0.5 shrink-0",
                                        tx.type === 'INCOME' ? "text-green-600" :
                                            tx.type === 'TRANSFER' ? (
                                                tx.category === 'Transfer In' ? "text-teal-600" : "text-rose-600"
                                            ) : "text-red-600"
                                    )}>
                                        {isMasked ? "******" : (
                                            <>
                                                {tx.type === 'INCOME' || (tx.type === 'TRANSFER' && tx.category === 'Transfer In') ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                                            </>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTransaction(tx);
                                            setIsModalOpen(true);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                                        title={t('editTransaction')}
                                    >
                                        <PenLine size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && transactions.length > 0 && (
                    <div className="flex justify-center items-center gap-4 mt-8 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                        >
                            {t('previous')}
                        </button>
                        <span className="text-sm font-medium text-gray-600">
                            {t('pageOf').replace('{current}', currentPage.toString()).replace('{total}', totalPages.toString())}
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--primary)] bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:bg-transparent disabled:text-gray-400 transition-all"
                        >
                            {t('next')}
                        </button>
                    </div>
                )}
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTransaction(null);
                    fetchTransactions(currentPage);
                }}
                transactionToEdit={editingTransaction}
            />
        </div>
    );
}
