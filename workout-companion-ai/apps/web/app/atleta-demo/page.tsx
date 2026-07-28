import Link from 'next/link';
import {
  Bell,
  ChevronRight,
  Dumbbell,
  MessageCircle,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react';

const workoutExercises = [
  ['Barbell Squat', '4x8'],
  ['Romanian Deadlift', '3x10'],
  ['Squat Lunges', '3x10'],
  ['Barbell Squat', '4x8'],
  ['Romanian Deadlift', '3x10'],
];

const messages = [
  ['Trainer Alex', "Great job on yesterday's session!"],
  ['Nutritionist Mia', 'Updated meal plan is ready.'],
];

const resources = ['Recovery Techniques for Legs', 'Hydration Strategy', 'Protein timing guide'];

export default function AthleteDemoPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0f172a]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5">
          <Link href="/" className="text-xl font-black">APEX Performance</Link>
          <nav className="hidden h-full items-center gap-8 md:flex">
            {['Dashboard', 'Training Plans', 'Progress', 'Messages'].map((item, index) => (
              <a
                key={item}
                className={index === 0 ? 'flex h-full items-center border-b-4 border-blue-600 px-1 font-semibold text-blue-700' : 'flex h-full items-center px-1 font-semibold text-slate-900'}
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <span className="relative">
              <Bell size={21} />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <div className="h-9 w-9 rounded-full bg-[url('https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=120&q=80')] bg-cover bg-center" />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/75 to-transparent" />
        <div className="relative mx-auto max-w-[1120px] px-5 py-10 text-white md:py-12">
          <h1 className="max-w-xl text-4xl font-black leading-tight">
            Welcome back, Sarah!<br />
            Let&apos;s crush today&apos;s session.
          </h1>
          <p className="mt-4 text-lg text-white/90">Current Plan: Phase 2 - Strength & Power | Week 4 of 8</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-6 px-5 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-7">
          <section>
            <h2 className="mb-3 text-2xl font-black">Today&apos;s Workout</h2>
            <div className="rounded-lg bg-[#10213d] p-7 text-white shadow-lg">
              <div className="grid gap-6 md:grid-cols-[1fr_0.9fr]">
                <div>
                  <h3 className="text-4xl font-black">Lower Body Blast</h3>
                  <p className="mt-4 text-base"><b>Duration:</b> 60 mins</p>
                  <p className="text-base"><b>Focus:</b> Squats, Deadlifts, Lunges</p>
                </div>
                <ul className="space-y-1 text-base">
                  {workoutExercises.map(([name, reps], index) => (
                    <li key={index} className="flex justify-between gap-6">
                      <span>• {name}</span>
                      <span>{reps}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="mt-7 w-full rounded-full bg-[#18d77b] py-3 text-lg font-black text-slate-950">
                Start Workout
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-black">Progress Tracker</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <ProgressCard title="Weight Goal" tag="Goal: 185 lbs" value="186 lbs" kind="line" />
              <ProgressCard title="Bench Press Max" tag="Trends" value="250 lbs" kind="bars" />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Message Center</h2>
              <MoreHorizontal size={22} />
            </div>
            <p className="mt-2 text-slate-500">Recent messages</p>
            <div className="mt-4 divide-y divide-slate-200">
              {messages.map(([name, text]) => (
                <div key={name} className="flex gap-3 py-4">
                  <div className="relative h-11 w-11 rounded-full bg-slate-300">
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div>
                    <p className="font-black">{name}</p>
                    <p className="text-sm">{text}</p>
                  </div>
                  <span className="ml-auto text-xs text-slate-500">now</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-full bg-[#18d77b] py-3 text-lg font-black text-slate-950">
              Send Message
            </button>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Daily Tips & Resources</h2>
            <p className="mt-2 text-slate-500">Recommended by your coach</p>
            <div className="mt-4 divide-y divide-slate-200">
              {resources.map((resource) => (
                <div key={resource} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-black">{resource}</p>
                    <p className="text-sm text-slate-500">Open resource</p>
                  </div>
                  <ChevronRight />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function ProgressCard({ title, tag, value, kind }: { title: string; tag: string; value: string; kind: 'line' | 'bars' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black">{title}</h3>
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-sm text-slate-900">
          <TrendingUp size={15} className="text-emerald-600" />
          {tag}
        </span>
      </div>
      {kind === 'line' ? (
        <div className="mt-6 h-36 rounded bg-gradient-to-b from-emerald-100 to-white p-4">
          <svg viewBox="0 0 260 110" className="h-full w-full">
            <path d="M5 20 L65 48 L120 60 L175 86 L245 100" fill="none" stroke="#10213d" strokeWidth="4" />
            <path d="M5 88 H245" stroke="#20d686" strokeDasharray="8 8" />
            {[65, 120, 175, 245].map((x, i) => (
              <circle key={x} cx={x} cy={[48, 60, 86, 100][i]} r="5" fill="#bff7df" stroke="#10213d" strokeWidth="3" />
            ))}
          </svg>
        </div>
      ) : (
        <div className="mt-6 flex h-36 items-end gap-3 border-b border-slate-200 px-3">
          {[48, 56, 64, 80, 60, 74, 90].map((height, index) => (
            <div key={index} className={index === 3 || index === 6 ? 'flex-1 rounded-t bg-[#18d77b]' : 'flex-1 rounded-t bg-[#10213d]'} style={{ height: `${height}%` }} />
          ))}
        </div>
      )}
      <p className="mt-3 text-sm font-bold text-slate-600">Current: {value}</p>
    </div>
  );
}
