import express from 'express';
import { prisma } from '../db';

import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const period = req.query.period as string || 'this_month';

        // Calculate Date Range
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        switch (period) {
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'month_before_last':
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
                break;
            case 'this_year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'last_year':
                startDate = new Date(now.getFullYear() - 1, 0, 1);
                endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                break;
            case 'year_before_last':
                startDate = new Date(now.getFullYear() - 2, 0, 1);
                endDate = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59, 999);
                break;
            default:
                // Default to all time or this month? Default to this month for safety
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
        }

        const [accounts, transactions] = await Promise.all([
            prisma.account.findMany({ where: { userId } }),
            prisma.transaction.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: 5
            })
        ]);

        // Calculate Totals (Total Balance involves all accounts, unrelated to period)
        const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

        // Fetch filtered transactions for stats
        const periodTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        const totalIncome = periodTransactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalExpense = periodTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Group spending by category (Expense only)
        const spendingByCategory = periodTransactions
            .filter(t => t.type === 'EXPENSE' && t.category && t.category !== 'Balance Adjustment' && t.category !== 'Initial Balance')
            .reduce((acc, t) => {
                const cat = t.category!;
                acc[cat] = (acc[cat] || 0) + Number(t.amount);
                return acc;
            }, {} as Record<string, number>);

        // Fetch effective budget: find the latest budget where (year < currentYear) OR (year == currentYear AND month <= currentMonth)
        // Order by year DESC, month DESC, take 1.

        const budgetMonth = startDate.getMonth() + 1;
        const budgetYear = startDate.getFullYear();

        const budgets = await prisma.budget.findMany({
            where: {
                userId,
                OR: [
                    { year: { lt: budgetYear } },
                    { year: budgetYear, month: { lte: budgetMonth } }
                ]
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            take: 1,
            include: {
                items: true
            }
        });

        const budget = budgets.length > 0 ? budgets[0] : null;

        res.json({
            totalBalance,
            totalIncome,
            totalExpense,
            recentTransactions: transactions,
            spendingByCategory,
            budget,
            period: {
                start: startDate,
                end: endDate
            }
        });

    } catch (error) {
        console.error('[Dashboard Error]', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

export const dashboardRouter = router;
