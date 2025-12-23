"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savingsRouter = void 0;
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
// Get Savings
router.get('/savings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const savings = yield index_1.prisma.saving.findMany({
            where: { userId: req.user.userId },
            include: {
                sourceAccount: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(savings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch savings' });
    }
}));
// Create Saving Goal / Deposit
router.post('/savings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bankName, amount, interestRate, startDate, endDate, sourceAccountId } = req.body;
        const userId = req.user.userId;
        // Transaction to deduct from source account and create saving
        const result = yield index_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Create Saving Record
            const saving = yield tx.saving.create({
                data: {
                    bankName,
                    amount,
                    interestRate,
                    startDate: startDate ? new Date(startDate) : new Date(),
                    endDate: endDate ? new Date(endDate) : null,
                    sourceAccountId,
                    userId,
                    isSettled: false
                }
            });
            // 2. Deduct from Source Account (if specified)
            if (sourceAccountId) {
                yield tx.account.update({
                    where: { id: sourceAccountId },
                    data: {
                        balance: {
                            decrement: amount
                        }
                    }
                });
                // Optional: Create a "Transfer" transaction record for tracking
                yield tx.transaction.create({
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
        }));
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create saving' });
    }
}));
// Settle Saving (Withdraw)
router.post('/savings/:id/settle', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { targetAccountId } = req.body; // Where to return the money
        const result = yield index_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const saving = yield tx.saving.findUnique({ where: { id } });
            if (!saving || saving.isSettled) {
                throw new Error("Invalid saving to settle");
            }
            // Calculate Interest (Simple Mock Calculation)
            // Real world: (Amount * Rate * Days) / 365
            const days = Math.floor((new Date().getTime() - new Date(saving.startDate).getTime()) / (1000 * 3600 * 24));
            const interest = Number(saving.amount) * (Number(saving.interestRate) / 100) * (days / 365);
            const totalReturn = Number(saving.amount) + interest;
            // 1. Mark as Settled
            const updatedSaving = yield tx.saving.update({
                where: { id },
                data: { isSettled: true }
            });
            // 2. Add to Target Account
            if (targetAccountId) {
                yield tx.account.update({
                    where: { id: targetAccountId },
                    data: {
                        balance: {
                            increment: totalReturn
                        }
                    }
                });
                // Create Income Transaction
                yield tx.transaction.create({
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
            }
            return { updatedSaving, totalReturn, interest };
        }));
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to settle saving' });
    }
}));
exports.savingsRouter = router;
