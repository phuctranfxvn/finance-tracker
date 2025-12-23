import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get Transactions
// Get Transactions with Pagination
router.get('/transactions', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [transactions, total] = await prisma.$transaction([
            prisma.transaction.findMany({
                where: { userId: req.user!.userId },
                include: {
                    account: {
                        select: { name: true },
                    },
                },
                orderBy: { date: 'desc' },
                skip: skip,
                take: limit,
            }),
            prisma.transaction.count({
                where: { userId: req.user!.userId },
            }),
        ]);

        res.json({
            data: transactions,
            meta: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Create Transaction
router.post('/transactions', async (req, res) => {
    const { amount, type, category, date, accountId, note, isPrivate } = req.body;
    const userId = req.user!.userId;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Transaction
            const transaction = await tx.transaction.create({
                data: {
                    amount,
                    type,
                    category,
                    date: date ? new Date(date) : new Date(),
                    accountId,
                    userId,
                    note,
                    isPrivate: isPrivate || false,
                },
            });

            // 2. Update Account Balance
            // Income adds to balance, Expense subtracts
            const balanceChange = type === 'INCOME' ? amount : -amount;

            await tx.account.update({
                where: { id: accountId },
                data: {
                    balance: {
                        increment: balanceChange,
                    },
                },
            });

            return transaction;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

export const transactionsRouter = router;
