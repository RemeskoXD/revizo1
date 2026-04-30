import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 401 });
    }
    // Create default admin
    const adminEmail = "admin@revizone.cz";
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await prisma.user.create({
        data: {
          name: "Admin User",
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN"
        }
      });
    }

    // Create default company admin
    const companyEmail = "firma@revizone.cz";
    let companyId = "";
    const existingCompany = await prisma.user.findUnique({ where: { email: companyEmail } });
    
    if (!existingCompany) {
      const hashedPassword = await bcrypt.hash("firma123", 10);
      const company = await prisma.user.create({
        data: {
          name: "Revizní Firma s.r.o.",
          email: companyEmail,
          password: hashedPassword,
          role: "COMPANY_ADMIN"
        }
      });
      companyId = company.id;
    } else {
      companyId = existingCompany.id;
    }

    // Create default technician
    const techEmail = "technik@revizone.cz";
    const existingTech = await prisma.user.findUnique({ where: { email: techEmail } });
    
    if (!existingTech) {
      const hashedPassword = await bcrypt.hash("technik123", 10);
      await prisma.user.create({
        data: {
          name: "Ing. Petr Svoboda",
          email: techEmail,
          password: hashedPassword,
          role: "TECHNICIAN",
          companyId: companyId || null
        }
      });
    }

    // Create default realty
    const realtyEmail = "reality@revizone.cz";
    const existingRealty = await prisma.user.findUnique({ where: { email: realtyEmail } });
    
    if (!existingRealty) {
      const hashedPassword = await bcrypt.hash("reality123", 10);
      await prisma.user.create({
        data: {
          name: "Realitní Kancelář",
          email: realtyEmail,
          password: hashedPassword,
          role: "REALTY"
        }
      });
    }

    // Create default customer
    const custEmail = "zakaznik@revizone.cz";
    let customerId = "";
    const existingCust = await prisma.user.findUnique({ where: { email: custEmail } });
    
    if (!existingCust) {
      const hashedPassword = await bcrypt.hash("zakaznik123", 10);
      const cust = await prisma.user.create({
        data: {
          name: "Jan Novák",
          email: custEmail,
          password: hashedPassword,
          role: "CUSTOMER"
        }
      });
      customerId = cust.id;
    } else {
      customerId = existingCust.id;
    }

    // Create some sample orders if none exist
    const orderCount = await prisma.order.count();
    if (orderCount === 0 && customerId) {
      await Promise.all([
        prisma.order.create({
          data: {
            readableId: "ORD-2023-156",
            customerId: customerId,
            serviceType: "Elektroinstalace",
            propertyType: "Byt",
            address: "Praha 5",
            status: "PENDING"
          }
        }),
        prisma.order.create({
          data: {
            readableId: "ORD-2023-157",
            customerId: customerId,
            serviceType: "Plyn",
            propertyType: "Rodinný dům",
            address: "Brno",
            status: "COMPLETED"
          }
        })
      ]);
    }

    return NextResponse.json({ message: "Database seeded successfully" });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ message: "Migration failed" }, { status: 500 });
  }
}
