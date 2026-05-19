const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection successful!", Date.now() - start, "ms");
  } catch (e) {
    console.error("Database connection failed:");
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
