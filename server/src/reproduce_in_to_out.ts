
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log("Setting up test data for IN -> OUT sync...");

    // 1. Create User
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");
    const userId = user.id;

    // 2. Create Wallets
    const wallet1 = await prisma.account.create({
        data: { name: "Wallet 1", userId, balance: 1000000 }
    });
    const wallet2 = await prisma.account.create({
        data: { name: "Wallet 2", userId, balance: 0 }
    });

    console.log(`Created Wallets: 1 (${wallet1.id}) and 2 (${wallet2.id})`);

    // 3. Create Transfer (Mocking the POST logic)
    const amount = 200000;
    const date = new Date(); // Shared timestamp

    // Create Out (Wallet 1)
    const tOut = await prisma.transaction.create({
        data: {
            amount: amount,
            type: 'TRANSFER',
            category: 'Transfer Out',
            accountId: wallet1.id,
            userId,
            date: date,
            note: "Transfer to Wallet 2",
            isPrivate: false
        }
    });

    // Create In (Wallet 2)
    const tIn = await prisma.transaction.create({
        data: {
            amount: amount,
            type: 'TRANSFER',
            category: 'Transfer In',
            accountId: wallet2.id,
            userId,
            date: date, // Same date
            note: "Transfer from Wallet 1",
            isPrivate: false
        }
    });

    console.log(`Created Transfer: Out (${tOut.id}) and In (${tIn.id}) with amount ${amount}`);

    // 4. Simulate PUT Update on tIn (The "Transfer In" transaction)
    console.log("Updating tIn (Transfer In) amount to 300000...");

    const idToUpdate = tIn.id;
    const newAmount = 300000;

    // Fetch existing (simulating route)
    const existingTx = await prisma.transaction.findUnique({
        where: { id: idToUpdate, userId }
    });

    if (!existingTx) throw new Error("Existing Tx not found");

    // --- TRANSFER SYNC LOGIC (Copied from route) ---
    let partnerTx: any = null;
    if (existingTx.type === 'TRANSFER') {
        const isTransferIn = existingTx.category === 'Transfer In';
        const partnerCategory = isTransferIn ? 'Transfer Out' : 'Transfer In';

        const bufferTime = 2000;
        const minDate = new Date(new Date(existingTx.date).getTime() - bufferTime);
        const maxDate = new Date(new Date(existingTx.date).getTime() + bufferTime);

        console.log(`[DEBUG] Logic check: Category=${existingTx.category}, SearchPartner=${partnerCategory}`);
        console.log(`[DEBUG] Searching for partner: amount=${existingTx.amount}, date between ${minDate.toISOString()} and ${maxDate.toISOString()}`);

        partnerTx = await prisma.transaction.findFirst({
            where: {
                userId,
                type: 'TRANSFER',
                category: partnerCategory,
                amount: existingTx.amount,
                date: {
                    gte: minDate,
                    lte: maxDate
                },
                NOT: { id: existingTx.id }
            }
        });
    }

    if (partnerTx) {
        console.log(`[SUCCESS] Found partner: ${partnerTx.id} (${partnerTx.category}) on account ${partnerTx.accountId}`);
    } else {
        console.log("[FAILURE] No partner found!");
    }

    // Update Main Tx
    await prisma.transaction.update({
        where: { id: idToUpdate },
        data: { amount: newAmount }
    });

    // Update Partner Tx
    if (partnerTx) {
        await prisma.transaction.update({
            where: { id: partnerTx.id },
            data: { amount: newAmount }
        });
        console.log("Updated partner tx amount");
    }

    // 5. Inspect Results
    const finalTOut = await prisma.transaction.findUnique({ where: { id: tOut.id } });
    const finalTIn = await prisma.transaction.findUnique({ where: { id: tIn.id } });

    console.log("Final State:");
    console.log(`TOut (${finalTOut?.category}): ${finalTOut?.amount}`);
    console.log(`TIn (${finalTIn?.category}): ${finalTIn?.amount}`);

    // Check balances
    const finalW1 = await prisma.account.findUnique({ where: { id: wallet1.id } });
    const finalW2 = await prisma.account.findUnique({ where: { id: wallet2.id } });

    // Note: This script simulates the transaction update steps but not the full balance update logic of the route. 
    // We are primarily testing the PARTNER FINDING logic here.

    // Cleanup
    await prisma.transaction.deleteMany({ where: { id: { in: [tOut.id, tIn.id] } } });
    await prisma.account.deleteMany({ where: { id: { in: [wallet1.id, wallet2.id] } } });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
