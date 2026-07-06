/** Piccoli componenti riutilizzabili del design system. */
import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-5', className)}>{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-text-secondary text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  deltaGood,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaGood?: boolean;
}) {
  return (
    <Card>
      <div className="text-sm text-text-secondary">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {delta && (
        <div className={cn('text-sm mt-1', deltaGood ? 'text-success' : 'text-danger')}>
          {delta}
        </div>
      )}
    </Card>
  );
}

export function Badge({
  children,
  color = 'default',
}: {
  children: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  const colors = {
    default: 'bg-border text-text-secondary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
    accent: 'bg-accent/15 text-accent',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', colors[color])}>
      {children}
    </span>
  );
}

export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  emoji: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center text-center py-14">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-text-secondary mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export const inputClass =
  'bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent w-full';

export const buttonPrimary =
  'bg-accent hover:bg-accent-hover transition rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';

export const buttonSecondary =
  'border border-border hover:bg-card-hover transition rounded-lg px-4 py-2 text-sm';
