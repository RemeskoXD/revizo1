import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  alert?: boolean;
  href?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, trendUp, alert, href = "/dashboard/orders" }: StatCardProps) {
  return (
    <Link href={href} className={cn(
        "block p-6 rounded-xl border transition-all cursor-pointer",
        alert 
            ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10" 
            : "bg-[#1A1A1A] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-sm font-medium", alert ? "text-red-400" : "text-gray-400")}>{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
        </div>
        <div className={cn(
            "p-3 rounded-lg",
            alert ? "bg-red-500/10 text-red-500" : "bg-white/5 text-brand-yellow"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {description && (
        <p className="mt-4 text-sm text-gray-500">
          {description}
        </p>
      )}
    </Link>
  );
}
