import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, List, Settings, Wallet, Calendar, UserMinus } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
    { icon: LayoutGrid, href: "/", label: "Home" },
    { icon: Wallet, href: "/wallets", label: "Wallets" },
    { icon: List, href: "/transactions", label: "History" },
    { icon: Calendar, href: "/savings", label: "Savings" },
    { icon: UserMinus, href: "/debts", label: "Debts" },
    { icon: Settings, href: "/settings", label: "Settings" },
];

export default function MobileTabbar() {
    const { pathname } = useLocation();

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pb-6 pt-3 flex justify-between items-center z-50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={clsx(
                            "flex flex-col items-center gap-1 transition-colors duration-200",
                            isActive ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <div className={clsx(
                            "p-2 rounded-xl transition-all duration-300",
                            isActive && "bg-orange-50"
                        )}>
                            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        {isActive && <span className="text-[10px] font-bold">{item.label}</span>}
                    </Link>
                );
            })}
        </div>
    );
}
