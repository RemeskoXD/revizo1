import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
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
      return NextResponse.json({ message: 'DATABASE_URL added to .env' });
    } else {
      return NextResponse.json({ message: 'DATABASE_URL already exists in .env' });
    }
  } else {
    return NextResponse.json({ message: 'Missing DB environment variables' }, { status: 400 });
  }
}
