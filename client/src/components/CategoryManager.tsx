import { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Plus, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";

interface Category {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon: string;
}

export default function CategoryManager() {
    const { t } = useLanguage();
    const [categories, setCategories] = useState<Category[]>([]);
    const [savingCategories, setSavingCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [activeType, setActiveType] = useState<'INCOME' | 'EXPENSE' | 'SAVING'>('EXPENSE');
    const [icon, setIcon] = useState("🍔"); // Default icon
    const [isSubmitting, setIsSubmitting] = useState(false);

    const emojis = ["🍔", "🚕", "🛍️", "☕", "🧾", "🎬", "💊", "🏠", "✈️", "💰", "🏦", "👶", "🎁", "📚", "🔧", "💻"];

    useEffect(() => {
        fetchAllCategories();
    }, []);

    const fetchAllCategories = async () => {
        setLoading(true);
        try {
            const [catRes, saveRes] = await Promise.all([
                axios.get("/api/categories"),
                axios.get("/api/saving-categories")
            ]);
            setCategories(catRes.data);
            setSavingCategories(Array.isArray(saveRes.data) ? saveRes.data : []);
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsSubmitting(true);
        try {
            if (activeType === 'SAVING') {
                const res = await axios.post("/api/saving-categories", { name, icon });
                setSavingCategories([res.data, ...savingCategories]);
            } else {
                const res = await axios.post("/api/categories", { name, type: activeType, icon });
                setCategories([...categories, res.data]);
            }
            setName("");
            setIcon("🍔");
        } catch (error) {
            console.error("Failed to create category", error);
            alert(t('failedCreateCategory'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, isSaving: boolean = false) => {
        if (!confirm(t('deleteCategoryConfirm'))) return;

        try {
            if (isSaving) {
                await axios.delete(`/api/saving-categories/${id}`);
                setSavingCategories(savingCategories.filter(c => c.id !== id));
            } else {
                await axios.delete(`/api/categories/${id}`);
                setCategories(categories.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete category", error);
            alert(t('failedDeleteCategory'));
        }
    };

    if (loading) return <div>{t('processing')}</div>;

    const displayCategories = activeType === 'SAVING'
        ? savingCategories
        : categories.filter(c => c.type === activeType);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Create Form */}
                <div className="w-full md:w-1/3">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm sticky top-8">
                        <h2 className="font-bold text-lg mb-6">{t('newCategory')}</h2>
                        <form onSubmit={handleCreate} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">{t('categoryType')}</label>
                                <div className="flex bg-gray-100 p-1 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setActiveType('EXPENSE')}
                                        className={cn(
                                            "flex-1 h-12 flex items-center justify-center gap-2 text-xs font-bold rounded-xl transition-all",
                                            activeType === 'EXPENSE' ? "bg-white shadow text-red-500" : "text-gray-500 hover:bg-gray-200"
                                        )}
                                    >
                                        <TrendingDown size={16} />
                                        {t('expense')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveType('INCOME')}
                                        className={cn(
                                            "flex-1 h-12 flex items-center justify-center gap-2 text-xs font-bold rounded-xl transition-all",
                                            activeType === 'INCOME' ? "bg-white shadow text-green-500" : "text-gray-500 hover:bg-gray-200"
                                        )}
                                    >
                                        <TrendingUp size={16} />
                                        {t('income')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveType('SAVING')}
                                        className={cn(
                                            "flex-1 h-12 flex items-center justify-center gap-2 text-xs font-bold rounded-xl transition-all",
                                            activeType === 'SAVING' ? "bg-white shadow text-pink-500" : "text-gray-500 hover:bg-gray-200"
                                        )}
                                    >
                                        <PiggyBank size={16} />
                                        {t('savings')}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">{t('title')}</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-12 bg-gray-50 rounded-xl px-4 font-medium text-[var(--text-primary)] outline-none border border-transparent focus:bg-white focus:border-[var(--primary)] transition-all"
                                    placeholder="e.g. Groceries"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">{t('icon')}</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {emojis.map(e => (
                                        <button
                                            key={e}
                                            type="button"
                                            onClick={() => setIcon(e)}
                                            className={cn(
                                                "h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                                                icon === e ? "bg-[var(--primary)] text-white shadow-lg shadow-orange-200 scale-110" : "bg-gray-50 hover:bg-gray-100"
                                            )}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="mt-4 h-12 bg-[var(--primary)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <Plus size={20} />
                                {t('createCategory')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {displayCategories.map(cat => (
                            <div key={cat.id} className="bg-white p-4 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl text-2xl flex items-center justify-center",
                                        activeType === 'EXPENSE' ? "bg-red-50" : activeType === 'INCOME' ? "bg-green-50" : "bg-pink-50"
                                    )}>
                                        {cat.icon || (activeType === 'SAVING' ? "💰" : icon)}
                                    </div>
                                    <span className="font-bold text-[var(--text-primary)]">{cat.name}</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(cat.id, activeType === 'SAVING')}
                                    className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {displayCategories.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                                {activeType === 'EXPENSE' && t('noExpenseCats')}
                                {activeType === 'INCOME' && t('noIncomeCats')}
                                {activeType === 'SAVING' && t('noSavingCats')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
