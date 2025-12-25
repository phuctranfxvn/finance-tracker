import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply middleware to all routes in this router
router.use(authenticateToken);

// Get Wallets
router.get('/wallets', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const wallets = await prisma.account.findMany({
            where: { userId },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });
        res.json(wallets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
});

router.post('/wallets', async (req, res) => {
    try {
        const { name, balance, currency, type, bankName, creditCardType, showInQuickAdd } = req.body;
        const userId = req.user!.userId;

        // Simple validation
        if (!name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const wallet = await prisma.account.create({
            data: {
                name,
                balance: balance || 0,
                currency: currency || 'VND',
                type: type || 'WALLET',
                bankName,
                creditCardType,
                showInQuickAdd: showInQuickAdd !== undefined ? showInQuickAdd : true,
                userId,
            },
        });
        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create wallet' });
    }
});

// Reorder Wallets
router.put('/wallets/reorder', async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, sortOrder }
        const userId = req.user!.userId;

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid items format' });
        }

        // Use transaction for atomic updates
        await prisma.$transaction(
            items.map((item: any) =>
                prisma.account.updateMany({
                    where: { id: item.id, userId },
                    data: { sortOrder: item.sortOrder },
                })
            )
        );

        res.json({ success: true });
    } catch (error) {
        console.error('[DEBUG] Reorder error:', error);
        res.status(500).json({ error: 'Failed to reorder wallets' });
    }
});

// Update Wallet
router.put('/wallets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, bankName, type, currency, creditCardType, showInQuickAdd } = req.body;
        const userId = req.user!.userId;

        console.log(`[DEBUG] Updating wallet: id=${id}, userId=${userId}`);
        console.log(`[DEBUG] Data:`, { name, bankName, type, currency });

        // Use updateMany to ensure ownership (cannot use update with non-unique where clause)
        const result = await prisma.account.updateMany({
            where: { id, userId },
            data: {
                name,
                bankName,
                type,
                currency,
                creditCardType,
                showInQuickAdd
            },
        });

        console.log(`[DEBUG] Update result:`, result);

        if (result.count === 0) {
            console.log(`[DEBUG] Wallet update failed: Not found or unauthorized`);
            return res.status(404).json({ error: 'Wallet not found or unauthorized' });
        }

        const wallet = await prisma.account.findUnique({
            where: { id }
        });

        res.json(wallet);
    } catch (error) {
        console.error('[DEBUG] Update wallet error:', error);
        res.status(500).json({ error: 'Failed to update wallet' });
    }
});

// Delete Wallet
router.delete('/wallets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Check for related transactions
        const transactionCount = await prisma.transaction.count({
            where: { accountId: id }
        });

        if (transactionCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete wallet with existing transactions. Please delete the transactions first.'
            });
        }

        // Check for ownership and delete
        const result = await prisma.account.deleteMany({
            where: { id, userId }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Wallet not found or unauthorized' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[DEBUG] Delete wallet error:', error);
        res.status(500).json({ error: 'Failed to delete wallet' });
    }
});

export const walletsRouter = router;
