import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { RP_ID, CLIENT_URL } from '../config';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

export const authRouter = Router();

// Fix BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

// Secret key (in prod, use env var)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key';

const rpName = 'Finance Tracker';


// Register
authRouter.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password, name } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }

        // Check internal existence
        const existing = await prisma.user.findFirst({
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

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                name
            }
        });

        // Initialize default wallet for user
        await prisma.account.create({
            data: {
                userId: user.id,
                name: "Main Wallet",
                type: "WALLET",
                balance: 0,
                currency: "VND"
            }
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, username: user.username, email: user.email, name: user.name, preferences: user.preferences } });

    } catch (error) {
        console.error('Register failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
authRouter.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, username: user.username, email: user.email, name: user.name, preferences: user.preferences } });

    } catch (error) {
        console.error('Login failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Me (Verify Token)
authRouter.get('/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });

        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { passkeys: { select: { id: true, createdAt: true, credentialID: true } } }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            preferences: user.preferences,
            passkeys: user.passkeys
        });

    } catch (error) {
        // console.error('Me failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Update Profile (Preferences)
authRouter.put('/auth/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const { preferences, name } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: decoded.userId },
            data: {
                preferences: preferences !== undefined ? preferences : undefined,
                name: name !== undefined ? name : undefined
            }
        });

        res.json({ id: updatedUser.id, username: updatedUser.username, email: updatedUser.email, name: updatedUser.name, preferences: updatedUser.preferences });
    } catch (error) {
        console.error('Update profile failed', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Verify Password (Secure Toggle)
authRouter.post('/auth/verify-password', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'Password required' });

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || !user.password) return res.status(404).json({ error: 'User not found' });

        const isValid = await bcrypt.compare(password, user.password);
        res.json({ success: isValid });

    } catch (error) {
        console.error('Password verification failed', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Passkey: Register Options
authRouter.post('/auth/passkey/register/options', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { passkeys: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const usedRPID = RP_ID;
        console.log('--- DEBUG PASSKEY REGISTRATION ---');
        console.log('Config import RP_ID:', RP_ID);
        console.log('process.env.RP_ID:', process.env.RP_ID);
        console.log('Final usedRPID:', usedRPID);
        console.log('----------------------------------');

        const options = await generateRegistrationOptions({
            rpName,
            rpID: usedRPID,
            userName: user.username,
            attestationType: 'none',
            excludeCredentials: user.passkeys.map(passkey => ({
                id: passkey.credentialID,
                transports: passkey.transports ? (passkey.transports.split(',') as any) : undefined,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        });

        // Store challenge
        await prisma.authChallenge.create({
            data: {
                challenge: options.challenge,
                expiresAt: new Date(Date.now() + 60000), // 1 minute
                userId: user.id
            }
        });

        res.json(options);

    } catch (error) {
        console.error('Passkey register options failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Passkey: Register Verify
authRouter.post('/auth/passkey/register/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const { response } = req.body;

        // Find challenge
        // Note: For registration, we need to know the challenge associated with this user.
        // In a real app we might store this more robustly or include it in the request.
        // Here we just find the most recent challenge for this user.
        const challengeRecord = await prisma.authChallenge.findFirst({
            where: { userId: decoded.userId },
            orderBy: { expiresAt: 'desc' }
        });

        if (!challengeRecord || challengeRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Challenge expired or not found' });
        }

        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: challengeRecord.challenge,
            expectedOrigin: CLIENT_URL,
            expectedRPID: RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
            const info = verification.registrationInfo as any;
            console.log('Verification Info:', info);

            // Use the client-provided ID (base64url) which is safe for storage and lookup
            const dbCredentialID = response.id;

            // Public key is required. info.credentialPublicKey is likely Uint8Array
            const rawPublicKey = info.credentialPublicKey || (info.credential && info.credential.publicKey);
            if (!rawPublicKey) {
                throw new Error('No public key found in registration info');
            }
            const dbPublicKey = isoUint8Array.toHex(rawPublicKey);

            const dbCounter = BigInt(info.counter || 0);

            // Check if passkey already exists to avoid 500
            const existingPasskey = await prisma.passkey.findUnique({
                where: { credentialID: dbCredentialID }
            });

            if (existingPasskey) {
                // If it belongs to same user, maybe update? Or just return success?
                if (existingPasskey.userId === decoded.userId) {
                    // Update counter and public key just in case
                    await prisma.passkey.update({
                        where: { id: existingPasskey.id },
                        data: {
                            publicKey: dbPublicKey,
                            counter: dbCounter,
                            transports: response.transports ? response.transports.join(',') : null
                        }
                    });
                } else {
                    return res.status(400).json({ error: 'Passkey already registered by another user' });
                }
            } else {
                await prisma.passkey.create({
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
            await prisma.authChallenge.delete({ where: { id: challengeRecord.id } });

            res.json({ verified: true });
        } else {
            res.status(400).json({ error: 'Verification failed', verified: false });
        }

    } catch (error) {
        console.error('Passkey register verify failed:', error);
        // Safely extract error message
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Registration failed', details: message });
    }
});

// Passkey: Login Options
authRouter.post('/auth/passkey/login/options', async (req, res) => {
    try {
        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            userVerification: 'preferred',
        });

        // Store challenge (no userId yet since we don't know who is trying to login)
        await prisma.authChallenge.create({
            data: {
                challenge: options.challenge,
                expiresAt: new Date(Date.now() + 60000), // 1 minute
            }
        });

        res.json(options);

    } catch (error) {
        console.error('Passkey login options failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Passkey: Login Verify
authRouter.post('/auth/passkey/login/verify', async (req, res) => {
    try {
        const { response } = req.body;

        // Find credential
        const passkey = await prisma.passkey.findUnique({
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
        if (!challenge) return res.status(400).json({ error: 'Challenge required' });

        const challengeRecord = await prisma.authChallenge.findFirst({
            where: { challenge }
        });

        if (!challengeRecord || challengeRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Challenge expired or invalid' });
        }

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: challengeRecord.challenge,
            expectedOrigin: CLIENT_URL,
            expectedRPID: RP_ID,
            credential: {
                id: passkey.credentialID,
                publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'hex')),
                counter: Number(passkey.counter),
                transports: passkey.transports ? (passkey.transports.split(',') as any) : undefined,
            },
        });

        if (verification.verified) {
            const { authenticationInfo } = verification;

            // Update counter
            await prisma.passkey.update({
                where: { id: passkey.id },
                data: { counter: BigInt(authenticationInfo.newCounter) }
            });

            // Cleanup challenge
            await prisma.authChallenge.delete({ where: { id: challengeRecord.id } });

            // Issue JWT
            const token = jwt.sign({ userId: passkey.userId }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ verified: true, token, user: passkey.user });
        } else {
            res.status(400).json({ error: 'Verification failed', verified: false });
        }

    } catch (error) {
        console.error('Passkey login verify failed:', error);
        // Safely extract error message
        const message = error instanceof Error ? error.message : String(error);
    }
});

// Delete Passkey
authRouter.delete('/auth/passkeys/:id', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const { id } = req.params;

        const passkey = await prisma.passkey.findUnique({ where: { id } });

        if (!passkey) {
            return res.status(404).json({ error: 'Passkey not found' });
        }

        if (passkey.userId !== decoded.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.passkey.delete({ where: { id } });

        res.json({ success: true });

    } catch (error) {
        console.error('Delete passkey failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
