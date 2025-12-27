
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany({
        take: 5,
        orderBy: {
            createdAt: 'desc',
        },
    });

    console.log(JSON.stringify(transactions, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
