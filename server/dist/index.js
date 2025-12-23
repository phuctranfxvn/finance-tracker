"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));
app.use(express_1.default.json());
// Routes
const wallets_1 = require("./routes/wallets");
const transactions_1 = require("./routes/transactions");
const dashboard_1 = require("./routes/dashboard");
const savings_1 = require("./routes/savings");
const debts_1 = require("./routes/debts");
const categories_1 = require("./routes/categories");
const auth_1 = require("./routes/auth");
app.use('/api', auth_1.authRouter);
app.use('/api', wallets_1.walletsRouter);
app.use('/api', transactions_1.transactionsRouter);
app.use('/api', dashboard_1.dashboardRouter);
app.use('/api', savings_1.savingsRouter);
app.use('/api', debts_1.debtsRouter);
app.use('/api', categories_1.categoriesRouter);
const path_1 = __importDefault(require("path"));
app.get('/', (req, res) => {
    res.send('Finance Tracker API is running');
});
// Serve static files from the React client
app.use(express_1.default.static(path_1.default.join(__dirname, '../../client/dist')));
// Handle React routing, return all requests to React app
app.get(/(.*)/, (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../client/dist', 'index.html'));
});
// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
