import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout, stderr } = await execAsync('npx prisma db push && npx prisma generate');
    return NextResponse.json({ success: true, message: 'Databáze byla úspěšně aktualizována.', stdout, stderr });
  } catch (error: any) {
    console.error('DB push error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
