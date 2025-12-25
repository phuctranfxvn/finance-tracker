import { useEffect, useState } from "react";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";
import { Plus, PiggyBank, CheckCircle, Pencil, RotateCcw, X, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

interface Saving {
    id: string;
    bankName: string; // ... rest of interface
    amount: number;
    interestRate: number;
    startDate: string;
    endDate?: string;
    isSettled: boolean;
    sourceAccount?: { name: string };
    category?: { id: string; name: string; icon: string; color: string };
    savingCategoryId?: string;
}

interface SavingCategory {
    id: string;
    name: string;
    icon?: string;
    color?: string;
}

export default function Savings() {
    const { t } = useLanguage();
    const [savings, setSavings] = useState<Saving[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [settleSavingId, setSettleSavingId] = useState<string | null>(null);
    const [targetWalletId, setTargetWalletId] = useState("");

    // UI States
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Form State
    const [bankName, setBankName] = useState("");
    const [amount, setAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState("");
    const [sourceAccountId, setSourceAccountId] = useState("");
    const [savingCategoryId, setSavingCategoryId] = useState("");
    const [wallets, setWallets] = useState<any[]>([]);
    const [categories, setCategories] = useState<SavingCategory[]>([]);

    const fetchSavings = async () => {
        try {
            const res = await axios.get("/api/savings");
            setSavings(res.data);
        } catch (error) {
            console.error("Failed to fetch savings");
        }
    };

    const fetchWallets = async () => {
        const res = await axios.get("/api/wallets");
        setWallets(res.data);
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get("/api/saving-categories");
            if (Array.isArray(res.data)) {
                setCategories(res.data);
            } else {
                setCategories([]);
            }
        } catch (error) {
            console.error("Failed to fetch saving categories");
            setCategories([]);
        }
    };

    useEffect(() => {
        fetchSavings();
        fetchCategories();
    }, []);

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`/api/savings/${editingId}`, {
                    bankName,
                    amount: Number(amount),
                    interestRate: Number(interestRate),
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : undefined,
                    savingCategoryId: savingCategoryId || undefined
                });
            } else {
                await axios.post("/api/savings", {
                    bankName,
                    amount: Number(amount),
                    interestRate: Number(interestRate),
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : undefined,
                    sourceAccountId: sourceAccountId || undefined,
                    savingCategoryId: savingCategoryId || undefined,
                    userId: "demo-user-123"
                });
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchSavings();
            resetForm();
            setToast({ message: t('savedSuccess'), type: 'success' });
        } catch (error) {
            setToast({ message: t('failed'), type: 'error' });
        }
    };

    const resetForm = () => {
        setBankName("");
        setAmount("");
        setInterestRate("");
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate("");
        setSourceAccountId("");
        setSavingCategoryId("");
        setEditingId(null);
    };

    const handleEdit = (saving: Saving) => {
        setEditingId(saving.id);
        setBankName(saving.bankName);
        setAmount(saving.amount.toString());
        setInterestRate(saving.interestRate.toString());
        setStartDate(new Date(saving.startDate).toISOString().split('T')[0]);
        setEndDate(saving.endDate ? new Date(saving.endDate).toISOString().split('T')[0] : "");
        setSavingCategoryId(saving.savingCategoryId || "");
        setIsModalOpen(true);
    };

    const handleUnsettle = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: t('unsettle'),
            message: t('confirmUnsettle'),
            onConfirm: async () => {
                try {
                    await axios.post(`/api/savings/${id}/unsettle`);
                    fetchSavings();
                    setToast({ message: t('unsettledSuccess'), type: 'success' });
                    setConfirmModal(null);
                } catch (error) {
                    setToast({ message: t('failed'), type: 'error' });
                }
            }
        });
    };

    const handleSettleClick = (id: string) => {
        setSettleSavingId(id);
        fetchWallets();
        // pre-select first wallet if available
        if (wallets.length > 0) setTargetWalletId(wallets[0].id);
    };

    const handleConfirmSettle = async () => {
        if (!settleSavingId || !targetWalletId) return;

        try {
            await axios.post(`/api/savings/${settleSavingId}/settle`, {
                targetAccountId: targetWalletId
            });
            fetchSavings();
            setSettleSavingId(null);
            setTargetWalletId("");
            setToast({ message: t('settledSuccess'), type: 'success' });
        } catch (error) {
            setToast({ message: t('failed'), type: 'error' });
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-end items-center px-4 md:px-8 pt-0 pb-4 shrink-0">
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); fetchWallets(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-full font-semibold shadow-lg shadow-pink-200 hover:translate-y-[-2px] transition-all"
                >
                    <Plus size={18} />
                    <span>{t('newDeposit')}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 hide-scrollbar flex flex-col gap-6">
                {/* Grouped Savings */}
                {Object.entries(savings.reduce((acc, saving) => {
                    const catId = saving.savingCategoryId || 'uncategorized';
                    if (!acc[catId]) acc[catId] = [];
                    acc[catId].push(saving);
                    return acc;
                }, {} as Record<string, Saving[]>)).sort((a, b) => {
                    // Sort by category name? Or just put uncategorized last
                    if (a[0] === 'uncategorized') return 1;
                    if (b[0] === 'uncategorized') return -1;
                    return 0;
                }).map(([catId, groupSavings]) => {
                    const category = categories.find(c => c.id === catId);
                    const totalAmount = groupSavings.reduce((sum, s) => sum + Number(s.amount), 0);

                    return (
                        <div key={catId} className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <span className="text-2xl">{category?.icon || "📂"}</span>
                                    {category?.name || t('uncategorized')}
                                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full ml-2">
                                        {groupSavings.length}
                                    </span>
                                </h3>
                                <div className="font-bold text-gray-900">
                                    {t('totalLabel')} {totalAmount.toLocaleString()} ₫
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groupSavings.map((saving) => (
                                    <div
                                        key={saving.id}
                                        className={cn(
                                            "relative p-5 rounded-[1.5rem] bg-white border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md",
                                            saving.isSettled ? "opacity-60 grayscale" : ""
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center">
                                                <PiggyBank size={24} />
                                            </div>
                                            <div className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold",
                                                saving.isSettled ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-600"
                                            )}>
                                                {saving.isSettled ? t('settled') : t('active')}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-gray-500 font-medium mb-1">{saving.bankName}</div>
                                            <div className="text-3xl font-bold text-[var(--text-primary)]">
                                                {Number(saving.amount).toLocaleString()} ₫
                                            </div>
                                            <div className="flex justify-between items-end mt-1">
                                                <div className="text-xs text-pink-500 font-bold">
                                                    +{Number(saving.interestRate)}% {t('perYear')}
                                                </div>
                                                {saving.endDate && (
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-gray-400 font-medium">{t('estMaturity')}</div>
                                                        <div className="text-sm font-bold text-green-600">
                                                            {(saving.amount * (1 + (saving.interestRate / 100) * ((new Date(saving.endDate).getTime() - new Date(saving.startDate).getTime()) / (1000 * 60 * 60 * 24)) / 365)).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₫
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-3 font-medium flex gap-2">
                                                <span>{new Date(saving.startDate).toLocaleDateString()}</span>
                                                {saving.endDate && (
                                                    <>
                                                        <span>→</span>
                                                        <span>{new Date(saving.endDate).toLocaleDateString()}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            {!saving.isSettled ? (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(saving)}
                                                        className="flex-1 py-2 rounded-xl border border-gray-100 text-gray-600 hover:bg-gray-50 text-xs font-bold flex items-center justify-center gap-1"
                                                    >
                                                        <Pencil size={14} /> {t('edit')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleSettleClick(saving.id)}
                                                        className="flex-[2] py-2 rounded-xl bg-black text-white hover:bg-gray-800 text-xs font-bold flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle size={14} /> {t('settleWithdraw')}
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnsettle(saving.id)}
                                                    className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 text-xs font-bold flex items-center justify-center gap-2"
                                                >
                                                    <RotateCcw size={14} /> {t('unsettle')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {savings.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                        <PiggyBank size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-medium">{t('noSavings')}</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <form onSubmit={handleCreateOrUpdate} className="bg-white rounded-[2rem] p-8 w-full max-w-md z-10 shadow-2xl animate-in zoom-in duration-200 flex flex-col gap-4">
                        <h3 className="text-xl font-bold mb-2">{editingId ? t('edit') : t('newDeposit')}</h3>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('bankName')}</label>
                            <input required type="text" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border border-transparent focus:border-pink-500" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. SCB, TPBank" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('category')}</label>
                            <div className="flex gap-2 flex-wrap mt-1">
                                {categories.map(cat => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        onClick={() => setSavingCategoryId(cat.id)}
                                        className={cn(
                                            "px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all",
                                            savingCategoryId === cat.id ? "bg-pink-500 text-white border-pink-500" : "bg-white text-gray-600 border-gray-200 hover:border-pink-300"
                                        )}
                                    >
                                        <span>{cat.icon}</span>
                                        <span>{cat.name}</span>
                                    </button>
                                ))}
                                {categories.length === 0 && <p className="text-xs text-gray-400">{t('noCategoriesInSettings')}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('amount')}</label>
                                <input required type="number" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border border-transparent focus:border-pink-500" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('interestRate')}</label>
                                <input required type="number" step="0.1" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border border-transparent focus:border-pink-500" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="6.5" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('startDate')}</label>
                                <input required type="date" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border border-transparent focus:border-pink-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('endDate')}</label>
                                <input type="date" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border border-transparent focus:border-pink-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        {!editingId && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('sourceWallet')}</label>
                                <div className="flex gap-2 overflow-x-auto py-2">
                                    {wallets.map(w => (
                                        <button
                                            type="button"
                                            key={w.id}
                                            onClick={() => setSourceAccountId(w.id)}
                                            className={cn(
                                                "px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border",
                                                sourceAccountId === w.id ? "bg-black text-white" : "bg-white text-gray-500"
                                            )}
                                        >
                                            {w.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button type="submit" className="h-12 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-colors mt-2">
                            {editingId ? t('edit') : t('depositNow')}
                        </button>
                    </form>
                </div>
            )}

            {/* Settle Modal */}
            {settleSavingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSettleSavingId(null)}></div>
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md z-10 shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">{t('selectTargetWallet')}</h3>

                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-6">
                            {wallets.map(w => (
                                <button
                                    key={w.id}
                                    onClick={() => setTargetWalletId(w.id)}
                                    className={cn(
                                        "p-4 rounded-xl text-left border transition-all flex justify-between items-center",
                                        targetWalletId === w.id
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-gray-100 hover:bg-gray-50"
                                    )}
                                >
                                    <span className="font-bold">{w.name}</span>
                                    {targetWalletId === w.id && <CheckCircle size={20} className="fill-green-500 text-white" />}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSettleSavingId(null)}
                                className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleConfirmSettle}
                                disabled={!targetWalletId}
                                className="flex-1 h-12 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('settleConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirm Modal */}
            {confirmModal && confirmModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm z-10 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{confirmModal.title}</h3>
                                <p className="text-sm text-gray-500 mt-2">{confirmModal.message}</p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                                >
                                    {t('ok')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 duration-300">
                    <div className={cn(
                        "flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border",
                        toast.type === 'success' ? "bg-white border-green-100 text-green-700" : "bg-white border-red-100 text-red-700"
                    )}>
                        {toast.type === 'success' ? <CheckCircle size={20} className="fill-green-100 text-green-600" /> : <AlertTriangle size={20} className="fill-red-100 text-red-600" />}
                        <span className="font-bold">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
