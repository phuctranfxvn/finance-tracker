import TopBar from "@/components/TopBar";
import { Plus, PiggyBank, Calendar, Percent, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { getSavings } from "@/app/actions/savings";

export default async function SavingsPage() {
    const savings = await getSavings();

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--background)]">
            <TopBar />

            <div className="flex-1 overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Savings & Deposits</h2>
                    <button className="px-5 py-2 bg-[var(--primary)] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 hover:scale-105 transition-transform">
                        <Plus size={18} />
                        New Deposit
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {savings.length === 0 ? (
                        <div className="col-span-full text-center text-gray-400 py-10">No savings yet</div>
                    ) : savings.map((saving: any) => (
                        <div key={saving.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-[var(--border)] card-hover flex flex-col gap-4 relative overflow-hidden">
                            {saving.isSettled && (
                                <div className="absolute top-4 right-4 bg-green-100 text-green-600 px-3 py-1 text-xs font-bold rounded-full">
                                    Settled
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                                    <PiggyBank size={24} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[var(--text-secondary)]">{saving.bankName}</div>
                                    <div className="text-xl font-bold text-[var(--text-primary)]">{Number(saving.amount).toLocaleString()} ₫</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-[var(--surface-hover)] p-4 rounded-xl">
                                <div>
                                    <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold flex items-center gap-1">
                                        <Calendar size={10} /> Term
                                    </div>
                                    <div className="text-xs font-bold mt-1">
                                        {new Date(saving.startDate).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold flex items-center justify-end gap-1">
                                        <Percent size={10} /> Rate
                                    </div>
                                    <div className="text-xs font-bold mt-1 text-[var(--primary)]">{Number(saving.interestRate)}%/yr</div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <div className="text-xs text-[var(--text-secondary)]">
                                    {/* Simple Interest calc for display */}
                                    Expected Interest: <span className="font-bold text-[var(--success)]">+{(Number(saving.amount) * Number(saving.interestRate) / 100).toLocaleString()} ₫</span>
                                </div>
                                {saving.isSettled ? (
                                    <button className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold" disabled>
                                        Settled
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-gray-300">
                                        <ArrowRight size={14} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
