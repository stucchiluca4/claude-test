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
    <aside className="w-60 shrink-0 border-r border-white/[.06] bg-card/40 backdrop-blur-xl flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 font-bold flex items-center gap-2">
        <Dumbbell className="text-accent" size={20} />
        <span className="text-sm">WORKOUT COMPANION</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
                active
                  ? 'grad-primary text-white font-bold shadow-[0_0_18px_-6px_rgba(56,189,248,.55)]'
                  : 'text-text-secondary hover:bg-card hover:text-text-primary'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border space-y-1">
        <Link
          href="/impostazioni"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-card hover:text-text-primary transition"
        >
          <Settings size={18} />
          Impostazioni
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-card hover:text-danger transition"
        >
          <LogOut size={18} />
          Esci
        </button>
        <div className="px-3 pt-3 text-xs text-text-secondary truncate">{userName}</div>
      </div>
    </aside>
  );
}
