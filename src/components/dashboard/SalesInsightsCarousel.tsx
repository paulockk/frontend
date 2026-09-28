import { useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import type { DashboardResponse } from "../../types/dashboard";

type Insight = NonNullable<DashboardResponse["salesInsights"]>;
type Slide = { title: string; description: string; unit: "units" | "money"; rows: { label: string; value: number }[] };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function SalesInsightsCarousel({ insights }: { insights?: Insight }) {
  const [active, setActive] = useState(0);
  const slides: Slide[] = [
    { title: "Produtos mais vendidos", description: "Unidades vendidas nesta semana", unit: "units", rows: insights?.bestSellers.map((item) => ({ label: item.productName, value: item.quantity })) ?? [] },
    { title: "Produtos com pouca saída", description: "Itens para rever preço, exposição ou reposição", unit: "units", rows: insights?.slowMovers.map((item) => ({ label: item.productName, value: item.quantity })) ?? [] },
    { title: "Vendas por ponto", description: "Faturamento nesta semana", unit: "money", rows: insights?.locationSales.map((item) => ({ label: item.locationName, value: item.amount })) ?? [] },
    { title: "Ritmo de vendas", description: "Unidades vendidas por dia", unit: "units", rows: insights?.weeklyTrend.map((item) => ({ label: item.label, value: item.quantity })) ?? [] },
  ];
  const slide = slides[active];
  const maxValue = Math.max(...slide.rows.map((row) => row.value), 1);
  const best = slide.rows.reduce<{label:string;value:number}|null>((winner, row) => !winner || row.value > winner.value ? row : winner, null);
  const move = (step: number) => setActive((current) => (current + step + slides.length) % slides.length);
  const format = (value: number) => slide.unit === "money" ? currency.format(value) : `${value} un`;

  return <section aria-label="Gráficos de vendas e desempenho" className="flex min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-700"><BarChart3 className="h-5 w-5"/></span><div className="min-w-0"><h2 className="font-bold text-slate-800">{slide.title}</h2><p className="mt-1 text-xs text-slate-500">{slide.description}</p></div></div>
      <div className="flex shrink-0 gap-1"><button type="button" aria-label="Gráfico anterior" onClick={()=>move(-1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4"/></button><button type="button" aria-label="Próximo gráfico" onClick={()=>move(1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><ArrowRight className="h-4 w-4"/></button></div>
    </header>
    {best && <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className={`rounded-full p-1 ${active===1?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>{active===1?<TrendingDown className="h-3.5 w-3.5"/>:<TrendingUp className="h-3.5 w-3.5"/>}</span><span className="min-w-0 truncate text-slate-500">{active===1?"Menor saída":"Destaque"}: <strong className="text-slate-800">{best.label}</strong></span><strong className="ml-auto shrink-0 text-slate-700">{format(best.value)}</strong></div>}
    <div className="mt-5 flex-1 space-y-4" aria-live="polite">{slide.rows.length ? slide.rows.map((row,index)=><div key={`${row.label}-${index}`}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium text-slate-700">{row.label}</span><span className="shrink-0 font-semibold tabular-nums text-slate-600">{format(row.value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-300 ${active===1?"bg-amber-500":"bg-blue-600"}`} style={{width:`${Math.max(row.value===0?0:5,(row.value/maxValue)*100)}%`}}/></div></div>) : <div className="flex h-40 items-center justify-center rounded-lg bg-slate-50 px-5 text-center text-sm text-slate-500">Os dados deste gráfico ainda não estão disponíveis.</div>}</div>
    <footer className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3"><div className="flex gap-1.5">{slides.map((item,index)=><button key={item.title} type="button" aria-label={`Mostrar gráfico: ${item.title}`} aria-current={index===active} onClick={()=>setActive(index)} className={`h-1.5 rounded-full transition-all ${index===active?"w-5 bg-blue-600":"w-1.5 bg-slate-300 hover:bg-slate-400"}`}/>)}</div><span className="text-[11px] font-medium text-slate-400">{active+1} / {slides.length}</span></footer>
  </section>;
}
