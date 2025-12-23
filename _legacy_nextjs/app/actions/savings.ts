"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSavings() {
    const user = await prisma.user.findFirst();
    if (!user) return [];

    return await prisma.saving.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });
}
// Add create logic later if needed
