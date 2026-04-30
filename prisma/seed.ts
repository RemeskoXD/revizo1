import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin
  await prisma.user.upsert({
    where: { email: 'ludvikremesekwork@gmail.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'ludvikremesekwork@gmail.com',
      name: 'Ludvík (Admin)',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // Create Product Manager
  await prisma.user.upsert({
    where: { email: 'pm@example.com' },
    update: { role: 'PRODUCT_MANAGER' },
    create: {
      email: 'pm@example.com',
      name: 'Jan (Produkt manažer)',
      password: hashedPassword,
      role: 'PRODUCT_MANAGER',
    },
  });

  // Create Customer
  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: { role: 'CUSTOMER' },
    create: {
      email: 'customer@example.com',
      name: 'Karel (Zákazník)',
      password: hashedPassword,
      role: 'CUSTOMER',
    },
  });

  console.log('Database seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
