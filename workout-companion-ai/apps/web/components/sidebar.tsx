'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Utensils,
  ClipboardCheck,
  MessageSquare,
  CreditCard,
  Tag,
  Sparkles,
  Settings,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clienti', label: 'Clienti', icon: Users },
  { href: '/allenamenti', label: 'Allenamenti & Programmi', icon: Dumbbell },
  { href: '/nutrizione', label: 'Piani Alimentari', icon: Utensils },
  { href: '/checkin', label: 'Check & Progressi', icon: ClipboardCheck },
  { href: '/messaggi', label: 'Messaggi', icon: MessageSquare },
  { href: '/demo', label: 'Demo Pro', icon: Sparkles },
  { href: '/listino', label: 'Listino', icon: Tag },
  { href: '/abbonamento', label: 'Pagamenti', icon: CreditCard },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-[#151920] flex flex-col h-screen sticky top-0">
      <div className="px-6 h-20 font-bold flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-deep text-white">
          <Dumbbell size={20} />
        </div>
        <div>
          <span className="block text-sm font-black uppercase tracking-[0.12em] text-celeste">
            PT Coach Pro
          </span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-text-secondary">
            Elite Coaching
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition',
                active
                  ? 'bg-accent-deep text-white font-bold shadow-[0_0_18px_-8px_rgba(30,90,240,.8)]'
                  : 'text-text-secondary hover:bg-white/[.04] hover:text-text-primary'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 space-y-1">
        <Link
          href="/impostazioni"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-white/[.04] hover:text-text-primary transition"
        >
          <Settings size={18} />
          Impostazioni
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-white/[.04] hover:text-danger transition"
        >
          <LogOut size={18} />
          Esci
        </button>
        <div className="px-4 pt-3 text-xs text-text-secondary truncate">{userName}</div>
      </div>
    </aside>
  );
}
