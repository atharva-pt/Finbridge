import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
}

export function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-3">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-xs text-foreground/70 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
