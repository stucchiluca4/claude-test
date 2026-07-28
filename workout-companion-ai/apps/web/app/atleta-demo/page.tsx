import Link from 'next/link';
import {
  Activity,
  Apple,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Home,
  MessageCircle,
  Moon,
  Scale,
  Target,
  Timer,
  TrendingUp,
  Utensils,
} from 'lucide-react';

const workouts = [
  { day: 'LUN', name: 'Upper Strength', detail: 'Panca, row, military press', done: true },
  { day: 'MAR', name: 'Lower Hypertrophy', detail: 'Squat, RDL, leg press', done: true },
  { day: 'GIO', name: 'Pull Volume', detail: 'Dorso, posterior chain, bicipiti', done: false },
  { day: 'SAB', name: 'Full Body Pump', detail: 'Richiamo metabolico 55 min', done: false },
];

const meals = [
  { name: 'Colazione', time: '08:00', kcal: 520, foods: 'Yogurt greco, avena, frutti rossi' },
  { name: 'Pranzo', time: '13:00', kcal: 760, foods: 'Riso basmati, pollo, verdure, olio EVO' },
  { name: 'Pre workout', time: '17:00', kcal: 310, foods: 'Banana, whey, gallette' },
  { name: 'Cena', time: '20:30', kcal: 850, foods: 'Salmone, patate, insalata' },
];

const messages = [
  { from: 'Coach Luca', text: 'Oggi tieni RPE 8 sulla panca. Se senti spalle stanche, scala 2,5 kg.' },
  { from: 'Tu', text: 'Ok coach, carico anche il video del top set.' },
];

export default function AthleteDemoPage() {
  return (
    <main className="min-h-screen bg-[#0b0e14] text-[#dfe2ec]">
      <header className="border-b border-white/10 bg-[#151920]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-deep text-white">
              <Dumbbell size={20} />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.16em] text-celeste">
                Workout Companion
              </span>
              <span className="block text-xs uppercase tracking-[0.2em] text-text-secondary">
                Demo atleta web
              </span>
            </span>
          </Link>
          <div className="flex gap-2">
            <Link
              href="/demo"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-text-secondary transition hover:bg-white/5 hover:text-white"
            >
              Demo coach
            </Link>
            <Link
              href="/registrati"
              className="rounded-lg bg-accent-deep px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
            >
              Attiva prova
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1180px] gap-5 px-5 py-6 lg:grid-cols-[390px_1fr]">
        <aside className="rounded-[28px] border border-white/10 bg-[#10151d] p-3 shadow-2xl shadow-black/40">
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#070d1a]">
            <div className="border-b border-white/10 bg-[#151920] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Oggi</p>
              <h1 className="mt-1 text-2xl font-black text-white">Ciao, Marco</h1>
              <p className="mt-1 text-sm text-text-secondary">Giovedi 28 luglio</p>
            </div>

            <div className="space-y-3 p-4">
              <PhoneCard title="Prontezza di oggi" icon={Activity}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-black text-white">86%</p>
                    <p className="text-sm text-text-secondary">Buona: puoi spingere, resta tecnico.</p>
                  </div>
                  <div className="h-20 w-20 rounded-full border-[10px] border-celeste/80 border-r-white/10" />
                </div>
              </PhoneCard>

              <PhoneCard title="Allenamento" icon={Dumbbell}>
                <p className="text-xl font-black text-white">Pull Volume</p>
                <p className="mt-1 text-sm text-text-secondary">Dorso + posterior chain, 65 min</p>
                <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-deep py-3 text-sm font-black text-white">
                  <Timer size={16} /> Inizia allenamento
                </button>
              </PhoneCard>

              <PhoneCard title="Nutrizione di oggi" icon={Utensils}>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black text-white">2440</p>
                  <p className="pb-1 text-sm text-text-secondary">kcal</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <Macro label="Proteine" value="180g" />
                  <Macro label="Carbo" value="250g" />
                  <Macro label="Grassi" value="70g" />
                </div>
              </PhoneCard>

              <PhoneCard title="Check-in" icon={CheckCircle2}>
                <p className="text-sm text-success">Completato oggi</p>
                <p className="mt-1 text-sm text-text-secondary">Peso, sonno, stress e note inviati al coach.</p>
              </PhoneCard>
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-[#151920] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
              Esperienza cliente
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">La stessa app atleta, mostrata su web per la demo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Questa pagina non sostituisce l'app mobile reale: serve solo per far vedere subito al cliente
              finale cosa riceve quando lavora con il coach.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Kpi icon={Scale} label="Peso" value="76,1 kg" detail="-0,4 kg settimana" />
            <Kpi icon={Moon} label="Sonno" value="7h 30m" detail="Qualita 8/10" />
            <Kpi icon={Target} label="Aderenza" value="94%" detail="Workout + food" />
            <Kpi icon={TrendingUp} label="Progressi" value="+12%" detail="Volume 4 sett." />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Programma settimanale" icon={Dumbbell}>
              <div className="space-y-3">
                {workouts.map((workout) => (
                  <div key={workout.day} className="flex items-center gap-3 rounded-lg border border-white/10 bg-background/60 p-3">
                    <span className="rounded-md border border-white/10 px-2 py-1 text-xs font-black text-celeste">
                      {workout.day}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-white">{workout.name}</p>
                      <p className="text-xs text-text-secondary">{workout.detail}</p>
                    </div>
                    {workout.done ? <CheckCircle2 className="text-success" size={18} /> : <ChevronRight className="text-text-secondary" size={18} />}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Piano alimentare" icon={Apple}>
              <div className="space-y-3">
                {meals.map((meal) => (
                  <div key={meal.name} className="rounded-lg border border-white/10 bg-background/60 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white">{meal.name} · {meal.time}</p>
                      <p className="text-sm font-black text-celeste">{meal.kcal} kcal</p>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">{meal.foods}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <Panel title="Chat coach" icon={MessageCircle}>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.text}
                    className={message.from === 'Tu' ? 'ml-auto max-w-md rounded-xl bg-accent-deep p-3 text-sm text-white' : 'max-w-md rounded-xl bg-background p-3 text-sm text-text-primary'}
                  >
                    <p className="text-xs font-bold text-celeste">{message.from}</p>
                    <p className="mt-1">{message.text}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Navigazione atleta" icon={Home}>
              <div className="grid grid-cols-2 gap-2">
                {['Home', 'Allenamento', 'Nutrizione', 'Progressi', 'Chat', 'Profilo'].map((item) => (
                  <div key={item} className="rounded-lg border border-white/10 bg-background/60 p-3 text-sm font-bold text-white">
                    {item}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      </section>
    </main>
  );
}

function PhoneCard({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151920] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
        <Icon className="text-celeste" size={17} />
        {title}
      </div>
      {children}
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background p-2">
      <p className="font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] text-text-secondary">{label}</p>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#151920] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">{label}</p>
        <Icon className="text-celeste" size={18} />
      </div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{detail}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#151920] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="text-celeste" size={20} />
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}
