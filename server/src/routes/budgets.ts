
import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all budgets for the user (summary)
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const budgets = await prisma.budget.findMany({
            where: { userId },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ]
        });
        res.json(budgets);
    } catch (error) {
        console.error("Failed to fetch budgets", error);
        res.status(500).json({ error: "Failed to fetch budgets" });
    }
});

// Get specific budget details
router.get('/:year/:month', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const { year, month } = req.params;

        const budget = await prisma.budget.findUnique({
            where: {
                userId_month_year: {
                    userId,
                    month: parseInt(month),
                    year: parseInt(year)
                }
            },
            include: {
                items: true
            }
        });

        if (!budget) {
            return res.status(404).json({ error: "Budget not found" });
        }

        res.json(budget);
    } catch (error) {
        console.error("Failed to fetch budget details", error);
        res.status(500).json({ error: "Failed to fetch budget details" });
    }
});

// Create or update budget
router.post('/', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const { id, month, year, items } = req.body; // items: [{ category, amount }]

        if (!month || !year) {
            return res.status(400).json({ error: "Month and Year are required" });
        }

        const totalAmount = items.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

        // Transaction to ensure atomicity
        const budget = await prisma.$transaction(async (tx) => {
            let b;

            if (id) {
                // UPDATE existing budget (allows changing month/year)
                // Note: This might fail if another budget already exists for the target month/year
                // We let it fail for now (unique constraint) or we could handle it.
                b = await tx.budget.update({
                    where: { id },
                    data: {
                        month: parseInt(month),
                        year: parseInt(year),
                        totalAmount
                    }
                });
            } else {
                // CREATE or UPSERT (old logic for new budgets)
                // We use upsert to be safe if user tries to create distinct budget for same month
                b = await tx.budget.upsert({
                    where: {
                        userId_month_year: {
                            userId,
                            month: parseInt(month),
                            year: parseInt(year)
                        }
                    },
                    update: {
                        totalAmount
                    },
                    create: {
                        userId,
                        month: parseInt(month),
                        year: parseInt(year),
                        totalAmount
                    }
                });
            }

            // 2. Clear old items (simple strategy: replace all)
            await tx.budgetItem.deleteMany({
                where: { budgetId: b.id }
            });

            // 3. Create new items
            if (items && items.length > 0) {
                await tx.budgetItem.createMany({
                    data: items.map((item: any) => ({
                        budgetId: b.id,
                        category: item.category,
                        amount: item.amount
                    }))
                });
            }

            return b;
        });

        res.json(budget);

    } catch (error: any) {
        console.error("Failed to save budget", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "A budget for this month already exists" });
        }
        res.status(500).json({ error: "Failed to save budget" });
    }
});

// Delete budget
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        const budget = await prisma.budget.findFirst({
            where: { id, userId }
        });

        if (!budget) {
            return res.status(404).json({ error: "Budget not found" });
        }

        await prisma.budget.delete({
            where: { id }
        });

        res.json({ success: true });

    } catch (error) {
        console.error("Failed to delete budget", error);
        res.status(500).json({ error: "Failed to delete budget" });
    }
});

export const budgetRouter = router;
