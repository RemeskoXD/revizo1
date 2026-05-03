const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result1 = await prisma.$queryRawUnsafe('DESCRIBE `Order`');
  const result2 = await prisma.$queryRawUnsafe('DESCRIBE `DefectTask`');
  console.log("Order:");
  console.dir(result1, { depth: null });
  console.log("DefectTask:");
  console.dir(result2, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
