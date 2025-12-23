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
exports.debtsRouter = void 0;
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
// Get Debts
router.get('/debts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const debts = yield index_1.prisma.debt.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(debts);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch debts' });
    }
}));
// Create Debt
router.post('/debts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, amount, dueDate } = req.body;
        const userId = req.user.userId;
        const debt = yield index_1.prisma.debt.create({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create debt' });
    }
}));
// Pay Debt (Partial or Full)
router.post('/debts/:id/pay', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { amount, sourceAccountId } = req.body;
        const result = yield index_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const debt = yield tx.debt.findUnique({ where: { id } });
            if (!debt || debt.isPaid) {
                throw new Error("Invalid debt to pay");
            }
            const paymentAmount = Number(amount);
            const newRemaining = Number(debt.remainingAmount) - paymentAmount;
            const isFullyPaid = newRemaining <= 0;
            // 1. Update Debt
            const updatedDebt = yield tx.debt.update({
                where: { id },
                data: {
                    remainingAmount: newRemaining < 0 ? 0 : newRemaining,
                    isPaid: isFullyPaid
                }
            });
            // 2. Deduct from Source Account
            if (sourceAccountId) {
                yield tx.account.update({
                    where: { id: sourceAccountId },
                    data: {
                        balance: {
                            decrement: paymentAmount
                        }
                    }
                });
                // Create Transaction Record
                yield tx.transaction.create({
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
        }));
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to pay debt' });
    }
}));
exports.debtsRouter = router;
