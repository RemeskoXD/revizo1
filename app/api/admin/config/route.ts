import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_CONFIG: Record<string, { value: string; label: string }> = {
  'public_timeout_hours': { value: '24', label: 'Doba do zveřejnění zakázky (hodiny)' },
  'global_banner': { value: '', label: 'Globální upozornění pro všechny uživatele' },
  'global_banner_type': { value: 'info', label: 'Typ banneru (info, warning, error)' },
  'max_file_size_mb': { value: '10', label: 'Maximální velikost souboru (MB)' },
  'default_revision_months': { value: '36', label: 'Výchozí platnost revize (měsíce)' },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const configs = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
    
    const result: Record<string, any> = {};
    for (const [key, def] of Object.entries(DEFAULT_CONFIG)) {
      const existing = configs.find(c => c.key === key);
      result[key] = {
        key,
        value: existing?.value ?? def.value,
        label: def.label,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json() as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      if (!DEFAULT_CONFIG[key]) continue;
      await prisma.systemConfig.upsert({
        where: { key },
        create: { key, value, label: DEFAULT_CONFIG[key].label },
        update: { value },
      });
    }

    return NextResponse.json({ message: 'Config updated' });
  } catch (error) {
    console.error('Update config error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
