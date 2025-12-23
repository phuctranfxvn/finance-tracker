"use client";

import TopBar from "@/components/TopBar";

export default function SettingsPage() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--background)]">
            <TopBar />
            <div className="flex-1 p-8 flex items-center justify-center text-[var(--text-secondary)]">
                Settings Page Placeholder
            </div>
        </div>
    );
}
