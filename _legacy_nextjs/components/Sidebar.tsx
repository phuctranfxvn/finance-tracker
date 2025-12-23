"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, List, Calendar, Settings, LogOut, CheckSquare, Wallet, UserMinus } from "lucide-react";
import clsx from "clsx";

const navItems = [
    { icon: LayoutGrid, href: "/", label: "Dashboard" },
    { icon: Wallet, href: "/wallets", label: "Wallets" },
    { icon: List, href: "/transactions", label: "Transactions" },
    { icon: Calendar, href: "/savings", label: "Savings" },
    { icon: UserMinus, href: "/debts", label: "Debts" },
    { icon: Settings, href: "/settings", label: "Settings" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="h-full w-20 flex flex-col items-center py-6 bg-white border-r border-[var(--border)] shrink-0 z-20">
            {/* Logo */}
            <div className="mb-10">
                <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                    <CheckSquare size={24} strokeWidth={3} />
                </div>
                <div className="text-[10px] font-bold text-center mt-1 text-[var(--primary)] tracking-wider">TASK</div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 flex flex-col gap-6 w-full px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "w-full aspect-square flex items-center justify-center rounded-2xl transition-all duration-300",
                                isActive
                                    ? "bg-[var(--primary)] text-white shadow-lg shadow-orange-200"
                                    : "text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            )}
                        >
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-4 mb-4">
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)] font-bold shadow-md hover:scale-110 transition-transform">
                    F
                </button>
                <button className="text-xs font-bold text-[var(--text-secondary)]">EN</button>
                <button className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors">
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
}
