import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get Debts
router.get('/debts', async (req, res) => {
    try {
        const debts = await prisma.debt.findMany({
            where: { userId: req.user!.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(debts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch debts' });
    }
});

// Create Debt
router.post('/debts', async (req, res) => {
    try {
        const { name, amount, dueDate } = req.body;
        const userId = req.user!.userId;

        const debt = await prisma.debt.create({
            data: {
                name,
                amount,
                remainingAmount: amount, // Start with full amount
                dueDate: dueDate ? new Date(dueDate) : null,
                userId,
                isPaid: false
            }
        });

        res.json(debt);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create debt' });
    }
});

// Pay Debt (Partial or Full)
router.post('/debts/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, sourceAccountId } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const debt = await tx.debt.findUnique({ where: { id } });
            if (!debt || debt.isPaid) {
                throw new Error("Invalid debt to pay");
            }

            const paymentAmount = Number(amount);
            const newRemaining = Number(debt.remainingAmount) - paymentAmount;
            const isFullyPaid = newRemaining <= 0;

            // 1. Update Debt
            const updatedDebt = await tx.debt.update({
                where: { id },
                data: {
                    remainingAmount: newRemaining < 0 ? 0 : newRemaining,
                    isPaid: isFullyPaid
                }
            });

            // 2. Deduct from Source Account
            if (sourceAccountId) {
                await tx.account.update({
                    where: { id: sourceAccountId },
                    data: {
                        balance: {
                            decrement: paymentAmount
                        }
                    }
                });

                // Create Transaction Record
                await tx.transaction.create({
                    data: {
                        amount: paymentAmount,
                        type: 'EXPENSE',
                        category: 'Debt Repayment',
                        date: new Date(),
                        accountId: sourceAccountId,
                        userId: debt.userId,
                        note: `Debt Payment: ${debt.name}`,
                        isPrivate: false
                    }
                });
            }

            return updatedDebt;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to pay debt' });
    }
});

export const debtsRouter = router;
