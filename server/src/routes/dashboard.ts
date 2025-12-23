import express from 'express';
import { prisma } from '../db';

import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.user!.userId;

        const [accounts, transactions] = await Promise.all([
            prisma.account.findMany({ where: { userId } }),
            prisma.transaction.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: 5
            })
        ]);

        // Calculate Totals
        const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

        // For income/expense, ideally we aggregate over a time period (e.g., this month)
        // for now we might aggregate all-time or fetch separate aggregates
        const allTransactions = await prisma.transaction.findMany({ where: { userId } });

        const totalIncome = allTransactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalExpense = allTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Group spending by category (Expense only)
        const spendingByCategory = allTransactions
            .filter(t => t.type === 'EXPENSE' && t.category)
            .reduce((acc, t) => {
                const cat = t.category!;
                acc[cat] = (acc[cat] || 0) + Number(t.amount);
                return acc;
            }, {} as Record<string, number>);

        res.json({
            totalBalance,
            totalIncome,
            totalExpense,
            recentTransactions: transactions,
            spendingByCategory
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

export const dashboardRouter = router;
