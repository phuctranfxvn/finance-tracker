import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, List, Calendar, Settings, Wallet, UserMinus, Plus } from "lucide-react";
import { cn } from "../lib/utils";



import { useLanguage } from "../context/LanguageContext";

export default function Sidebar() {
    const { pathname } = useLocation();
    const { t } = useLanguage();

    const navItems = [
        { icon: Plus, href: "/", label: "quickAdd" },
        { icon: LayoutGrid, href: "/dashboard", label: "dashboard" },
        { icon: Wallet, href: "/wallets", label: "wallets" },
        { icon: List, href: "/transactions", label: "transactions" },
        { icon: Calendar, href: "/savings", label: "savings" },
        { icon: UserMinus, href: "/debts", label: "debts" },
        { icon: Settings, href: "/settings", label: "settings" },
    ] as const;

    return (
        <aside className="hidden lg:flex h-full w-20 flex-col items-center py-6 bg-white border-r border-[var(--border)] shrink-0 z-20">
            {/* Logo */}
            <div className="mb-10">
                <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                    <Wallet size={24} strokeWidth={3} />
                </div>
                <div className="text-[10px] font-bold text-center mt-1 text-[var(--primary)] tracking-wider">WALLET</div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 flex flex-col gap-4 w-full px-2 min-h-0 no-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            title={t(item.label as any)}
                            className={cn(
                                "w-full aspect-square flex items-center justify-center rounded-2xl transition-all duration-300 relative group shrink-0",
                                isActive
                                    ? "bg-[var(--primary)] text-white shadow-lg shadow-orange-200"
                                    : "text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            )}
                        >
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />

                            {/* Tooltip for collapsed sidebar */}
                            <span className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                {t(item.label as any)}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
