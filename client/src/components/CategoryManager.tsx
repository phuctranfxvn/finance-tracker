import { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Plus } from "lucide-react";

interface Category {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon: string;
}

export default function CategoryManager() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
    const [icon, setIcon] = useState("🍔"); // Default icon
    const [isSubmitting, setIsSubmitting] = useState(false);

    const emojis = ["🍔", "🚕", "🛍️", "☕", "🧾", "🎬", "💊", "🏠", "✈️", "💰", "🏦", "👶", "🎁", "📚", "🔧", "💻"];

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get("/api/categories");
            setCategories(res.data);
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
            const res = await axios.post("/api/categories", {
                name,
                type,
                icon
            });
            setCategories([...categories, res.data]);
            setName("");
            setIcon("🍔");
        } catch (error) {
            console.error("Failed to create category", error);
            alert("Failed to create category");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;

        try {
            await axios.delete(`/api/categories/${id}`);
            setCategories(categories.filter(c => c.id !== id));
        } catch (error) {
            console.error("Failed to delete category", error);
            alert("Failed to delete category");
        }
    };

    if (loading) return <div>Loading categories...</div>;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Create Form */}
                <div className="w-full md:w-1/3">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm sticky top-8">
                        <h2 className="font-bold text-lg mb-6">New Category</h2>
                        <form onSubmit={handleCreate} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Type</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setType('EXPENSE')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'EXPENSE' ? 'bg-white shadow text-red-500' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        Expense
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('INCOME')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'INCOME' ? 'bg-white shadow text-green-500' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        Income
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Name</label>
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
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Icon</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {emojis.map(e => (
                                        <button
                                            key={e}
                                            type="button"
                                            onClick={() => setIcon(e)}
                                            className={`h-10 rounded-xl flex items-center justify-center text-xl transition-all ${icon === e ? 'bg-[var(--primary)] text-white shadow-lg shadow-orange-200 scale-110' : 'bg-gray-50 hover:bg-gray-100'}`}
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
                                Create Category
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Expense Categories */}
                    <div>
                        <h3 className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-xs mb-4">Expense Categories</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {categories.filter(c => c.type === 'EXPENSE').map(cat => (
                                <div key={cat.id} className="bg-white p-4 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-red-50 text-2xl flex items-center justify-center">
                                            {cat.icon}
                                        </div>
                                        <span className="font-bold text-[var(--text-primary)]">{cat.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {categories.filter(c => c.type === 'EXPENSE').length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    No expense categories yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Income Categories */}
                    <div>
                        <h3 className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-xs mb-4">Income Categories</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {categories.filter(c => c.type === 'INCOME').map(cat => (
                                <div key={cat.id} className="bg-white p-4 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-green-50 text-2xl flex items-center justify-center">
                                            {cat.icon}
                                        </div>
                                        <span className="font-bold text-[var(--text-primary)]">{cat.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {categories.filter(c => c.type === 'INCOME').length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    No income categories yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
