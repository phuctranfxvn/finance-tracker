"use client";

import { useState } from "react";
import { Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";
import TransactionModal from "@/components/Transaction/TransactionModal";

// Need to define types if not available globally
interface Transaction {
    id: string;
    title?: string; // Prisma model doesn't have title, maybe use category or note?
    amount: any; // Decimal
    type: string;
    category: string | null;
    date: Date;
    account: { name: string };
    isHidden: boolean;
    note: string | null;
}

export default function TransactionsList({ initialTransactions, wallets }: { initialTransactions: any[], wallets: any[] }) {
    const [revealedIds, setRevealedIds] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // In a real app, we might want to re-fetch on focus or use a router refresh, 
    // but Server Actions revalidatePath handles the data update on the server. 
    // Next.js will re-render the Server Component on navigation. 
    // For immediate UI update after modal close without full reload, we can trust Next.js cache revalidation or use router.refresh().

    const toggleReveal = (id: string) => {
        if (revealedIds.includes(id)) {
            setRevealedIds(revealedIds.filter(i => i !== id));
        } else {
            const password = prompt("Enter password to reveal:");
            if (password === "1234") {
                setRevealedIds([...revealedIds, id]);
            } else if (password !== null) {
                alert("Wrong password!");
            }
        }
    };

    return (
        <>
            <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} wallets={wallets} />

            <div className="flex-1 overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Transactions</h2>
                    <div className="flex gap-4">
                        <button className="px-4 py-2 bg-white border border-[var(--border)] rounded-xl flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
                            <Filter size={16} /> Filter
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2 bg-[var(--primary)] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 hover:scale-105 transition-transform"
                        >
                            <Plus size={18} />
                            New Transaction
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4 pb-20">
                    {initialTransactions.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">No transactions yet</div>
                    ) : initialTransactions.map((tx: any) => (
                        <div key={tx.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between hover:bg-white/80 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                    tx.type === 'INCOME' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                )}>
                                    {tx.type === 'INCOME' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                                </div>
                                <div>
                                    <div className="font-bold text-[var(--text-primary)] text-lg">{tx.note || tx.category || "Untitled"}</div>
                                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                        <span>{new Date(tx.date).toLocaleDateString()}</span> • <span>{tx.account?.name}</span> • <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[var(--text-secondary)]">{tx.category}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={clsx("font-bold text-lg", tx.type === 'INCOME' ? "text-green-600" : "text-red-600")}>
                                    {tx.isHidden && !revealedIds.includes(tx.id) ? (
                                        <span className="tracking-widest">****</span>
                                    ) : (
                                        <span>{tx.type === 'INCOME' ? '+' : '-'}{Number(tx.amount).toLocaleString()} ₫</span>
                                    )}
                                </div>
                                {tx.isHidden && (
                                    <button onClick={() => toggleReveal(tx.id)} className="p-2 text-gray-400 hover:text-[var(--primary)] transition-colors">
                                        {revealedIds.includes(tx.id) ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
