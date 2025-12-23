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
            orderBy: { createdAt: 'desc' },
        });
        res.json(wallets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
});

router.post('/wallets', async (req, res) => {
    try {
        const { name, balance, currency, type, bankName } = req.body;
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
                userId,
            },
        });
        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create wallet' });
    }
});

// Update Wallet
router.put('/wallets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, bankName, type, currency } = req.body;
        const userId = req.user!.userId;

        const wallet = await prisma.account.update({
            where: { id, userId },
            data: {
                name,
                bankName,
                type,
                currency
            },
        });
        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update wallet' });
    }
});

export const walletsRouter = router;
