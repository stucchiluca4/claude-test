/**
 * Primitive del sistema "Glass Over Iron" (DESIGN.md).
 * Il contenuto vive su FERRO opaco; il VETRO è riservato al livello dei
 * controlli (rail di navigazione, testate, barre d'azione, fogli).
 */
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/animated-number';

export function Card({
  className,
  children,
  beacon,
}: {
  className?: string;
  children: React.ReactNode;
  /** Il faro: solo per l'UNICO elemento a fuoco della pagina. */
  beacon?: boolean;
}) {
  return (
    <div className={cn('iron rounded-lg p-6', beacon && 'beacon', className)}>{children}</div>
  );
}

/** Superficie del livello VETRO: controlli che galleggiano sul contenuto. */
export function GlassBar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('glass-chrome rounded-2xl', className)}>{children}</div>;
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
    <div className="flex items-start justify-between gap-6 mb-8 rise">
      <div className="min-w-0">
        <h1 className="text-[34px] leading-tight font-extrabold tracking-[-0.02em] text-white">
          {title}
        </h1>
        {subtitle && <p className="text-text-secondary text-[15px] mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap justify-end shrink-0">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  deltaGood,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  delta?: string;
  deltaGood?: boolean;
  /** Il segnale porta significato: blu azione, menta fatto, ambra sforzo, rosa record. */
  tone?: 'neutral' | 'accent' | 'mint' | 'amber' | 'rose' | 'violet' | 'cyan';
}) {
  const toneText = {
    neutral: 'text-white',
    accent: 'text-accent',
    mint: 'text-mint',
    amber: 'text-amber',
    rose: 'text-rose',
    violet: 'text-violet',
    cyan: 'text-cyan',
  }[tone];

  return (
    <Card className="rise">
      <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
        {label}
      </div>
      <div className={cn('font-metric text-[40px] leading-none font-extrabold mt-2.5', toneText)}>
        <AnimatedNumber value={value} />
      </div>
      {delta && (
        <div className={cn('text-sm mt-2 font-semibold tnum', deltaGood ? 'text-mint' : 'text-rose')}>
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
  color?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'violet' | 'cyan';
}) {
  const colors = {
    default: 'bg-raised text-text-secondary',
    success: 'bg-mint/15 text-mint',
    warning: 'bg-amber/15 text-amber',
    danger: 'bg-rose/15 text-rose',
    accent: 'bg-accent/15 text-accent',
    violet: 'bg-violet/15 text-violet',
    cyan: 'bg-cyan/15 text-cyan',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
        colors[color],
      )}
    >
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
    <Card className="flex flex-col items-center text-center py-16 rise">
      <div className="w-[72px] h-[72px] rounded-lg bg-raised grid place-items-center text-4xl mb-4">
        {emoji}
      </div>
      <h3 className="text-[22px] font-bold tracking-[-0.01em] text-white">{title}</h3>
      <p className="text-[15px] text-text-secondary mt-2 max-w-md leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

export const inputClass =
  'bg-raised border border-transparent rounded-sm px-4 py-3 text-[15px] text-white placeholder:text-text-tertiary w-full transition focus:outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(10,132,255,0.18)]';

export const buttonPrimary =
  'press inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover transition rounded-full px-6 py-3 text-[15px] font-bold text-white disabled:opacity-45 disabled:pointer-events-none';

export const buttonSecondary =
  'press inline-flex items-center justify-center gap-2 bg-raised hover:bg-[#252E3E] transition rounded-full px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-45 disabled:pointer-events-none';

export const buttonGhost =
  'press inline-flex items-center justify-center gap-2 text-accent hover:text-accent-hover transition rounded-full px-4 py-2.5 text-[15px] font-semibold';

export const buttonDanger =
  'press inline-flex items-center justify-center gap-2 bg-rose hover:brightness-110 transition rounded-full px-5 py-3 text-[15px] font-bold text-white disabled:opacity-45';
