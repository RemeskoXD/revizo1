import { execSync } from 'child_process';

console.log('Running prisma db push...');
try {
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('Database schema pushed successfully.');
} catch (error) {
  console.error('Failed to push database schema:', error);
  process.exit(1);
}
