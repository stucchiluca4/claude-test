/**
 * Next rimonta il template a ogni cambio di rotta: è il punto esatto in cui
 * far entrare la sezione. Cambiando voce di menu il contenuto sale, si mette
 * a fuoco e scatta in posizione, invece di comparire di colpo.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="section-enter">{children}</div>;
}
