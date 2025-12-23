import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply middleware
router.use(authenticateToken);

// Get all categories for the logged-in user
router.get('/categories', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const categories = await prisma.category.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        console.error("Failed to fetch categories", error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create a new category
router.post('/categories', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const { name, type, icon } = req.body;

        if (!name || !type || !icon) {
            return res.status(400).json({ error: 'Name, type, and icon are required' });
        }

        if (type !== 'INCOME' && type !== 'EXPENSE') {
            return res.status(400).json({ error: 'Type must be INCOME or EXPENSE' });
        }

        const category = await prisma.category.create({
            data: {
                userId,
                name,
                type,
                icon
            }
        });

        res.json(category);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Category already exists' });
        }
        console.error("Failed to create category", error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Delete a category
router.delete('/categories/:id', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        await prisma.category.delete({
            where: { id, userId } // Ensure user owns the category
        });

        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error("Failed to delete category", error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export const categoriesRouter = router;
