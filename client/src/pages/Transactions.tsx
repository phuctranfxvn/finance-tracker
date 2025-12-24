import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Search, Filter, Plus, TrendingUp, TrendingDown, Eye, EyeOff, PenLine } from "lucide-react";
import { cn } from "../lib/utils";
import TransactionModal from "../components/TransactionModal";
import PasswordModal from "../components/PasswordModal";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

interface Transaction {
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    category: string;
    note?: string;
    date: string;
    isPrivate: boolean;
    accountId: string;
    account: {
        name: string;
    };
}

export default function Transactions() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Filter params
    const [searchParams] = useSearchParams();
    const accountId = searchParams.get('accountId');

    // Privacy State
    const [showPrivate, setShowPrivate] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    const fetchTransactions = async (page = 1) => {
        setLoading(true);
        try {
            const params: any = { page, limit };
            if (accountId) params.accountId = accountId;

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
    }, [currentPage, accountId]);

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
            // Scroll to top of list
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const filteredTransactions = transactions.filter(tx =>
        tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.account.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-8 pb-8">
            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onSuccess={handlePasswordSuccess}
            />

            {/* Header */}
            <div className="flex justify-between items-center gap-4">
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] truncate">{t('transactions')}</h2>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{t('trackActivity')}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={togglePrivacy}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all"
                        title={showPrivate ? t('hidePrivate') : t('showPrivate')}
                    >
                        {showPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-[var(--primary)] text-white rounded-full font-semibold shadow-lg shadow-orange-200 hover:translate-y-[-2px] transition-all"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">{t('newTransaction')}</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
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
                <button className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-gray-500 hover:text-[var(--primary)] shadow-sm shrink-0">
                    <Filter size={20} />
                </button>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm">
                {loading ? (
                    <div className="text-center text-gray-400 py-10">Loading transactions...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">No transactions found</div>
                ) : (
                    <div className="space-y-4">
                        {filteredTransactions.map((tx) => {
                            const isMasked = tx.isPrivate && !showPrivate;

                            return (
                                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                                        tx.type === 'INCOME' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                    )}>
                                        {tx.type === 'INCOME' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-[var(--text-primary)] break-words leading-tight mb-1">{tx.category}</div>
                                        <div className="text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-0.5">
                                            <span className="shrink-0 font-medium">{new Date(tx.date).toLocaleDateString()}</span>
                                            <span className="hidden sm:inline text-gray-300">•</span>
                                            <span className="break-words text-gray-500">{tx.account.name}</span>
                                        </div>
                                        {tx.note && <div className="text-xs text-gray-400 mt-1 italic break-words">{tx.note}</div>}
                                    </div>

                                    <div className="text-right flex items-center gap-2 shrink-0">
                                        <div className={cn(
                                            "text-lg font-bold flex items-center justify-end whitespace-nowrap",
                                            tx.type === 'INCOME' ? "text-green-600" : "text-red-600"
                                        )}>
                                            {isMasked ? "******" : (
                                                <>
                                                    {tx.type === 'INCOME' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                                                </>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingTransaction(tx);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 rounded-full hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                                            title={t('editTransaction')}
                                        >
                                            <PenLine size={18} />
                                        </button>
                                    </div>
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
