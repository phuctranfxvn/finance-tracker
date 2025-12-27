
import { useState, useEffect } from "react";
import { Plus, X, Trash2, ChevronDown } from "lucide-react";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";

interface Budget {
    id: string;
    month: number;
    year: number;
    totalAmount: number;
    items?: BudgetItem[];
}

interface BudgetItem {
    id?: string;
    category: string;
    amount: number;
}

interface Category {
    id: string;
    name: string;
    type: "EXPENSE" | "INCOME";
    icon?: string;
}

export default function BudgetManager() {
    const { t } = useLanguage();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

    // Form State
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [items, setItems] = useState<BudgetItem[]>([]);

    useEffect(() => {
        fetchBudgets();
        fetchCategories();
    }, []);

    const fetchBudgets = async () => {
        try {
            const res = await axios.get("/api/budgets");
            setBudgets(res.data);
        } catch (error) {
            console.error("Failed to fetch budgets", error);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get("/api/categories");
            setCategories(res.data.filter((c: Category) => c.type === "EXPENSE"));
        } catch (error) {
            console.error("Failed to fetch categories", error);
        }
    };

    const handleOpenModal = (budget?: Budget) => {
        // Prepare base items from all categories
        const baseItems = categories.map(cat => {
            const existingItem = budget?.items?.find(i => i.category === cat.name);
            return {
                category: cat.name,
                amount: existingItem ? Number(existingItem.amount) : 0,
            };
        });

        // Ensure state is set before opening
        setItems(baseItems);

        if (budget) {
            setEditingBudget(budget);
            setMonth(budget.month);
            setYear(budget.year);
            // If editing, we might need to fetch detailed items if not already populated fully in list
            // But relying on what we have in 'budget' passed from list (which might be summary)
            // If summary list doesn't have items, we need to fetch.
            // Based on list route, we might not have items. Let's fetch details to be sure.
            axios.get(`/api/budgets/${budget.year}/${budget.month}`).then(res => {
                const detailedItems = res.data.items || [];
                // Merge details into baseItems
                const mergedItems = categories.map(cat => {
                    const detail = detailedItems.find((i: any) => i.category === cat.name);
                    return {
                        category: cat.name,
                        amount: detail ? Number(detail.amount) : 0,
                    };
                });
                setItems(mergedItems);
                setIsModalOpen(true);
            });
        } else {
            setEditingBudget(null);
            setMonth(new Date().getMonth() + 1);
            setYear(new Date().getFullYear());
            // items already set to baseItems with 0
            setIsModalOpen(true);
        }
    };

    const handleUpdateAmount = (index: number, value: string) => {
        // Remove non-digits
        const numberVal = parseInt(value.replace(/[^0-9]/g, '') || '0', 10);
        const newItems = [...items];
        newItems[index] = { ...newItems[index], amount: numberVal };
        setItems(newItems);
    };

    const handleSave = async () => {
        try {
            await axios.post("/api/budgets", {
                id: editingBudget?.id,
                month,
                year,
                items: items.filter(i => i.amount > 0)
            });
            setIsModalOpen(false);
            fetchBudgets();
        } catch (error: any) {
            console.error("Failed to save budget", error);
            if (error.response?.data?.error) {
                alert(error.response.data.error);
            } else {
                alert(t('failedToSave') || "Failed to save budget");
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteBudget') || "Delete this budget?")) return;
        try {
            await axios.delete(`/api/budgets/${id}`);
            fetchBudgets();
        } catch (error) {
            console.error(error);
        }
    }

    const totalBudgetAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">💰</span>
                    {t('monthlyBudgets') || "Monthly Budgets"}
                </h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-black text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                    <Plus size={14} />
                    {t('addBudget') || "Set Budget"}
                </button>
            </div>

            <div className="space-y-3">
                {budgets.map(budget => (
                    <div key={budget.id} onClick={() => handleOpenModal(budget)} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{t('month') || "Month"} {budget.month} / {budget.year}</span>
                                <span className="text-xs text-gray-500">{t('total') || "Total"}: {Number(budget.totalAmount).toLocaleString()} ₫</span>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(budget.id); }} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {budgets.length === 0 && (
                    <p className="text-center text-gray-400 py-4 text-sm italic">{t('noBudgets') || "No budgets set yet."}</p>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold">{editingBudget ? (t('editBudget') || "Edit Budget") : (t('createBudget') || "New Budget")}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex gap-4 mb-8">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{t('month') || "Month"}</label>
                                <div className="relative">
                                    <select
                                        value={month}
                                        onChange={e => setMonth(Number(e.target.value))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 font-bold text-lg appearance-none focus:outline-none focus:border-black transition-colors"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{t('month') || "Month"} {m}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{t('year') || "Year"}</label>
                                <div className="relative">
                                    <select
                                        value={year}
                                        onChange={e => setYear(Number(e.target.value))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 font-bold text-lg appearance-none focus:outline-none focus:border-black transition-colors"
                                    >
                                        {[2023, 2024, 2025, 2026].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-4 px-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('category') || "Category"}</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('amount') || "Budget"}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 mb-6 pr-2 -mr-2 space-y-2">
                            {items.map((item, index) => {
                                const cat = categories.find(c => c.name === item.category);
                                return (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                                {cat?.icon || "🍔"}
                                            </div>
                                            <span className="font-bold text-gray-700">{item.category}</span>
                                        </div>
                                        <div className="w-40 relative">
                                            <input
                                                type="text"
                                                value={item.amount > 0 ? item.amount.toLocaleString() : ""}
                                                onChange={e => handleUpdateAmount(index, e.target.value)}
                                                className="w-full bg-transparent text-right font-bold text-lg focus:outline-none focus:border-b-2 focus:border-black placeholder:text-gray-200 py-1"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-[-1.5rem] top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">₫</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{t('total') || "Total"}</span>
                                <span className="font-bold text-2xl">{totalBudgetAmount.toLocaleString()} ₫</span>
                            </div>
                            <button
                                onClick={handleSave}
                                className="px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-bold transition-all shadow-xl shadow-gray-200 active:scale-95 flex items-center gap-2"
                            >
                                {t('saveBudget') || "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
