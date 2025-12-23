"use server";

import prisma from "@/lib/prisma";

export async function getDashboardStats() {
    const user = await prisma.user.findFirst();
    if (!user) {
        return {
            totalBalance: 0,
            totalIncome: 0,
            totalExpense: 0,
            totalSavings: 0,
            recentTransactions: [],
            spendingByCategory: [],
            savingsGoals: []
        };
    }

    // 1. Calculate Total Balance (Sum of all wallet balances)
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    const totalBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0);

    // 2. Calculate Income/Expense (from Transactions)
    // Note: Optimally we should filter by this month or specific period
    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        include: { account: true, user: true },
        orderBy: { date: 'desc' }
    });

    const totalIncome = transactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const totalExpense = transactions
        .filter((t: any) => t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    // 3. Total Savings
    const savings = await prisma.saving.findMany({ where: { userId: user.id } });
    const totalSavings = savings.reduce((sum: number, s: any) => sum + Number(s.amount), 0);

    // 4. Spending by Category
    const categoryMap = new Map<string, number>();
    transactions.filter((t: any) => t.type === 'EXPENSE').forEach((t: any) => {
        const cat = t.category || "Uncategorized";
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(t.amount));
    });

    const spendingByCategory = Array.from(categoryMap.entries()).map(([label, val]: [string, number]) => ({
        label, val: totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0
    })).sort((a, b) => b.val - a.val).slice(0, 5); // Top 5

    // 5. Recent items
    const recentTransactions = transactions.slice(0, 5);
    const savingsGoals = savings.slice(0, 4);

    return {
        totalBalance,
        totalIncome,
        totalExpense,
        totalSavings,
        recentTransactions,
        spendingByCategory,
        savingsGoals
    };
}
