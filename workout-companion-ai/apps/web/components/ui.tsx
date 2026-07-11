/**
 * Componenti base del design system "Executive Control Room"
 * (docs/08-DESIGN-SYSTEM.md): glassmorphism, glow neon, gradienti
 * Deep→Electric, tipografia Inter con gerarchia rigida.
 */
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/animated-number';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('glass rounded-xl p-5', className)}>{children}</div>;
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
    <div className="flex items-start justify-between mb-6 rise">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-text-secondary text-sm mt-1 font-light">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap justify-end">{actions}</div>}
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
    <Card className="glow rise">
      <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </div>
      <div className="text-3xl font-extrabold mt-1.5 text-white">
        <AnimatedNumber value={value} />
      </div>
      {delta && (
        <div
          className={cn('text-sm mt-1 font-semibold', deltaGood ? 'text-accent' : 'text-danger')}
        >
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
    default: 'bg-white/5 text-text-secondary border border-white/10',
    success: 'bg-accent/15 text-accent border border-accent/25',
    warning: 'bg-warning/15 text-warning border border-warning/25',
    danger: 'bg-danger/15 text-danger border border-danger/25',
    accent: 'bg-accent/15 text-accent border border-accent/25',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', colors[color])}>
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
    <Card className="flex flex-col items-center text-center py-14 rise">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-sm text-text-secondary mt-1 max-w-sm font-light">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export const inputClass =
  'bg-background/70 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(56,189,248,.35)] w-full transition';

export const buttonPrimary =
  'grad-primary hover:brightness-110 transition rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 shadow-[0_0_20px_-8px_rgba(56,189,248,.7)]';

export const buttonSecondary =
  'border border-celeste/25 hover:bg-card-hover hover:border-celeste/40 transition rounded-lg px-4 py-2 text-sm';
