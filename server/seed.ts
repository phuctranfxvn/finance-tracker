
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = 'demo-user-123';
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!existingUser) {
        await prisma.user.create({
            data: {
                id: userId,
                email: 'demo_unique_' + Date.now() + '@example.com',
                name: 'Demo User',
                password: 'password' // In real app, hash this
            }
        });
        console.log('Created demo user');
    } else {
        console.log('Demo user already exists');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
