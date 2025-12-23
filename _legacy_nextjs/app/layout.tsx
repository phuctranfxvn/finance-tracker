import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Premium Personal Finance Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={clsx(inter.variable, outfit.variable, "antialiased bg-[var(--background)] text-[var(--foreground)]")}>
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
