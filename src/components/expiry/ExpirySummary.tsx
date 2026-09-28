import { AlertTriangle, CalendarClock, CheckCircle2, ShieldAlert } from "lucide-react";
import type { ExpirySeverity, ExpirySummaryItem } from "../../types/expiry";

type SummaryCardConfig = {
  title: string;
  subtitle: string;
  badge: string;
  icon: typeof ShieldAlert;
  classes: string;
};

// Mantém título, cor, ícone e orientação juntos para cada nível de vencimento.
const summaryCardConfig: Record<ExpirySeverity, SummaryCardConfig> = {
  EXPIRED: {
    title: "Lotes vencidos",
    subtitle: "Descarte imediato",
    badge: "Ação imediata",
    icon: ShieldAlert,
    classes: "border-red-200 text-red-700 bg-red-50",
  },
  CRITICAL: {
    title: "Vencimento crítico",
    subtitle: "Até 7 dias",
    badge: "Ação imediata",
    icon: AlertTriangle,
    classes: "border-amber-200 text-amber-700 bg-amber-50",
  },
  WARNING: {
    title: "Atenção",
    subtitle: "De 8 a 15 dias",
    badge: "Priorizar PEPS",
    icon: CalendarClock,
    classes: "border-blue-200 text-blue-700 bg-blue-50",
  },
  REGULAR: {
    title: "Validade regular",
    subtitle: "Mais de 15 dias",
    badge: "Estável",
    icon: CheckCircle2,
    classes: "border-emerald-200 text-emerald-700 bg-emerald-50",
  },
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ExpirySummaryProps {
  summary: ExpirySummaryItem[];
}

export function ExpirySummary({ summary }: ExpirySummaryProps) {
  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Resumo de validades"
    >
      {summary.map((item) => {
        const card = summaryCardConfig[item.severity];
        const Icon = card.icon;
        const [borderClass, textClass] = card.classes.split(" ");

        return (
          <article
            key={item.severity}
            className={`rounded-xl border bg-white p-5 shadow-xs ${borderClass}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {card.title}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{card.subtitle}</p>
              </div>
              <span className={`rounded-lg p-2 ${card.classes}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>

            <p className={`mt-4 text-2xl font-extrabold tracking-tight ${textClass}`}>
              {item.lotCount} {item.lotCount === 1 ? "lote" : "lotes"}
            </p>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">{currency.format(item.totalCost)}</span>
              <span className={`rounded px-2 py-0.5 font-bold ${card.classes}`}>
                {card.badge}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
