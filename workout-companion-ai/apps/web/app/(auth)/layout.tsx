import { Dumbbell } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 font-bold text-xl mb-8">
          <Dumbbell className="text-accent" size={24} />
          Workout Companion AI
        </div>
        <div className="glass rounded-xl p-8">{children}</div>
      </div>
    </main>
  );
}
