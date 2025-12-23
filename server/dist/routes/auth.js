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
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const server_1 = require("@simplewebauthn/server");
const helpers_1 = require("@simplewebauthn/server/helpers");
exports.authRouter = (0, express_1.Router)();
// Fix BigInt serialization for JSON
BigInt.prototype.toJSON = function () {
    return this.toString();
};
// Secret key (in prod, use env var)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key';
const rpName = 'Finance Tracker';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.CLIENT_URL || 'http://localhost:9000'; // Updated to match current Vite port
// Register
exports.authRouter.post('/auth/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password, name } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }
        // Check internal existence
        const existing = yield index_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const user = yield index_1.prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                name
            }
        });
        // Initialize default wallet for user
        yield index_1.prisma.account.create({
            data: {
                userId: user.id,
                name: "Main Wallet",
                type: "WALLET",
                balance: 0,
                currency: "VND"
            }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, name: user.name, preferences: user.preferences } });
    }
    catch (error) {
        console.error('Register failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Login
exports.authRouter.post('/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        const user = yield index_1.prisma.user.findUnique({ where: { username } });
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, name: user.name, preferences: user.preferences } });
    }
    catch (error) {
        console.error('Login failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Me (Verify Token)
exports.authRouter.get('/auth/me', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        if (!token)
            return res.status(401).json({ error: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { passkeys: { select: { id: true, createdAt: true, credentialID: true } } }
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            preferences: user.preferences,
            passkeys: user.passkeys
        });
    }
    catch (error) {
        // console.error('Me failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}));
// Update Profile (Preferences)
exports.authRouter.put('/auth/profile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { preferences, name } = req.body;
        const updatedUser = yield index_1.prisma.user.update({
            where: { id: decoded.userId },
            data: {
                preferences: preferences !== undefined ? preferences : undefined,
                name: name !== undefined ? name : undefined
            }
        });
        res.json({ id: updatedUser.id, username: updatedUser.username, email: updatedUser.email, name: updatedUser.name, preferences: updatedUser.preferences });
    }
    catch (error) {
        console.error('Update profile failed', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
}));
// Verify Password (Secure Toggle)
exports.authRouter.post('/auth/verify-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { password } = req.body;
        if (!password)
            return res.status(400).json({ error: 'Password required' });
        const user = yield index_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || !user.password)
            return res.status(404).json({ error: 'User not found' });
        const isValid = yield bcryptjs_1.default.compare(password, user.password);
        res.json({ success: isValid });
    }
    catch (error) {
        console.error('Password verification failed', error);
        res.status(500).json({ error: 'Verification failed' });
    }
}));
// Passkey: Register Options
exports.authRouter.post('/auth/passkey/register/options', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { passkeys: true }
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const options = yield (0, server_1.generateRegistrationOptions)({
            rpName,
            rpID,
            userName: user.username,
            attestationType: 'none',
            excludeCredentials: user.passkeys.map(passkey => ({
                id: passkey.credentialID,
                transports: passkey.transports ? passkey.transports.split(',') : undefined,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        });
        // Store challenge
        yield index_1.prisma.authChallenge.create({
            data: {
                challenge: options.challenge,
                expiresAt: new Date(Date.now() + 60000), // 1 minute
                userId: user.id
            }
        });
        res.json(options);
    }
    catch (error) {
        console.error('Passkey register options failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Passkey: Register Verify
exports.authRouter.post('/auth/passkey/register/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { response } = req.body;
        // Find challenge
        // Note: For registration, we need to know the challenge associated with this user.
        // In a real app we might store this more robustly or include it in the request.
        // Here we just find the most recent challenge for this user.
        const challengeRecord = yield index_1.prisma.authChallenge.findFirst({
            where: { userId: decoded.userId },
            orderBy: { expiresAt: 'desc' }
        });
        if (!challengeRecord || challengeRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Challenge expired or not found' });
        }
        const verification = yield (0, server_1.verifyRegistrationResponse)({
            response,
            expectedChallenge: challengeRecord.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });
        if (verification.verified && verification.registrationInfo) {
            const info = verification.registrationInfo;
            console.log('Verification Info:', info);
            // Use the client-provided ID (base64url) which is safe for storage and lookup
            const dbCredentialID = response.id;
            // Public key is required. info.credentialPublicKey is likely Uint8Array
            const rawPublicKey = info.credentialPublicKey || (info.credential && info.credential.publicKey);
            if (!rawPublicKey) {
                throw new Error('No public key found in registration info');
            }
            const dbPublicKey = helpers_1.isoUint8Array.toHex(rawPublicKey);
            const dbCounter = BigInt(info.counter || 0);
            // Check if passkey already exists to avoid 500
            const existingPasskey = yield index_1.prisma.passkey.findUnique({
                where: { credentialID: dbCredentialID }
            });
            if (existingPasskey) {
                // If it belongs to same user, maybe update? Or just return success?
                if (existingPasskey.userId === decoded.userId) {
                    // Update counter and public key just in case
                    yield index_1.prisma.passkey.update({
                        where: { id: existingPasskey.id },
                        data: {
                            publicKey: dbPublicKey,
                            counter: dbCounter,
                            transports: response.transports ? response.transports.join(',') : null
                        }
                    });
                }
                else {
                    return res.status(400).json({ error: 'Passkey already registered by another user' });
                }
            }
            else {
                yield index_1.prisma.passkey.create({
                    data: {
                        userId: decoded.userId,
                        credentialID: dbCredentialID,
                        publicKey: dbPublicKey,
                        counter: dbCounter,
                        transports: response.transports ? response.transports.join(',') : null,
                    }
                });
            }
            // Cleanup challenge
            yield index_1.prisma.authChallenge.delete({ where: { id: challengeRecord.id } });
            res.json({ verified: true });
        }
        else {
            res.status(400).json({ error: 'Verification failed', verified: false });
        }
    }
    catch (error) {
        console.error('Passkey register verify failed:', error);
        // Safely extract error message
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Registration failed', details: message });
    }
}));
// Passkey: Login Options
exports.authRouter.post('/auth/passkey/login/options', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const options = yield (0, server_1.generateAuthenticationOptions)({
            rpID,
            userVerification: 'preferred',
        });
        // Store challenge (no userId yet since we don't know who is trying to login)
        yield index_1.prisma.authChallenge.create({
            data: {
                challenge: options.challenge,
                expiresAt: new Date(Date.now() + 60000), // 1 minute
            }
        });
        res.json(options);
    }
    catch (error) {
        console.error('Passkey login options failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Passkey: Login Verify
exports.authRouter.post('/auth/passkey/login/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { response } = req.body;
        // Find credential
        const passkey = yield index_1.prisma.passkey.findUnique({
            where: { credentialID: response.id },
            include: { user: true }
        });
        if (!passkey) {
            return res.status(400).json({ error: 'Passkey not found' });
        }
        // Find challenge (we have to look up by challenge string from our DB since we saved it unassociated)
        // However, we don't receive the challenge back in the response body directly in a way we can trust without state.
        // Wait, normally the client sends back the challenge it signed? No, it signs the challenge.
        // We typically need to retrieve the expected challenge.
        // Since we didn't link it to a user, how do we find it?
        // Usually we use a session or a returning cookie, or the client sends the challenge ID.
        // For simplicity here, let's assume valid for any recent challenge or we need to refine the flow.
        // BUT: verifyAuthenticationResponse takes `expectedChallenge`.
        // We can look up the challenge by `response.clientDataJSON` if we decode it, but that's what the library does.
        // Let's implement a simpler way: The backend needs to know WHICH challenge to verify against.
        // Often we pass the challenge back to the client and they send it back? No, that defeats the security.
        // Standard practice: Store challenge in session (cookie).
        // Since we are stateless (JWT), we can't easily do this without a cookie or a temp ID.
        // workaround: Pass the challenge ID to the client in /options and have them send it back in /verify body.
        // We'll update /options to return an ID (our DB ID) and the client sends it back purely for lookup.
        // This is not the *signed* challenge, just a reference to it.
        // Let's fix /options first... actually I can't easily change the return type of generateAuthenticationOptions unless I wrap it.
        // I'll leave /options as is, but we need a way to link.
        // Actually, let's just find the challenge by comparing the one in clientDataJSON?
        // No, we need the *expected* challenge to verify the signature.
        // Let's try to find a challenge that matches what's in the clientDataJSON?
        // The library creates the challenge.
        // Actually, simplewebauthn docs say: "Retrieve the challenge from DB that was saved ... associated with the user's session".
        // Since we don't have a session, we can ask the client to send the challenge back in the request body (outside the response object),
        // effectively acting as the session ID. The client data is signed over the challenge, so if they send a fake challenge, the signature won't match (since the signature is over the challenge they actually saw).
        // So:
        // 1. Client requests options. Server sends options + challenge.
        // 2. Client signs.
        // 3. Client sends response object + the challenge it used (as 'challenge' field).
        // 4. Server uses that 'challenge' field to look up expiration in DB, then uses it as expectedChallenge.
        const { challenge } = req.body; // Passed back manually by client
        if (!challenge)
            return res.status(400).json({ error: 'Challenge required' });
        const challengeRecord = yield index_1.prisma.authChallenge.findFirst({
            where: { challenge }
        });
        if (!challengeRecord || challengeRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Challenge expired or invalid' });
        }
        const verification = yield (0, server_1.verifyAuthenticationResponse)({
            response,
            expectedChallenge: challengeRecord.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: passkey.credentialID,
                publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'hex')),
                counter: Number(passkey.counter),
                transports: passkey.transports ? passkey.transports.split(',') : undefined,
            },
        });
        if (verification.verified) {
            const { authenticationInfo } = verification;
            // Update counter
            yield index_1.prisma.passkey.update({
                where: { id: passkey.id },
                data: { counter: BigInt(authenticationInfo.newCounter) }
            });
            // Cleanup challenge
            yield index_1.prisma.authChallenge.delete({ where: { id: challengeRecord.id } });
            // Issue JWT
            const token = jsonwebtoken_1.default.sign({ userId: passkey.userId }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ verified: true, token, user: passkey.user });
        }
        else {
            res.status(400).json({ error: 'Verification failed', verified: false });
        }
    }
    catch (error) {
        console.error('Passkey login verify failed:', error);
        // Safely extract error message
        const message = error instanceof Error ? error.message : String(error);
    }
}));
// Delete Passkey
exports.authRouter.delete('/auth/passkeys/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { id } = req.params;
        const passkey = yield index_1.prisma.passkey.findUnique({ where: { id } });
        if (!passkey) {
            return res.status(404).json({ error: 'Passkey not found' });
        }
        if (passkey.userId !== decoded.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        yield index_1.prisma.passkey.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete passkey failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
