import fs from 'fs';
import path from 'path';

export function setupDatabaseUrl() {
  if (process.env.NODE_ENV === 'production') return;

  let dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl || !dbUrl.startsWith('mysql://')) {
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbHost = process.env.DB_HOST || dbUrl; // Use dbUrl as host if it's just a hostname
    const dbName = process.env.DB_NAME;
    if (dbUser && dbPassword && dbHost && dbName) {
      const encodedPassword = encodeURIComponent(dbPassword);
      dbUrl = `mysql://${dbUser}:${encodedPassword}@${dbHost}:3306/${dbName}`;
    }
  }

  if (dbUrl && dbUrl.startsWith('mysql://')) {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    
    // Replace existing DATABASE_URL if it exists
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(/DATABASE_URL=.*(\n|$)/g, `DATABASE_URL="${dbUrl}"\n`);
    } else {
      envContent += `\nDATABASE_URL="${dbUrl}"\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('DATABASE_URL added to .env');
  }
}
