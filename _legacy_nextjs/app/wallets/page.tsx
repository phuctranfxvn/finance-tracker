import TopBar from "@/components/TopBar";
import { Plus, CreditCard, Banknote } from "lucide-react";
import clsx from "clsx";
import { getWallets } from "@/app/actions/wallets";

export default async function WalletsPage() {
    const wallets = await getWallets();

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--background)]">
            <TopBar />

            <div className="flex-1 overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">My Wallets</h2>
                    <button className="px-5 py-2 bg-[var(--primary)] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 hover:scale-105 transition-transform">
                        <Plus size={18} />
                        Add New Wallet
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {wallets.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-[var(--text-secondary)]">
                            No wallets found. Create one to get started!
                        </div>
                    ) : (
                        wallets.map((wallet: any) => (
                            <div key={wallet.id} className={clsx("relative h-56 rounded-[2rem] p-8 text-white shadow-xl flex flex-col justify-between overflow-hidden card-hover bg-gradient-to-br",
                                wallet.type === 'WALLET' ? "from-orange-400 to-red-500" : "from-blue-400 to-indigo-600"
                            )}>
                                {/* Decor */}
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
                                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>

                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <div className="text-white/80 text-sm font-semibold tracking-wider flex items-center gap-2">
                                            {wallet.type === 'WALLET' ? <Banknote size={16} /> : <CreditCard size={16} />}
                                            {wallet.type}
                                        </div>
                                        <h3 className="text-2xl font-bold mt-2">{wallet.name}</h3>
                                    </div>
                                    <div className="text-xs font-mono bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">{wallet.currency}</div>
                                </div>

                                <div className="relative z-10">
                                    <div className="text-white/80 text-xs uppercase tracking-widest mb-1">Current Balance</div>
                                    <div className="text-3xl font-bold tracking-tight">
                                        {wallet.currency === 'VND' ? `${Number(wallet.balance).toLocaleString()} ₫` : `$${Number(wallet.balance).toLocaleString()}`}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
