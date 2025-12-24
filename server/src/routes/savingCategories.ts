import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get All Saving Categories
router.get('/saving-categories', async (req, res) => {
    try {
        const categories = await prisma.savingCategory.findMany({
            where: { userId: req.user!.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch saving categories' });
    }
});

// Create Saving Category
router.post('/saving-categories', async (req, res) => {
    try {
        const { name, icon, color } = req.body;
        const userId = req.user!.userId;

        const category = await prisma.savingCategory.create({
            data: {
                name,
                icon,
                color,
                userId
            }
        });

        res.json(category);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Category name already exists' });
        }
        res.status(500).json({ error: 'Failed to create saving category' });
    }
});

// Delete Saving Category
router.delete('/saving-categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.savingCategory.delete({
            where: { id, userId: req.user!.userId }
        });
        res.json({ success: true });
    } catch (error) {
        // If related savings exist, handle gracefully if needed (Prisma throws if strict constraint, but default relation is simple)
        res.status(500).json({ error: 'Failed to delete saving category' });
    }
});

export const savingCategoriesRouter = router;
