"use client";

import { Search, Plus, Bell } from "lucide-react";

export default function TopBar() {
    return (
        <header className="w-full h-20 flex items-center justify-between px-8 bg-[var(--background)] shrink-0">
            {/* Title */}
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>

            {/* Center Search */}
            <div className="flex items-center gap-4 flex-1 justify-center max-w-xl mx-auto">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="w-full h-12 pl-12 pr-4 rounded-full bg-white border border-transparent focus:border-[var(--primary)] focus:ring-0 text-sm text-[var(--text-primary)] shadow-sm outline-none transition-all"
                    />
                </div>
                <button className="w-10 h-10 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white flex items-center justify-center shadow-lg shadow-orange-200 transition-colors">
                    <Plus size={24} />
                </button>
            </div>

            {/* Right User/Weather */}
            <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                    <div className="text-sm font-bold text-[var(--text-primary)]">Ho Chi Minh</div>
                    <div className="text-xs text-[var(--text-secondary)]">Vietnam</div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-[var(--warning)] flex items-center gap-1">
                            ☀ 29°C
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] text-right">Cloudy</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
