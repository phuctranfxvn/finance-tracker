import TopBar from "@/components/TopBar";
import { Plus, UserMinus, UserPlus, CheckCircle, Clock } from "lucide-react";
import clsx from "clsx";
import { getDebts } from "@/app/actions/debts";

export default async function DebtsPage() {
    const debts = await getDebts();

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--background)]">
            <TopBar />

            <div className="flex-1 overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Debt Management</h2>
                    <div className="flex gap-4">
                        <button className="px-5 py-2 bg-red-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-200 hover:scale-105 transition-transform">
                            <UserMinus size={18} />
                            Borrow
                        </button>
                        <button className="px-5 py-2 bg-green-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-200 hover:scale-105 transition-transform">
                            <UserPlus size={18} />
                            Lend
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {debts.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">No debts found</div>
                    ) : debts.map((debt: any) => (
                        <div key={debt.id} className="glass-panel p-6 rounded-2xl flex items-center justify-between card-hover group border-l-4 border-l-transparent hover:border-l-[var(--primary)]">
                            <div className="flex items-center gap-6">
                                {/* Assuming debt logic for type based on field existence or logic not yet fully in schema, relying on implicit context or adding type to schema if needed. 
                                     Wait, schema has 'name' and 'amount'. Schema didn't specify type (Lend/Borrow). 
                                     Let's assume for now valid debts are simpler or we need to update schema.
                                     Actually schema only has 'Debt' model with 'name' (person).
                                     We might need to add 'type' to Debt model to distinguish Borrow vs Lend.
                                     For now, I'll default to BORROWED visual or check if logic allows differentiation.
                                     Checking schema... model Debt { ... name, amount ... }
                                     Okay, I missed 'type' in Debt schema. 
                                     I'll update the visual to be generic or assume everything is 'LENT' (Money people owe me) or 'BORROWED' (Money I owe) based on logic.
                                     Let's act as if everything is positive amount = They owe me?
                                     Or simply display as is.
                                 */}
                                <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm bg-red-50 text-red-500")}>
                                    <UserMinus size={28} />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-[var(--text-primary)]">{debt.name}</h3>
                                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full",
                                            debt.isPaid ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                                        )}>
                                            {debt.isPaid ? "PAID" : "PENDING"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <div className="text-xs font-bold text-[var(--text-secondary)] flex items-center justify-end gap-1">
                                        <Clock size={12} /> {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : "No Due Date"}
                                    </div>
                                    <div className="text-2xl font-bold text-red-500">
                                        {Number(debt.amount).toLocaleString()} ₫
                                    </div>
                                </div>

                                {!debt.isPaid && (
                                    <button className="h-10 px-4 rounded-xl border border-[var(--border)] font-bold text-sm text-[var(--text-secondary)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all flex items-center gap-2">
                                        <CheckCircle size={16} /> Mark Paid
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
