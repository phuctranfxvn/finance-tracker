import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import clsx from "clsx";


import MobileTabbar from "./MobileTabbar";

export default function Layout() {
    const { pathname } = useLocation();
    const isMobileHome = pathname === '/';

    return (
        <div className="flex h-screen bg-[var(--background)] overflow-hidden">
            <Sidebar />


            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                <main className={clsx(
                    "flex-1 scrollbar-hide",
                    isMobileHome ? "p-0 overflow-hidden" : "p-4 lg:p-8 pb-24 overflow-y-auto"
                )}>
                    <Outlet />
                </main>

                <MobileTabbar />
            </div>
        </div>
    );
}
