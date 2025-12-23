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
exports.walletsRouter = void 0;
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply middleware to all routes in this router
router.use(auth_1.authenticateToken);
// Get Wallets
router.get('/wallets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const wallets = yield index_1.prisma.account.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(wallets);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
}));
// Create Wallet
router.post('/wallets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, balance, currency, type } = req.body;
        const userId = req.user.userId;
        // Simple validation
        if (!name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const wallet = yield index_1.prisma.account.create({
            data: {
                name,
                balance: balance || 0,
                currency: currency || 'VND',
                type: type || 'WALLET',
                userId,
            },
        });
        res.json(wallet);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create wallet' });
    }
}));
exports.walletsRouter = router;
