import { useState, useEffect } from "react";
import axios from "axios";
import { X, ArrowRight, Wallet, Lock } from "lucide-react";
import { cn, formatNumber, parseNumber } from "../lib/utils";

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionToEdit?: {
        id: string;
        amount: number;
        type: "INCOME" | "EXPENSE" | "TRANSFER";
        category: string;
        accountId: string;
        note?: string;
        date: string;
        isPrivate: boolean;
    } | null;
}

export default function TransactionModal({ isOpen, onClose, transactionToEdit }: TransactionModalProps) {
    const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
    const [wallets, setWallets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchWallets();
            fetchCategories();
        }
    }, [isOpen]);

    // Form State
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [accountId, setAccountId] = useState("");
    const [note, setNote] = useState("");

    // Derived State
    const selectedWallet = wallets.find(w => w.id === accountId);
    const currencyLabel = selectedWallet?.currency || 'VND';

    // Helper for local datetime string
    const getCurrentLocalDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    const [date, setDate] = useState(getCurrentLocalDateTime());
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchWallets();
            if (transactionToEdit) {
                // Editing Mode
                setAmount(formatNumber(transactionToEdit.amount));
                setType(transactionToEdit.type);
                setCategory(transactionToEdit.category);
                setAccountId(transactionToEdit.accountId);
                setNote(transactionToEdit.note || "");
                // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
                const d = new Date(transactionToEdit.date);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                setDate(d.toISOString().slice(0, 16));
                setIsHidden(transactionToEdit.isPrivate);
            } else {
                // Create Mode
                setAmount("");
                setCategory("");
                setNote("");
                setDate(getCurrentLocalDateTime());
                setIsHidden(false);
            }
        }
    }, [isOpen, transactionToEdit]);

    const fetchWallets = async () => {
        try {
            const res = await axios.get("/api/wallets");
            setWallets(res.data);
            if (res.data.length > 0 && !accountId && !transactionToEdit) {
                setAccountId(res.data[0].id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get("/api/categories");
            setCategories(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {


            if (transactionToEdit) {
                await axios.put(`/api/transactions/${transactionToEdit.id}`, {
                    amount: parseNumber(amount),
                    type,
                    category,
                    accountId,
                    note,
                    date,
                    isPrivate: type === 'INCOME' ? isHidden : false,
                }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
            } else {
                await axios.post("/api/transactions", {
                    amount: parseNumber(amount),
                    type,
                    category,
                    accountId,
                    note,
                    date,
                    isPrivate: type === 'INCOME' ? isHidden : false,
                    // userId is handled by backend token
                }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
            }

            onClose();
        } catch (error) {
            alert(transactionToEdit ? "Failed to update transaction" : "Failed to create transaction");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="bg-white w-full md:max-w-lg md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl z-10 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="p-6 flex justify-between items-center border-b border-gray-100">
                    <h3 className="text-xl font-bold">{transactionToEdit ? 'Edit Transaction' : 'New Transaction'}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Toggle Type */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
                        {type === 'TRANSFER' ? (
                            <div className="w-full py-3 text-sm font-bold text-center bg-blue-100 text-blue-600 rounded-xl">
                                Transfer Transaction
                            </div>
                        ) : (
                            ["EXPENSE", "INCOME"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setType(t as any)}
                                    className={cn(
                                        "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
                                        type === t
                                            ? "bg-white text-[var(--primary)] shadow-md"
                                            : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {t}
                                </button>
                            ))
                        )}
                    </div>

                    <form id="tx-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
                        {/* Amount - Big Input */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Amount</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    autoFocus
                                    className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-gray-200 text-[var(--text-primary)]"
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => {
                                        // Allow only numbers and commas/dots
                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                        setAmount(formatNumber(val.replace(/,/g, '')));
                                    }}
                                />
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 font-medium text-gray-400">{currencyLabel}</span>
                            </div>
                        </div>

                        {/* Privacy Toggle for Income */}
                        {type === 'INCOME' && (
                            <button
                                type="button"
                                onClick={() => setIsHidden(!isHidden)}
                                className={cn(
                                    "p-4 rounded-xl flex items-center justify-between border transition-all w-full",
                                    isHidden
                                        ? "bg-blue-50 border-blue-200 shadow-sm"
                                        : "bg-gray-50 border-transparent hover:bg-gray-100"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                        isHidden ? "bg-blue-100 text-blue-500" : "bg-gray-200 text-gray-400"
                                    )}>
                                        <Lock size={18} />
                                    </div>
                                    <div className="text-left">
                                        <div className={cn("font-bold text-sm", isHidden ? "text-blue-900" : "text-gray-900")}>
                                            Private Income
                                        </div>
                                        <div className={cn("text-xs", isHidden ? "text-blue-500" : "text-gray-500")}>
                                            {isHidden ? "Hidden from dashboard" : "Visible on dashboard"}
                                        </div>
                                    </div>
                                </div>

                                <div className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                    isHidden ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500"
                                )}>
                                    {isHidden ? "Enabled" : "Enable"}
                                </div>
                            </button>
                        )}

                        {/* Wallet Selection */}
                        {/* Wallet Selection */}
                        {type !== 'TRANSFER' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Wallet / Account</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {wallets.map(w => (
                                        <button
                                            type="button"
                                            key={w.id}
                                            onClick={() => setAccountId(w.id)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-3 rounded-2xl whitespace-nowrap border transition-all",
                                                accountId === w.id
                                                    ? "bg-black text-white border-black shadow-lg"
                                                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                            )}
                                        >
                                            <Wallet size={16} />
                                            <span className="font-semibold text-sm">{w.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {type !== 'TRANSFER' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Category</label>
                                    <select
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border-r-[16px] border-transparent outline-none focus:bg-white font-medium"
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        required={type !== 'TRANSFER'}
                                    >
                                        <option value="" disabled>Select...</option>
                                        {categories.filter(c => c.type === type).map(c => (
                                            <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                                        ))}
                                        {categories.filter(c => c.type === type).length === 0 && (
                                            <option value="" disabled>No categories found</option>
                                        )}
                                    </select>
                                </div>
                            )}
                            {type !== 'TRANSFER' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-transparent outline-none focus:bg-white font-medium"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        required={type !== 'TRANSFER'}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Note</label>
                            <textarea
                                className="w-full p-4 rounded-xl bg-gray-50 border border-transparent outline-none focus:bg-white focus:border-[var(--primary)] font-medium resize-none h-24"
                                placeholder="Add a note..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-white md:rounded-b-[2.5rem]">
                    <button
                        type="submit"
                        form="tx-form"
                        className="w-full h-14 rounded-2xl bg-[var(--primary)] text-white font-bold text-lg shadow-xl shadow-orange-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span>{transactionToEdit ? 'Update' : 'Confirm'} {type === 'INCOME' ? 'Income' : type === 'TRANSFER' ? 'Transfer' : 'Expense'}</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
