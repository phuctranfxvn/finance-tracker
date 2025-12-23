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
exports.categoriesRouter = void 0;
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply middleware
router.use(auth_1.authenticateToken);
// Get all categories for the logged-in user
router.get('/categories', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const categories = yield index_1.prisma.category.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    }
    catch (error) {
        console.error("Failed to fetch categories", error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
}));
// Create a new category
router.post('/categories', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const { name, type, icon } = req.body;
        if (!name || !type || !icon) {
            return res.status(400).json({ error: 'Name, type, and icon are required' });
        }
        if (type !== 'INCOME' && type !== 'EXPENSE') {
            return res.status(400).json({ error: 'Type must be INCOME or EXPENSE' });
        }
        const category = yield index_1.prisma.category.create({
            data: {
                userId,
                name,
                type,
                icon
            }
        });
        res.json(category);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Category already exists' });
        }
        console.error("Failed to create category", error);
        res.status(500).json({ error: 'Failed to create category' });
    }
}));
// Delete a category
router.delete('/categories/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        yield index_1.prisma.category.delete({
            where: { id, userId } // Ensure user owns the category
        });
        res.json({ message: 'Category deleted' });
    }
    catch (error) {
        console.error("Failed to delete category", error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
}));
exports.categoriesRouter = router;
