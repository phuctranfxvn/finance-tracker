"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getWallets() {
    // For now, fetching all accounts. In real app, filter by auth user
    // const session = await auth();
    // const userId = session.user.id;

    // Mocking a default user for development
    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: "demo@example.com",
                name: "Demo User",
            }
        });
    }

    return await prisma.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createWallet(formData: FormData) {
    const name = formData.get("name") as string;
    const balance = parseFloat(formData.get("balance") as string);
    const currency = formData.get("currency") as string;
    const type = formData.get("type") as "WALLET" | "BANK";

    const user = await prisma.user.findFirst();
    if (!user) throw new Error("User not found");

    await prisma.account.create({
        data: {
            userId: user.id,
            name,
            balance,
            currency,
            type,
        }
    });

    revalidatePath("/wallets");
    return { success: true };
}
