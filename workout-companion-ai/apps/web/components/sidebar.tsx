'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Utensils,
  ClipboardCheck,
  MessageSquare,
  CreditCard,
  Tag,
  Settings,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { href: '/clienti', label: 'Clienti', short: 'Clienti', icon: Users },
  { href: '/allenamenti', label: 'Allenamenti & Programmi', short: 'Schede', icon: Dumbbell },
  { href: '/nutrizione', label: 'Piani Alimentari', short: 'Piani', icon: Utensils },
  { href: '/checkin', label: 'Check & Progressi', short: 'Check', icon: ClipboardCheck },
  { href: '/messaggi', label: 'Messaggi', short: 'Chat', icon: MessageSquare },
  { href: '/listino', label: 'Listino', short: 'Listino', icon: Tag },
  { href: '/abbonamento', label: 'Pagamenti', short: 'Piani', icon: CreditCard },
];

/**
 * Navigazione sul livello VETRO (DESIGN.md): una rail che galleggia sul
 * contenuto che scorre. Sotto i 1024px si ritira in una barra ancorata in basso.
 */
export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [demoNavMode, setDemoNavMode] = useState(false);

  useEffect(() => {
    setDemoNavMode(window.location.search.includes('demo=1'));
  }, [pathname]);

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const withDemo = (href: string) => (demoNavMode ? `${href}?demo=1` : href);

  const initials =
    userName
      .split(' ')
      .map((p) => p.charAt(0).toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join('') || 'PT';

  const itemClass = (active: boolean) =>
    cn(
      'press flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[15px] transition',
      active
        ? 'bg-accent/15 text-white font-bold'
        : 'text-text-secondary hover:bg-white/[0.06] hover:text-white font-medium',
    );

  return (
    <>
      {/* Desktop — rail verticale in vetro */}
      <aside className="hidden lg:flex sticky top-4 ml-4 h-[calc(100vh-2rem)] w-[248px] shrink-0 flex-col glass-chrome rounded-2xl">
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xs bg-accent text-white">
            <Dumbbell size={19} />
          </div>
          <div className="min-w-0">
            <span className="block text-[13px] font-extrabold tracking-tight text-white">
              PT Coach Pro
            </span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              Elite Coaching
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={withDemo(item.href)} className={itemClass(active)}>
                <item.icon size={19} className={active ? 'text-accent' : ''} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 space-y-1 border-t border-white/[0.06]">
          <Link
            href={withDemo('/impostazioni')}
            className={itemClass(pathname.startsWith('/impostazioni'))}
          >
            <Settings size={19} />
            Impostazioni
          </Link>
          <button
            onClick={handleLogout}
            className="press w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[15px] font-medium text-text-secondary hover:bg-rose/10 hover:text-rose transition"
          >
            <LogOut size={19} />
            Esci
          </button>
          <div className="flex items-center gap-2.5 px-2 pt-3">
            <div className="w-8 h-8 rounded-full bg-raised grid place-items-center text-[11px] font-extrabold text-white shrink-0">
              {initials}
            </div>
            <span className="text-xs text-text-secondary truncate">{userName}</span>
          </div>
        </div>
      </aside>

      {/* Mobile — barra in vetro ancorata in basso */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 glass-chrome rounded-2xl px-1 py-1.5">
        <div className="flex items-center justify-around">
          {NAV.slice(0, 5).map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={withDemo(item.href)}
                aria-label={item.label}
                className={cn(
                  'press flex flex-col items-center gap-1 rounded-xs px-2 py-2 min-w-[56px] transition',
                  active ? 'text-accent' : 'text-text-secondary',
                )}
              >
                <item.icon size={21} />
                <span className="text-[10px] font-bold tracking-tight">{item.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
