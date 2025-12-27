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

            // --- TRANSFER SYNC LOGIC START ---
            let partnerTx: any = null;
            if (existingTx.type === 'TRANSFER') {
                // Determine expected partner category
                const isTransferIn = existingTx.category === 'Transfer In';
                const partnerCategory = isTransferIn ? 'Transfer Out' : 'Transfer In';

                // Find partner transaction with heuristic (same amount, date, userId, opposite category)
                // We use findFirst because date might be slightly off if we don't have exact ms match, 
                // but usually in our create logic they are identical. 
                // We'll search strictly first.
                // Find partner transaction with heuristic (same amount, userId, opposite category)
                // We loosen the date check to be within +/- 2 seconds to handle legacy data mismatch
                const bufferTime = 2000;
                const minDate = new Date(new Date(existingTx.date).getTime() - bufferTime);
                const maxDate = new Date(new Date(existingTx.date).getTime() + bufferTime);

                partnerTx = await tx.transaction.findFirst({
                    where: {
                        userId,
                        type: 'TRANSFER',
                        category: partnerCategory,
                        amount: existingTx.amount, // Match OLD amount
                        date: {
                            gte: minDate,
                            lte: maxDate
                        },
                        NOT: { id: existingTx.id }
                    }
                });

                // Fallback: If no partner found matching the Amount (possibly due to desync),
                // Try to find a unique partner in the same time window regardless of amount.
                if (!partnerTx) {
                    const candidates = await tx.transaction.findMany({
                        where: {
                            userId,
                            type: 'TRANSFER',
                            category: partnerCategory,
                            date: {
                                gte: minDate,
                                lte: maxDate
                            },
                            NOT: { id: existingTx.id }
                        }
                    });

                    if (candidates.length === 1) {
                        partnerTx = candidates[0];
                    }
                }
            }
            // --- TRANSFER SYNC LOGIC END ---


            // 2. Revert old balance from old account
            // If TRANSFER, we treat it similarly to Income/Expense based on category for balance logic?
            // Existing logic: INCOME uses +amount, ELSE -amount.
            // For Transfer:
            // Transfer In (treated as Income-like for balance) -> Revert means Subtract.
            // Transfer Out (treated as Expense-like for balance) -> Revert means Add.
            // Our current logic: existingTx.type === 'INCOME' ? ... : ...
            // If type is TRANSFER, it falls to the 'else' (-amount).
            // BUT Transfer In should be +, Transfer Out should be -.

            let oldBalanceChange = 0;
            if (existingTx.type === 'INCOME' || (existingTx.type === 'TRANSFER' && existingTx.category === 'Transfer In')) {
                oldBalanceChange = Number(existingTx.amount);
            } else {
                oldBalanceChange = -Number(existingTx.amount);
            }

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

            let newBalanceChange = 0;
            if (type === 'INCOME' || (type === 'TRANSFER' && (category === 'Transfer In' || existingTx.category === 'Transfer In'))) {
                // Note: If user edits category it might break, but category is hidden for Transfers. 
                // We rely on existingTx.category if implicit.
                // For safety, if type is TRANSFER, we force category to remain what it was? 
                // Or we detect based on the 'category' passed in body (which is likely empty now).
                // Logic: If existing was Transfer In, new is Transfer In.
                const isIn = existingTx.type === 'TRANSFER' ? existingTx.category === 'Transfer In' : type === 'INCOME';
                newBalanceChange = isIn ? newAmount : -newAmount;
            } else {
                newBalanceChange = -newAmount;
            }

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
                    type, // Should prevent changing type from/to TRANSFER ideally, but UI blocks it.
                    category: existingTx.type === 'TRANSFER' ? existingTx.category : category, // Keep category for transfers
                    date: date ? new Date(date) : new Date(),
                    accountId, // New account ID
                    note,
                    isPrivate: isPrivate || false,
                }
            });

            // --- TRANSFER PARTNER UPDATE START ---
            if (partnerTx) {
                // Update Partner Balance
                // Revert Partner Old Balance
                const partnerOldChange = partnerTx.category === 'Transfer In' ? Number(partnerTx.amount) : -Number(partnerTx.amount);
                await tx.account.update({
                    where: { id: partnerTx.accountId },
                    data: { balance: { decrement: partnerOldChange } }
                });

                // Apply Partner New Balance
                // Partner keeps its own category (In vs Out)
                const partnerNewChange = partnerTx.category === 'Transfer In' ? newAmount : -newAmount;
                await tx.account.update({
                    where: { id: partnerTx.accountId },
                    data: { balance: { increment: partnerNewChange } }
                });

                // Update Partner Transaction
                await tx.transaction.update({
                    where: { id: partnerTx.id },
                    data: {
                        amount: newAmount,
                        // User requested ONLY Amount to be synced. Date and Note are not updated on partner.
                    }
                });
            }
            // --- TRANSFER PARTNER UPDATE END ---

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

// Transfer Money
router.post('/transactions/transfer', async (req, res) => {
    const { fromWalletId, toWalletId, amount, date, description } = req.body;
    const userId = req.user!.userId;

    if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid transfer details' });
    }

    if (fromWalletId === toWalletId) {
        return res.status(400).json({ error: 'Cannot transfer to the same wallet' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Verify ownership and balance
            const fromWallet = await tx.account.findUnique({ where: { id: fromWalletId, userId } });
            const toWallet = await tx.account.findUnique({ where: { id: toWalletId, userId } });

            // Use a single timestamp for both to ensure perfect linking
            const transferDate = date ? new Date(date) : new Date();

            if (!fromWallet || !toWallet) {
                throw new Error("One or both wallets not found");
            }

            // Optional: Check sufficiency (though maybe allow overdraft?)
            // For now, let's allow overdraft or checking logic can be added here.

            // 2. Create Outgoing Transaction (TRANSFER)
            // We use negative amount for "Out" flow in visualization often, but amount stored is usually absolute.
            // For TRANSFER, let's store positive amount, and type TRANSFER.
            // But to distinguish direction, we rely on the context or maybe specific note/category?
            // Actually, for TRANSFER, we will perform TWO updates.
            // One: Money Out from Source. Type: TRANSFER. Amount: amount.
            // Two: Money In to Dest. Type: TRANSFER. Amount: amount.

            // To distinguish In vs Out for a TRANSFER type, usually we look at the balance change.
            // But if type is TRANSFER, how do we know if it is + or -?
            // Let's adopt a convention:
            // Transfer OUT: amount is stored as positive, but conceptually it reduces balance.
            // Wait, standard Expense is stored as positive amount, type EXPENSE implies subtraction.
            // Standard Income is stored as positive amount, type INCOME implies addition.
            // So for Transfer:
            // - Source: value is 'amount', type 'TRANSFER', but how to mark as subtraction?
            //   Maybe we need 'TRANSFER_OUT' and 'TRANSFER_IN' types?
            //   Or we just use 'TRANSFER' and rely on the fact that for the source wallet we subtract?
            //   But when querying "All transactions for Wallet A", we see a TRANSFER record. Is it +/-?
            //   It's ambiguous.

            // Decision: Use 'EXPENSE' / 'INCOME' behavior pattern.
            // However, user said "Don't count as Expense/Income".
            // So I added 'TRANSFER'.
            // I should effectively treat 'TRANSFER' as ambiguous unless I add a sign or direction field.
            // OR I just use negative amount for the outgoing one?
            // Schema has `Decimal` for amount. Usually money apps store absolute values.

            // Let's simply add a `note` that says "Transfer to..." and "Transfer from...".
            // And maybe for the UI, I will need to store signed amounts if I want to be 100% clear with a single type.
            // OR, I can use the `category` field to store 'Transfer Out' and 'Transfer In'.

            // Let's update schema again? No, let's use `category` field as a quick hack.
            // Category: "Transfer Out", "Transfer In".
            // And for reporting, since type is TRANSFER, we ignore both.
            // But for calculating Balance in the future (if we rebuild from transactions), we need to know.

            // Re-check schema: `Transaction` model.
            // If I verify the `Transaction` model usage in `wallets.ts` (recalculate balance?), 
            // usually apps store current balance in Account.
            // But if I want to show a list, I want -50 for outgoing, +50 for incoming.
            // If I store positive amount for both, I need a way to know.

            // I will store the outgoing transaction with NEGATIVE amount?
            // But `amount` in schema might be expected to be positive.
            // Let's check `Create Transaction` logic above:
            // const balanceChange = type === 'INCOME' ? amount : -amount;
            // It seems amount is expected to be positive.

            // Okay, I will use `category` to distinguish.
            // Or better, I'll modify the generic transaction fetcher to handle TRANSFER.
            // But wait, fetching transactions just returns the list. The UI decides how to render.
            // If usage of 'TRANSFER' type is new, the UI won't know if it's + or -.

            // Additional Schema Change Idea: Add `transferDirection`? No.
            // Let's just use `Transfer Out` and `Transfer In` as Categories.
            // AND for the outgoing one, I will perform `decrement`.
            // For incoming, `increment`.

            // 2. Create Outgoing Transaction
            const tOut = await tx.transaction.create({
                data: {
                    amount: amount,
                    type: 'TRANSFER', // Uses the new enum value
                    category: 'Transfer Out',
                    accountId: fromWalletId,
                    userId,
                    date: transferDate,
                    note: description || `Transfer to ${toWallet.name}`,
                    isPrivate: false
                }
            });

            await tx.account.update({
                where: { id: fromWalletId },
                data: { balance: { decrement: amount } }
            });

            // 3. Create Incoming Transaction
            const tIn = await tx.transaction.create({
                data: {
                    amount: amount,
                    type: 'TRANSFER',
                    category: 'Transfer In',
                    accountId: toWalletId,
                    userId,
                    date: transferDate,
                    note: description || `Transfer from ${fromWallet.name}`,
                    isPrivate: false
                }
            });

            await tx.account.update({
                where: { id: toWalletId },
                data: { balance: { increment: amount } }
            });

            return { tOut, tIn };
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process transfer' });
    }
});

export const transactionsRouter = router;
