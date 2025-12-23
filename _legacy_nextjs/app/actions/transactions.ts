"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTransactions() {
    const user = await prisma.user.findFirst();
    if (!user) return [];

    return await prisma.transaction.findMany({
        where: { userId: user.id },
        include: { account: true },
        orderBy: { date: 'desc' }
    });
}

export async function createTransaction(data: {
    amount: number;
    type: "INCOME" | "EXPENSE";
    category: string;
    accountId: string;
    note?: string;
    isHidden?: boolean;
}) {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("User not found");

    // 1. Create Transaction
    await prisma.transaction.create({
        data: {
            userId: user.id,
            accountId: data.accountId,
            amount: data.amount,
            type: data.type,
            category: data.category,
            note: data.note,
            isHidden: data.isHidden || false,
        }
    });

    // 2. Update Account Balance
    const account = await prisma.account.findUnique({ where: { id: data.accountId } });
    if (account) {
        const newBalance = data.type === 'INCOME'
            ? Number(account.balance) + data.amount
            : Number(account.balance) - data.amount;

        await prisma.account.update({
            where: { id: data.accountId },
            data: { balance: newBalance }
        });
    }

    revalidatePath("/transactions");
    revalidatePath("/wallets");
    revalidatePath("/");
    return { success: true };
}
