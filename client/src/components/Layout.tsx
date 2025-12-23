import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";


import MobileTabbar from "./MobileTabbar";

export default function Layout() {
    return (
        <div className="flex h-screen bg-[var(--background)] overflow-hidden">
            <Sidebar />


            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-32 lg:pb-24 scrollbar-hide">
                    <Outlet />
                </main>

                <MobileTabbar />
            </div>
        </div>
    );
}
