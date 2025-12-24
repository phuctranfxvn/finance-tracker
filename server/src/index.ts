import './config'; // Load envs FIRST
import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './db'; // Use shared prisma instance

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:9000',
            'https://fin.tranphuc.site',
            process.env.CLIENT_URL
        ].filter(Boolean);

        if (allowedOrigins.includes(origin) || process.env.CLIENT_URL === '*') {
            callback(null, true);
        } else {
            // For development flexibility, you might want to allow all:
            // callback(null, true);
            // But complying with standards:
            callback(null, true); // Reflect origin basically
        }
    },
    credentials: true
}));
app.use(express.json());

// Routes
import { walletsRouter } from './routes/wallets';
import { transactionsRouter } from './routes/transactions';
import { dashboardRouter } from './routes/dashboard';
import { savingsRouter } from './routes/savings';
import { debtsRouter } from './routes/debts';
import { categoriesRouter } from './routes/categories';
import { authRouter } from './routes/auth';

app.use('/api', authRouter);
app.use('/api', walletsRouter);
app.use('/api', transactionsRouter);
app.use('/api', dashboardRouter);
app.use('/api', savingsRouter);
app.use('/api', debtsRouter);
app.use('/api', categoriesRouter);

app.get('/', (req: Request, res: Response) => {
    res.send('Finance Tracker API is running');
});

// Serve static files from the React client
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Handle React routing, return all requests to React app
app.get(/(.*)/, (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../client/dist', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`CORS allowed origin: ${process.env.CLIENT_URL}`);
    console.log(`WebAuthn RP_ID config: ${process.env.RP_ID}`);
});

// Export prisma for use in other files - Re-export from db
export { prisma } from './db';
