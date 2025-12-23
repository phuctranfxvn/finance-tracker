"use client";

import { useState, useEffect } from "react";
import { X, Check, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";
import { createTransaction } from "@/app/actions/transactions";
import { getWallets } from "@/app/actions/wallets";

// Need to fetch wallets client side or pass them as props?
// For a modal, fetching client side on open or passing props is fine.
// Let's pass props for simplicity if parent is server component, but parent is client component (TransactionsPage).
// So we'll have to fetch wallets in the parent or here. 
// Since Transactions Page is being converted to Server Component, we can pass wallets as props.
// BUT TransactionsPage was "use client". We need to refactor TransactionsPage to be Server Component too.

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallets: any[]; // Type should be Account[]
}

export default function TransactionModal({ isOpen, onClose, wallets }: TransactionModalProps) {
    const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [isHidden, setIsHidden] = useState(false);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState("Food & Dining");
    const [accountId, setAccountId] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    // Set default wallet
    useEffect(() => {
        if (wallets.length > 0 && !accountId) {
            setAccountId(wallets[0].id);
        }
    }, [wallets, accountId]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!amount || !accountId) return;
        setLoading(true);
        try {
            await createTransaction({
                amount: parseFloat(amount.replace(/,/g, '')), // Handle basic formatting if needed
                type,
                category,
                accountId,
                note,
                isHidden
            });
            onClose();
            setAmount('');
            setNote('');
        } catch (e) {
            alert("Failed to save transaction");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

            <div className="bg-white rounded-[2rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-hover)]">
                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-[var(--border)]">
                        <button
                            onClick={() => setType('EXPENSE')}
                            className={clsx("px-6 py-2 rounded-lg text-sm font-bold transition-all", type === 'EXPENSE' ? "bg-red-500 text-white shadow-md" : "text-[var(--text-secondary)] hover:bg-gray-50")}
                        >
                            Expense
                        </button>
                        <button
                            onClick={() => setType('INCOME')}
                            className={clsx("px-6 py-2 rounded-lg text-sm font-bold transition-all", type === 'INCOME' ? "bg-green-500 text-white shadow-md" : "text-[var(--text-secondary)] hover:bg-gray-50")}
                        >
                            Income
                        </button>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[var(--border)] flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <X size={20} className="text-[var(--text-secondary)]" />
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-6">
                    {/* Amount Input */}
                    <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Amount</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder-gray-300"
                            />
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xl font-bold text-[var(--text-tertiary)]">VND</span>
                        </div>

                        {/* Quick Amounts */}
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                            {[50, 100, 200, 500].map(val => (
                                <button key={val} onClick={() => setAmount((val * 1000).toString())} className="px-4 py-2 bg-[var(--surface-hover)] rounded-xl text-xs font-bold text-[var(--text-secondary)] whitespace-nowrap hover:bg-gray-200">
                                    {val}k
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[var(--text-secondary)]">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full h-12 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium outline-none focus:border-[var(--primary)]"
                            >
                                <option>Food & Dining</option>
                                <option>Transport</option>
                                <option>Shopping</option>
                                <option>Entertainment</option>
                                <option>Bills & Utilities</option>
                                <option>Salary</option>
                                <option>Freelance</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-[var(--text-secondary)]">Wallet</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="w-full h-12 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-medium outline-none focus:border-[var(--primary)]"
                            >
                                {wallets.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} ({Number(w.balance).toLocaleString()})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[var(--text-secondary)]">Note (Optional)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full h-24 rounded-xl border border-[var(--border)] bg-white p-4 text-sm font-medium outline-none focus:border-[var(--primary)] resize-none"
                            placeholder="What is this for?"
                        ></textarea>
                    </div>

                    {/* Income Specific: Hide Amount */}
                    {type === 'INCOME' && (
                        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                    {isHidden ? <EyeOff size={20} /> : <Eye size={20} />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[var(--text-primary)]">Hide Amount</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Requires password to view</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsHidden(!isHidden)}
                                className={clsx("w-12 h-6 rounded-full p-1 transition-colors relative", isHidden ? "bg-[var(--primary)]" : "bg-gray-300")}
                            >
                                <div className={clsx("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", isHidden ? "translate-x-6" : "translate-x-0")}></div>
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full h-14 bg-[var(--text-primary)] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-xl disabled:opacity-50"
                    >
                        {loading ? "Saving..." : <><Check size={20} /> Save Transaction</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
