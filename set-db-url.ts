import fs from 'fs';
import path from 'path';

const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbName = process.env.DB_NAME;

if (dbUser && dbPassword && dbHost && dbName) {
  const dbUrl = `mysql://${dbUser}:${dbPassword}@${dbHost}:3306/${dbName}`;
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('DATABASE_URL=')) {
    envContent += `\nDATABASE_URL="${dbUrl}"\n`;
    fs.writeFileSync(envPath, envContent);
    console.log('DATABASE_URL added to .env');
  } else {
    console.log('DATABASE_URL already exists in .env');
  }
} else {
  console.log('Missing DB environment variables');
}
