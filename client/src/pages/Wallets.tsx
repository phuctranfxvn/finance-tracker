import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Plus, Wallet as WalletIcon, PenLine, RotateCcw, Landmark, Trash2, History, CreditCard, GripVertical, ArrowRightLeft, Check } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn, formatNumber, parseNumber } from "../lib/utils";

interface Wallet {
    id: string;
    name: string;
    type: "WALLET" | "BANK" | "CREDIT_CARD";
    balance: number;
    currency: string;
    bankName?: string;
    creditCardType?: string;
    showInQuickAdd?: boolean;
    _count?: {
        transactions: number;
    };
}

import { CREDIT_CARD_TYPES, VIETNAM_BANKS } from "../lib/constants";

export default function Wallets() {
    const { user, token } = useAuth(); // Use Auth Context
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Wallet Form State
    const [newWalletName, setNewWalletName] = useState("");
    const [newWalletType, setNewWalletType] = useState<"WALLET" | "BANK" | "CREDIT_CARD">("WALLET");
    const [newWalletCurrency, setNewWalletCurrency] = useState("VND");
    const [newWalletBalance, setNewWalletBalance] = useState("");
    const [selectedBankCode, setSelectedBankCode] = useState("");
    const [selectedCreditCardType, setSelectedCreditCardType] = useState("");

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
                    creditCardType: newWalletType === 'CREDIT_CARD' ? selectedCreditCardType : undefined,
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
            setSelectedCreditCardType("");
            setNewWalletType("WALLET");
        } catch (error) {
            alert(editingWallet ? "Failed to update wallet" : "Failed to create wallet");
        }
    };

    const handleOpenEdit = (wallet: Wallet) => {
        setEditingWallet(wallet);
        setNewWalletName(wallet.name);
        setNewWalletType(wallet.type);
        setNewWalletBalance(wallet.balance.toString());
        setNewWalletCurrency(wallet.currency);
        if (wallet.bankName) setSelectedBankCode(wallet.bankName);
        if (wallet.creditCardType) setSelectedCreditCardType(wallet.creditCardType);
        setIsModalOpen(true);
    };

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(wallets);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Optimistic update
        setWallets(items);

        // Prepare bulk update payload
        const updates = items.map((w, index) => ({
            id: w.id,
            sortOrder: index
        }));

        try {
            await axios.put("/api/wallets/reorder", { items: updates }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Failed to reorder wallets", error);
            fetchWallets(); // Revert on error
        }
    };



    // Balance Adjustment State
    const [adjustWalletId, setAdjustWalletId] = useState<string | null>(null);
    const [adjustBalanceValue, setAdjustBalanceValue] = useState("");

    // Transfer State
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferFromId, setTransferFromId] = useState("");
    const [transferToId, setTransferToId] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferNote, setTransferNote] = useState("");
    const [showTransferSuccess, setShowTransferSuccess] = useState(false);

    const handleOpenTransfer = () => {
        if (wallets.length >= 2) {
            setTransferFromId("");
            setTransferToId("");
            setIsTransferModalOpen(true);
        } else {
            alert(t('needTwoWallets'));
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !token) return;

        try {
            await axios.post("/api/transactions/transfer", {
                fromWalletId: transferFromId,
                toWalletId: transferToId,
                amount: parseNumber(transferAmount),
                description: transferNote
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsTransferModalOpen(false);
            setTransferAmount("");
            setTransferNote("");
            fetchWallets();
            // Show success message
            setShowTransferSuccess(true);
            setTimeout(() => setShowTransferSuccess(false), 2000);
        } catch (error) {
            console.error("Transfer failed", error);
            alert("Transfer failed");
        }
    };

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

    const formatCurrency = (num: number, currency: string) => {
        const options: Intl.NumberFormatOptions = {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        };
        const formatted = num.toLocaleString(undefined, options);
        return `${formatted} ${currency === 'VND' ? '₫' : '$'}`;
    };

    return (
        <div className="flex flex-col min-h-full gap-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('myWallets')}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">{t('manageWallets')}</p>
                </div>
                <button
                    onClick={handleOpenTransfer}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold shadow-lg hover:bg-orange-600 transition-colors"
                >
                    <ArrowRightLeft size={20} />
                    {t('transfer')}
                </button>
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-10">Loading wallets...</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="wallets" direction="horizontal">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            >
                                {wallets.map((wallet, index) => (
                                    <Draggable key={wallet.id} draggableId={wallet.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={cn(
                                                    "relative p-6 rounded-[2rem] h-48 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-xl group",
                                                    wallet.type === 'BANK'
                                                        ? "bg-gradient-to-br from-white to-gray-50 text-gray-900 border border-gray-200"
                                                        : wallet.type === 'CREDIT_CARD'
                                                            ? "bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none shadow-xl"
                                                            : "bg-white text-[var(--text-primary)] border border-[var(--border)]"
                                                )}
                                                style={{ ...provided.draggableProps.style }}
                                            >
                                                {/* Background Pattern / Watermark for Bank Cards */}
                                                {(wallet.type === 'BANK' || wallet.type === 'CREDIT_CARD') && wallet.bankName && (
                                                    <div className="absolute -bottom-6 -right-6 w-48 h-48 opacity-[0.25] pointer-events-none rotate-12">
                                                        <img
                                                            src={VIETNAM_BANKS.find(b => b.code === wallet.bankName)?.logo || "https://api.vietqr.io/img/VCB.png"}
                                                            alt=""
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start z-10">
                                                    <div className="flex items-center gap-2">
                                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 -ml-2 rounded hover:bg-black/5 text-gray-400">
                                                            <GripVertical size={20} />
                                                        </div>
                                                        {wallet.type === 'CREDIT_CARD' && wallet.creditCardType ? (
                                                            <div className="h-12 w-auto">
                                                                <img
                                                                    src={CREDIT_CARD_TYPES.find(c => c.code === wallet.creditCardType)?.logo}
                                                                    alt={wallet.creditCardType}
                                                                    className="h-full w-auto object-contain"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className={cn(
                                                                "flex items-center justify-center w-16 h-16 rounded-2xl text-xl transition-all",
                                                                wallet.type === 'BANK' ? "bg-blue-50 text-blue-500" : wallet.type === 'CREDIT_CARD' ? "bg-white/10 text-white" : "bg-orange-50 text-orange-500"
                                                            )}>
                                                                {wallet.type === 'BANK' ? <Landmark size={24} /> : wallet.type === 'CREDIT_CARD' ? <CreditCard size={24} /> : <WalletIcon size={24} />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">

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
                                                        {(!wallet._count?.transactions || wallet._count.transactions === 0) && (
                                                            <button
                                                                onClick={() => handleDeleteWallet(wallet.id)}
                                                                className={cn(
                                                                    "p-2 rounded-full transition-colors hover:bg-red-50 text-gray-300 hover:text-red-500"
                                                                )}
                                                                title={t('deleteWallet')}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <h3 className="text-lg font-bold opacity-90">{wallet.name}</h3>
                                                            {/* Bank Name if available */}
                                                            {wallet.type === 'BANK' && wallet.bankName && (
                                                                <div className="text-xs opacity-70 mt-0.5">
                                                                    {VIETNAM_BANKS.find(b => b.code === wallet.bankName)?.name}
                                                                </div>
                                                            )}
                                                            {/* Card Type if available */}
                                                            {wallet.type === 'CREDIT_CARD' && wallet.creditCardType && (
                                                                <div className="text-xs opacity-70 mt-0.5">
                                                                    {CREDIT_CARD_TYPES.find(c => c.code === wallet.creditCardType)?.name}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xl font-bold tracking-tight">
                                                                {formatCurrency(Number(wallet.balance || 0), wallet.currency)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

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
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
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
                                        <option value="CREDIT_CARD">Credit Card</option>
                                    </select>
                                </div>

                                {(newWalletType === 'BANK' || newWalletType === 'CREDIT_CARD') && (
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

                                {newWalletType === 'CREDIT_CARD' && (
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Card Network</label>
                                        <div className="flex gap-2 p-1">
                                            {CREDIT_CARD_TYPES.map(card => (
                                                <button
                                                    key={card.code}
                                                    type="button"
                                                    onClick={() => setSelectedCreditCardType(card.code)}
                                                    className={cn(
                                                        "flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all h-20",
                                                        selectedCreditCardType === card.code
                                                            ? "border-[var(--primary)] bg-orange-50"
                                                            : "border-gray-100 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <img src={card.logo} alt={card.name} className="h-8 w-auto object-contain" />
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
            {/* Transfer Modal */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)}></div>
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md z-10 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-6 text-orange-500">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                                <ArrowRightLeft size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">{t('transferMoney')}</h3>
                        </div>

                        <form onSubmit={handleTransfer} className="flex flex-col gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">{t('from')}</label>
                                    <select
                                        className="w-full h-12 px-3 rounded-xl bg-gray-50 border-r-[12px] border-transparent outline-none focus:bg-white font-medium text-sm"
                                        value={transferFromId}
                                        onChange={e => setTransferFromId(e.target.value)}
                                    >
                                        <option value="" disabled>{t('selectWallet')}</option>
                                        {wallets.map(w => (
                                            <option key={w.id} value={w.id} disabled={w.id === transferToId}>
                                                {w.name} ({formatCurrency(Number(w.balance), w.currency)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">{t('to')}</label>
                                    <select
                                        className="w-full h-12 px-3 rounded-xl bg-gray-50 border-r-[12px] border-transparent outline-none focus:bg-white font-medium text-sm"
                                        value={transferToId}
                                        onChange={e => setTransferToId(e.target.value)}
                                    >
                                        <option value="" disabled>{t('selectWallet')}</option>
                                        {wallets.map(w => (
                                            <option key={w.id} value={w.id} disabled={w.id === transferFromId}>
                                                {w.name} ({formatCurrency(Number(w.balance), w.currency)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('amount')}</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full h-16 pl-4 pr-12 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 outline-none transition-all font-bold text-3xl text-gray-800"
                                        placeholder="0"
                                        value={transferAmount}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9.,]/g, '');
                                            setTransferAmount(formatNumber(val.replace(/,/g, '')));
                                        }}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('note')}</label>
                                <input
                                    type="text"
                                    className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-orange-500 outline-none transition-all font-medium"
                                    placeholder={t('optionalNote')}
                                    value={transferNote}
                                    onChange={e => setTransferNote(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="flex-1 h-14 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!transferAmount || parseNumber(transferAmount) <= 0 || !transferFromId || !transferToId}
                                    className="flex-1 h-14 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    {t('confirmTransfer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            <div className={cn(
                "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] transition-all duration-300 pointer-events-none",
                showTransferSuccess ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}>
                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold">{t('transferSuccess')}</span>
                </div>
            </div>
        </div>
    );
}
