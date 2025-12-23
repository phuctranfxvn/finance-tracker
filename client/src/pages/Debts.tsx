import { useEffect, useState } from "react";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";
import { Plus, Calendar, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface Debt {
    id: string;
    name: string;
    amount: number;
    remainingAmount: number;
    dueDate?: string;
    isPaid: boolean;
}

export default function Debts() {
    const { t } = useLanguage();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [wallets, setWallets] = useState<any[]>([]);

    // Create Form
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");

    // Pay Modal
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [sourceAccountId, setSourceAccountId] = useState("");

    const fetchDebts = async () => {
        try {
            const res = await axios.get("/api/debts");
            setDebts(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchWallets = async () => {
        try {
            const res = await axios.get("/api/wallets");
            setWallets(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchDebts();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post("/api/debts", {
                name,
                amount: Number(amount),
                dueDate: dueDate || null,
                userId: "demo-user-123"
            });
            setIsModalOpen(false);
            fetchDebts();
            setName(""); setAmount(""); setDueDate("");
        } catch (e) { alert("Failed"); }
    };

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDebt) return;
        try {
            await axios.post(`/api/debts/${selectedDebt.id}/pay`, {
                amount: Number(payAmount),
                sourceAccountId: sourceAccountId || wallets[0]?.id
            });
            setPayModalOpen(false);
            fetchDebts();
            setSelectedDebt(null);
            setPayAmount("");
        } catch (e) { alert("Failed payment"); }
    };

    const openPayModal = (debt: Debt) => {
        setSelectedDebt(debt);
        setPayAmount(debt.remainingAmount.toString());
        fetchWallets();
        setPayModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full gap-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('debts')}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">{t('manageDebts')}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-full font-semibold shadow-lg shadow-red-200 hover:translate-y-[-2px] transition-all"
                >
                    <Plus size={18} />
                    <span>{t('addDebt')}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {debts.map((debt) => (
                    <div
                        key={debt.id}
                        className={cn(
                            "relative p-6 rounded-[2rem] bg-white border border-gray-100 shadow-sm flex flex-col justify-between h-56 transition-all",
                            debt.isPaid ? "opacity-60 grayscale" : "hover:shadow-md"
                        )}
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                                <AlertCircle size={24} />
                            </div>
                            <div className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold",
                                debt.isPaid ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                            )}>
                                {debt.isPaid ? t('paidOff') : t('unpaid')}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500 font-medium mb-1">{debt.name}</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-[var(--text-primary)]">
                                    {Number(debt.remainingAmount).toLocaleString()} ₫
                                </span>
                                <span className="text-sm text-gray-400 line-through">
                                    {Number(debt.amount).toLocaleString()}
                                </span>
                            </div>
                            {debt.dueDate && (
                                <div className="text-xs text-red-400 font-medium mt-1 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {t('due')}: {new Date(debt.dueDate).toLocaleDateString()}
                                </div>
                            )}
                        </div>

                        {!debt.isPaid && (
                            <button
                                onClick={() => openPayModal(debt)}
                                className="mt-4 w-full py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-bold flex items-center justify-center gap-2"
                            >
                                {t('payNow')}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <form onSubmit={handleCreate} className="bg-white rounded-[2rem] p-8 w-full max-w-md z-10 shadow-2xl flex flex-col gap-4">
                        <h3 className="text-xl font-bold mb-2">{t('addDebt')}</h3>
                        <input required type="text" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border focus:border-red-500" value={name} onChange={e => setName(e.target.value)} placeholder="Title (e.g. Borrowed from Mom)" />
                        <input required type="number" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border focus:border-red-500" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
                        <input type="date" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border focus:border-red-500" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        <button type="submit" className="h-12 bg-red-500 text-white rounded-xl font-bold mt-2">{t('addDebt')}</button>
                    </form>
                </div>
            )}

            {/* Pay Modal */}
            {payModalOpen && selectedDebt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setPayModalOpen(false)}></div>
                    <form onSubmit={handlePay} className="bg-white rounded-[2rem] p-8 w-full max-w-md z-10 shadow-2xl flex flex-col gap-4">
                        <h3 className="text-xl font-bold mb-2">{t('payDebt')}: {selectedDebt.name}</h3>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('paymentAmount')}</label>
                            <input required type="number" className="w-full h-12 px-4 rounded-xl bg-gray-50 mt-1 outline-none focus:bg-white border focus:border-red-500" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('deductFrom')}</label>
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

                        <button type="submit" className="h-12 bg-red-500 text-white rounded-xl font-bold mt-2"> {t('confirmPayment')}</button>
                    </form>
                </div>
            )}
        </div>
    );
}
