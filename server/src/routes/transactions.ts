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
        const accountId = req.query.accountId as string;
        const skip = (page - 1) * limit;

        const whereClause: any = { userId: req.user!.userId };
        if (accountId) {
            whereClause.accountId = accountId;
        }

        const [transactions, total] = await prisma.$transaction([
            prisma.transaction.findMany({
                where: whereClause,
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
                where: whereClause,
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

// Update Transaction
router.put('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { amount, type, category, date, accountId, note, isPrivate } = req.body;
    const userId = req.user!.userId;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get existing transaction
            const existingTx = await tx.transaction.findUnique({
                where: { id, userId },
                include: { account: true }
            });

            if (!existingTx) {
                throw new Error("Transaction not found");
            }

            // 2. Revert old balance from old account
            const oldBalanceChange = existingTx.type === 'INCOME' ? Number(existingTx.amount) : -Number(existingTx.amount);
            // We need to SUBTRACT the old change to key it back to original state
            // If it was Income (+100), we subtract 100. If Expense (-100), we add 100 (subtract -100).

            await tx.account.update({
                where: { id: existingTx.accountId },
                data: {
                    balance: {
                        decrement: oldBalanceChange
                    }
                }
            });

            // 3. Apply NEW balance to NEW account (could be same account)
            const newAmount = Number(amount);
            const newBalanceChange = type === 'INCOME' ? newAmount : -newAmount;

            await tx.account.update({
                where: { id: accountId }, // New account ID
                data: {
                    balance: {
                        increment: newBalanceChange
                    }
                }
            });

            // 4. Update Transaction Record
            const updatedTx = await tx.transaction.update({
                where: { id },
                data: {
                    amount: newAmount,
                    type,
                    category,
                    date: date ? new Date(date) : new Date(),
                    accountId, // New account ID
                    note,
                    isPrivate: isPrivate || false,
                }
            });

            return updatedTx;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update transaction' });
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
