const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result1 = await prisma.$queryRawUnsafe('SHOW CREATE TABLE `Order`');
  const result2 = await prisma.$queryRawUnsafe('SHOW CREATE TABLE `DefectTask`');
  const result3 = await prisma.$queryRawUnsafe('SHOW CREATE TABLE `User`');
  console.dir(result1, { depth: null });
  console.dir(result2, { depth: null });
  console.dir(result3, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
