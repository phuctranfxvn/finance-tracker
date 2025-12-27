
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log("Setting up test data...");

    // 1. Create User
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");
    const userId = user.id;

    // 2. Create Wallets
    const walletA = await prisma.account.create({
        data: { name: "Test Wallet A", userId, balance: 1000 }
    });
    const walletB = await prisma.account.create({
        data: { name: "Test Wallet B", userId, balance: 1000 }
    });

    console.log(`Created Wallets: A (${walletA.id}), B (${walletB.id})`);

    // 3. Create Transfer (Mocking the POST logic)
    const amount = 100;
    const date = new Date();

    const tOut = await prisma.transaction.create({
        data: {
            amount: amount,
            type: 'TRANSFER',
            category: 'Transfer Out',
            accountId: walletA.id,
            userId,
            date: date,
            note: "Transfer to B",
            isPrivate: false
        }
    });

    const tIn = await prisma.transaction.create({
        data: {
            amount: amount,
            type: 'TRANSFER',
            category: 'Transfer In',
            accountId: walletB.id,
            userId,
            date: date, // Same date
            note: "Transfer from A",
            isPrivate: false
        }
    });

    console.log(`Created Transfer: Out (${tOut.id}) -100, In (${tIn.id}) +100`);

    // 4. Simulate PUT Update on tOut
    console.log("Updating tOut amount to 150...");

    const newAmount = 150;
    const existingTx = tOut;

    // --- TRANSFER SYNC LOGIC (Copied from route) ---
    let partnerTx: any = null;
    if (existingTx.type === 'TRANSFER') {
        const isTransferIn = existingTx.category === 'Transfer In';
        const partnerCategory = isTransferIn ? 'Transfer Out' : 'Transfer In';

        const bufferTime = 2000;
        const minDate = new Date(new Date(existingTx.date).getTime() - bufferTime);
        const maxDate = new Date(new Date(existingTx.date).getTime() + bufferTime);

        console.log(`Searching for partner: amount=${existingTx.amount}, date between ${minDate.toISOString()} and ${maxDate.toISOString()}`);

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
        console.log(`Found partner: ${partnerTx.id} on account ${partnerTx.accountId}`);
    } else {
        console.log("No partner found!");
    }

    // Update Main Tx
    await prisma.transaction.update({
        where: { id: tOut.id },
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
    console.log(`TOut (Account ${finalTOut?.accountId}): ${finalTOut?.amount}`);
    console.log(`TIn (Account ${finalTIn?.accountId}): ${finalTIn?.amount}`);

    // Cleanup
    await prisma.transaction.deleteMany({ where: { id: { in: [tOut.id, tIn.id] } } });
    await prisma.account.deleteMany({ where: { id: { in: [walletA.id, walletB.id] } } });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
