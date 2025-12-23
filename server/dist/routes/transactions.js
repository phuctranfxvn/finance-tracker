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
exports.transactionsRouter = void 0;
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
// Get Transactions
// Get Transactions with Pagination
router.get('/transactions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [transactions, total] = yield index_1.prisma.$transaction([
            index_1.prisma.transaction.findMany({
                where: { userId: req.user.userId },
                include: {
                    account: {
                        select: { name: true },
                    },
                },
                orderBy: { date: 'desc' },
                skip: skip,
                take: limit,
            }),
            index_1.prisma.transaction.count({
                where: { userId: req.user.userId },
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
}));
// Create Transaction
router.post('/transactions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, type, category, date, accountId, note, isPrivate } = req.body;
    const userId = req.user.userId;
    try {
        const result = yield index_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Create Transaction
            const transaction = yield tx.transaction.create({
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
            yield tx.account.update({
                where: { id: accountId },
                data: {
                    balance: {
                        increment: balanceChange,
                    },
                },
            });
            return transaction;
        }));
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
}));
exports.transactionsRouter = router;
