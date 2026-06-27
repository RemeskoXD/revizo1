import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { token, code, email } = await req.json();

    if (token) {
      const user = await prisma.user.findFirst({
        where: { emailVerificationToken: token }
      });
      if (!user) return NextResponse.json({ message: "Neplatný nebo expirovaný odkaz." }, { status: 400 });

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date(), emailVerificationToken: null, emailVerificationCode: null }
      });
      return NextResponse.json({ message: "E-mail byl úspěšně ověřen." });
    }

    if (code && email) {
      const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), emailVerificationCode: code }
      });
      if (!user) return NextResponse.json({ message: "Neplatný kód." }, { status: 400 });

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date(), emailVerificationToken: null, emailVerificationCode: null }
      });
      return NextResponse.json({ message: "E-mail byl úspěšně ověřen." });
    }

    return NextResponse.json({ message: "Chybí ověřovací údaje." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Chyba při ověřování e-mailu." }, { status: 500 });
  }
}
