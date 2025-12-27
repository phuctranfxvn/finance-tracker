
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log("Setting up test data for DESYNC update...");

    // 1. Create User
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");
    const userId = user.id;

    // 2. Create Wallets
    const wallet1 = await prisma.account.create({
        data: { name: "Desync W1", userId, balance: 1000 }
    });
    const wallet2 = await prisma.account.create({
        data: { name: "Desync W2", userId, balance: 1000 }
    });

    // 3. Create Transfer with MISMATCHED amounts (simulating previous bug)
    const date = new Date();

    // T1: 100
    const tOut = await prisma.transaction.create({
        data: {
            amount: 100,
            type: 'TRANSFER',
            category: 'Transfer Out',
            accountId: wallet1.id,
            userId,
            date: date,
            note: "Desync Out",
            isPrivate: false
        }
    });

    // T2: 200 (Mismatch!)
    const tIn = await prisma.transaction.create({
        data: {
            amount: 200,
            type: 'TRANSFER',
            category: 'Transfer In',
            accountId: wallet2.id,
            userId,
            date: date,
            note: "Desync In",
            isPrivate: false
        }
    });

    console.log(`Created Desync: Out (${tOut.id}) = 100, In (${tIn.id}) = 200`);

    // 4. Simulate PUT Update on tIn (Amount 200) -> Should find tOut (Amount 100) via Fallback
    console.log("Updating tIn amount to 300...");

    const idToUpdate = tIn.id;
    const newAmount = 300;

    // Fetch existing
    const existingTx = await prisma.transaction.findUnique({ where: { id: idToUpdate, userId } });
    if (!existingTx) throw new Error("Tx not found");

    // --- REPLICATE ROUTE LOGIC ---
    let partnerTx: any = null;
    if (existingTx.type === 'TRANSFER') {
        const isTransferIn = existingTx.category === 'Transfer In';
        const partnerCategory = isTransferIn ? 'Transfer Out' : 'Transfer In';

        const bufferTime = 2000;
        const minDate = new Date(new Date(existingTx.date).getTime() - bufferTime);
        const maxDate = new Date(new Date(existingTx.date).getTime() + bufferTime);

        // Standard Search
        partnerTx = await prisma.transaction.findFirst({
            where: {
                userId,
                type: 'TRANSFER',
                category: partnerCategory,
                amount: existingTx.amount, // 200. Will NOT find tOut (100)
                date: { gte: minDate, lte: maxDate },
                NOT: { id: existingTx.id }
            }
        });

        if (!partnerTx) {
            console.log("Standard search failed (expected). Trying fallback...");
            const candidates = await prisma.transaction.findMany({
                where: {
                    userId,
                    type: 'TRANSFER',
                    category: partnerCategory,
                    date: { gte: minDate, lte: maxDate },
                    NOT: { id: existingTx.id }
                }
            });
            if (candidates.length === 1) {
                partnerTx = candidates[0];
                console.log(`[fallback] Found partner: ${partnerTx.id}`);
            }
        }
    }

    if (partnerTx && partnerTx.id === tOut.id) {
        console.log("SUCCESS: Linked correctly via fallback!");
        // Update partner
        await prisma.transaction.update({
            where: { id: partnerTx.id },
            data: { amount: newAmount }
        });
    } else {
        console.log("FAILURE: Could not link transactions.");
    }

    // Check results
    const finalTOut = await prisma.transaction.findUnique({ where: { id: tOut.id } });
    console.log(`Final TOut Amount: ${finalTOut?.amount}`); // Should be 300

    // Cleanup
    await prisma.transaction.deleteMany({ where: { id: { in: [tOut.id, tIn.id] } } });
    await prisma.account.deleteMany({ where: { id: { in: [wallet1.id, wallet2.id] } } });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
