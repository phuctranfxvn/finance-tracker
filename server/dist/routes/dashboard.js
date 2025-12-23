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
exports.dashboardRouter = void 0;
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/dashboard', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const [accounts, transactions] = yield Promise.all([
            index_1.prisma.account.findMany({ where: { userId } }),
            index_1.prisma.transaction.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: 5
            })
        ]);
        // Calculate Totals
        const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
        // For income/expense, ideally we aggregate over a time period (e.g., this month)
        // for now we might aggregate all-time or fetch separate aggregates
        const allTransactions = yield index_1.prisma.transaction.findMany({ where: { userId } });
        const totalIncome = allTransactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpense = allTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        // Group spending by category (Expense only)
        const spendingByCategory = allTransactions
            .filter(t => t.type === 'EXPENSE' && t.category)
            .reduce((acc, t) => {
            const cat = t.category;
            acc[cat] = (acc[cat] || 0) + Number(t.amount);
            return acc;
        }, {});
        res.json({
            totalBalance,
            totalIncome,
            totalExpense,
            recentTransactions: transactions,
            spendingByCategory
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
}));
exports.dashboardRouter = router;
