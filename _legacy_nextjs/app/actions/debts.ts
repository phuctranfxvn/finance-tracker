"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getDebts() {
    const user = await prisma.user.findFirst();
    if (!user) return [];

    return await prisma.debt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });
}
