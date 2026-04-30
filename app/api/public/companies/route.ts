import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`companies-list:${ip}`, 60, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { message: "Příliš mnoho požadavků" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  try {
    const companies = await prisma.user.findMany({
      where: {
        role: "COMPANY_ADMIN"
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { message: "Chyba při načítání firem" },
      { status: 500 }
    );
  }
}
