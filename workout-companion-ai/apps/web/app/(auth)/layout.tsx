import Link from 'next/link';
import { ArrowLeft, Check, Dumbbell } from 'lucide-react';
import { Badge, Card } from '@/components/ui';

/**
 * Prima impressione del portale — sistema "Glass Over Iron" (DESIGN.md).
 * Sopra 1024px: due colonne. A sinistra il form su FERRO (il faro della pagina),
 * a destra il marchio e una dimostrazione sobria del prodotto, costruita solo
 * con i token — nessuna immagine esterna. Sotto 1024px resta il solo form.
 * Nessun vetro: qui non scorre nulla sotto, e il vetro appoggiato su fondo
 * fisso non è vetro ma una tinta (La Regola del Vetro Sospeso).
 */

/** Tonnellaggio delle ultime otto settimane, in percentuale sul picco. */
const WEEKS = [66, 72, 78, 74, 83, 89, 85, 100];

const POINTS = [
  'Il feedback per esercizio arriva mentre l’atleta è ancora in palestra.',
  'Volume, aderenza, peso e recupero già incrociati per te.',
  'Il coach AI legge i numeri di quel cliente e propone. Tu firmi la scheda.',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* ------------------------------------------------ COLONNA DEL FORM */}
      <div className="flex flex-col justify-center px-5 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Sotto 1024px il marchio vive qui: a destra non c'è nulla da vedere */}
          <Link
            href="/"
            className="press mb-8 inline-flex min-h-[44px] items-center gap-3 rounded-full lg:hidden"
            aria-label="Workout Companion AI — vai alla home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-sm bg-accent text-white">
              <Dumbbell size={20} aria-hidden="true" />
            </span>
            <span className="text-[17px] font-extrabold tracking-[-0.01em] text-white">
              Workout Companion AI
            </span>
          </Link>

          {/* Il FARO della pagina: l'unica cosa da fare qui è entrare */}
          <Card beacon className="rise p-6 sm:p-8">
            {children}
          </Card>

          <Link
            href="/"
            className="press mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-text-secondary transition hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Torna al sito
          </Link>
        </div>
      </div>

      {/* --------------------------------------------- PANNELLO DEL MARCHIO */}
      <aside className="relative hidden overflow-hidden border-l border-line bg-void/50 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(680px 420px at 72% 4%, rgba(10,132,255,0.10), transparent 62%)',
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-[520px] px-10 py-16 xl:px-14">
          <div className="rise flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-sm bg-accent text-white">
              <Dumbbell size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[17px] font-extrabold tracking-[-0.01em] text-white">
                Workout Companion AI
              </span>
              <span className="block text-[13px] text-text-tertiary">
                Portale coach · app atleta
              </span>
            </span>
          </div>

          <h2 className="rise rise-1 mt-10 text-[34px] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            Ogni serie torna indietro come dato.
          </h2>
          <p className="rise rise-2 mt-4 max-w-[46ch] text-[17px] leading-[1.45] text-text-secondary">
            Tu prescrivi la scheda, l’atleta la esegue e chiude ogni esercizio con sforzo, energia e
            dolore. Il quadro del cliente lo trovi già montato.
          </p>

          {/* FERRO: la dimostrazione porta numeri, quindi è opaca e senza alone */}
          <Card className="rise rise-3 mt-10 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Cliente seguito
                </p>
                <p className="mt-1 text-[17px] font-bold tracking-[-0.01em] text-white">
                  Marco B. · Upper Strength
                </p>
              </div>
              <Badge>Dati d’esempio</Badge>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Aderenza · 4 settimane
                </p>
                <p className="font-metric tnum mt-2 text-[48px] font-extrabold leading-none text-mint">
                  94%
                </p>
              </div>
              <p className="tnum pb-2 text-[13px] font-bold text-mint">+6%</p>
            </div>

            <div
              className="mt-6 flex h-[76px] items-end gap-1.5"
              role="img"
              aria-label="Tonnellaggio settimanale in crescita nelle ultime otto settimane, da 28.400 a 35.400 kg"
            >
              {WEEKS.map((h, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-t-xs ${
                    i === WEEKS.length - 1 ? 'bg-accent' : 'bg-raised'
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  RPE medio
                </p>
                <p className="font-metric tnum mt-1.5 text-[22px] font-extrabold leading-none text-amber">
                  8,2
                </p>
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Recupero
                </p>
                <p className="font-metric tnum mt-1.5 text-[22px] font-extrabold leading-none text-cyan">
                  86%
                </p>
              </div>
            </div>
          </Card>

          <ul className="rise rise-4 mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-[1.45] text-text-secondary">
                <Check size={18} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
