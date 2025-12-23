import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Resolve .env path relative to this file (which will be in dist/ or src/)
// If in dist/src/config.js -> ../../../.env
// If in dist/config.js -> ../../.env
// If in src/config.ts -> ../../.env (local dev with ts-node)

// Let's try multiple strategies to be safe
const possiblePaths = [
    path.resolve(__dirname, '../../.env'), // From dist/config.js or src/config.ts to server root
    path.resolve(__dirname, '../.env'),    // Backup
    path.resolve(process.cwd(), '.env')    // From CWD
];

let envPath = '';
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        envPath = p;
        break;
    }
}

console.log('Searching for .env file...');
if (envPath) {
    console.log(`Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.warn('WARNING: .env file not found in common locations.');
    console.log('Checked paths:', possiblePaths);
}

export const PORT = process.env.PORT || 4000;
export const CLIENT_URL = process.env.CLIENT_URL || '*';
export const RP_ID = process.env.RP_ID || 'localhost';
