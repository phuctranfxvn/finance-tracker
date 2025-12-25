import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, Settings, Wallet, Plus, PiggyBank } from "lucide-react";
import { clsx } from "clsx";
import { useLanguage } from "../context/LanguageContext";

export default function MobileTabbar() {
    const { pathname } = useLocation();
    const { t } = useLanguage();

    // Configuration for the wave shape
    // W = Width, H = Height (of the bar)
    // The curve needs to handle the center bump/notch.
    // Given CSS limitations for complex "inverted rounded corners", SVG is safer.

    // Left items: Home, Assets (Savings & Debts)
    const leftItems = [
        { icon: LayoutGrid, href: "/dashboard", label: t('dashboard') },
        { icon: PiggyBank, href: "/finance", label: t('assets') },
    ];

    // Right items: Wallets, Settings
    const rightItemsFinal = [
        { icon: Wallet, href: "/wallets", label: t('wallets') },
        { icon: Settings, href: "/settings", label: t('settings') }
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* SVG Background Layer */}
            <div className="absolute bottom-0 w-full h-[80px] drop-shadow-[0_-5px_10px_rgba(0,0,0,0.05)] text-white pointer-events-none">
                <svg viewBox="0 0 375 80" className="w-full h-full" preserveAspectRatio="none">
                    <path
                        d="M0,0 L132,0 C144,0 152,0 160,10 C169,21 176,32 187.5,32 C199,32 206,21 215,10 C223,0 231,0 243,0 L375,0 L375,90 L0,90 Z"
                        fill="var(--tab-bg, #ffffff)"
                    />
                </svg>
            </div>

            {/* Container for content - On top of SVG */}
            <div className="absolute bottom-0 w-full h-[80px] flex items-end pb-4 px-1">
                {/* Left Items */}
                <div className="flex-1 flex justify-around mb-1">
                    {leftItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} to={item.href} className="flex flex-col items-center gap-1 min-w-[44px] flex-1">
                                <item.icon size={22} className={clsx("transition-colors", isActive ? "text-orange-500" : "text-gray-400")} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={clsx("text-[10px] font-medium transition-colors truncate w-full text-center", isActive ? "text-orange-500" : "text-gray-400")}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Center Space for FAB */}
                <div className="w-[70px] shrink-0"></div>

                {/* Right Items */}
                <div className="flex-1 flex justify-around mb-1">
                    {rightItemsFinal.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} to={item.href} className="flex flex-col items-center gap-1 min-w-[44px] flex-1">
                                <item.icon size={22} className={clsx("transition-colors", isActive ? "text-orange-500" : "text-gray-400")} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={clsx("text-[10px] font-medium transition-colors truncate w-full text-center", isActive ? "text-orange-500" : "text-gray-400")}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Floating Action Button (FAB) - Centered */}
            <div className="absolute bottom-[35px] left-1/2 -translate-x-1/2 z-50">
                {/* The Button */}
                <Link
                    to="/"
                    className={clsx(
                        "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95",
                        // "bg-orange-500 text-white" // Standard orange
                        // Add some gradient/3D effect to pop like the image
                        "bg-gradient-to-tr from-orange-500 to-orange-400 text-white shadow-orange-200"
                    )}
                >
                    <div className="transition-transform duration-300">
                        <Plus size={32} strokeWidth={2.5} />
                    </div>
                </Link>
            </div>
        </div>
    );
}
