import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get Savings
router.get('/savings', async (req, res) => {
    try {
        const savings = await prisma.saving.findMany({
            where: { userId: req.user!.userId },
            include: {
                sourceAccount: {
                    select: { name: true },
                },
                category: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(savings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch savings' });
    }
});

// Create Saving Goal / Deposit
router.post('/savings', async (req, res) => {
    try {
        const { bankName, amount, interestRate, startDate, endDate, sourceAccountId, savingCategoryId } = req.body;
        const userId = req.user!.userId;

        // Transaction to deduct from source account and create saving
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Saving Record
            const saving = await tx.saving.create({
                data: {
                    bankName,
                    amount,
                    interestRate,
                    startDate: startDate ? new Date(startDate) : new Date(),
                    endDate: endDate ? new Date(endDate) : null,
                    sourceAccountId,
                    savingCategoryId: savingCategoryId || undefined,
                    userId,
                    isSettled: false
                }
            });

            // 2. Deduct from Source Account (if specified)
            if (sourceAccountId) {
                await tx.account.update({
                    where: { id: sourceAccountId },
                    data: {
                        balance: {
                            decrement: amount
                        }
                    }
                });

                // Optional: Create a "Transfer" transaction record for tracking
                await tx.transaction.create({
                    data: {
                        amount,
                        type: 'EXPENSE', // Treated as expense from wallet perspective
                        category: 'Savings',
                        date: new Date(),
                        accountId: sourceAccountId,
                        userId,
                        note: `Deposit to ${bankName}`,
                        isPrivate: false
                    }
                });
            }

            return saving;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create saving' });
    }
});

// Settle Saving (Withdraw)
router.post('/savings/:id/settle', async (req, res) => {
    try {
        const { id } = req.params;
        const { targetAccountId } = req.body; // Where to return the money

        const result = await prisma.$transaction(async (tx) => {
            const saving = await tx.saving.findUnique({ where: { id } });
            if (!saving || saving.isSettled) {
                throw new Error("Invalid saving to settle");
            }

            // Calculate Interest (Simple Mock Calculation)
            // Real world: (Amount * Rate * Days) / 365
            const days = Math.floor((new Date().getTime() - new Date(saving.startDate).getTime()) / (1000 * 3600 * 24));
            const interest = Number(saving.amount) * (Number(saving.interestRate) / 100) * (days / 365);
            const totalReturn = Number(saving.amount) + interest;

            // 1. Mark as Settled
            const updatedSaving = await tx.saving.update({
                where: { id },
                data: { isSettled: true }
            });

            // 2. Add to Target Account
            if (targetAccountId) {
                await tx.account.update({
                    where: { id: targetAccountId },
                    data: {
                        balance: {
                            increment: totalReturn
                        }
                    }
                });

                // Create Income Transaction
                const settlementTx = await tx.transaction.create({
                    data: {
                        amount: totalReturn,
                        type: 'INCOME',
                        category: 'Savings Return',
                        date: new Date(),
                        accountId: targetAccountId,
                        userId: saving.userId,
                        note: `Settlement from ${saving.bankName} (Interest: ${interest.toFixed(0)})`,
                        isPrivate: false
                    }
                });

                // Update saving with the transaction ID
                await tx.saving.update({
                    where: { id },
                    data: { settlementTransactionId: settlementTx.id }
                });
            }

            return { updatedSaving, totalReturn, interest };
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to settle saving' });
    }
});

// Update Saving
router.put('/savings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { bankName, amount, interestRate, startDate, endDate, savingCategoryId } = req.body;

        const updated = await prisma.saving.update({
            where: { id },
            data: {
                bankName,
                amount,
                interestRate,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : null, // Allow clearing end date
                savingCategoryId: savingCategoryId || undefined
            }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update saving' });
    }
});

// Unsettle Saving (Redo Settle)
router.post('/savings/:id/unsettle', async (req, res) => {
    try {
        const { id } = req.params;
        // NOTE: This does NOT revert the money transaction. This is purely a status update.
        // Reverting money is complex because the balance might have already been spent.

        const result = await prisma.$transaction(async (tx) => {
            const saving = await tx.saving.findUnique({ where: { id } });
            if (!saving) throw new Error("Saving not found");

            // If there's a linked settlement transaction, revert it
            if (saving.settlementTransactionId) {
                const transaction = await tx.transaction.findUnique({
                    where: { id: saving.settlementTransactionId }
                });

                if (transaction) {
                    // deduct the money back from the account
                    await tx.account.update({
                        where: { id: transaction.accountId },
                        data: {
                            balance: {
                                decrement: transaction.amount
                            }
                        }
                    });

                    // delete the transaction record
                    await tx.transaction.delete({
                        where: { id: transaction.id }
                    });
                }
            }

            const updated = await tx.saving.update({
                where: { id },
                data: {
                    isSettled: false,
                    settlementTransactionId: null
                }
            });

            return updated;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to unsettle saving' });
    }
});

export const savingsRouter = router;
