import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenCheck, HelpCircle, X } from "lucide-react";

const guides = [
  {
    title: "Cadastrar produto e distribuir estoque",
    path: "/produtos",
    action: "Ir para Produtos",
    steps: ["Abra Produtos e clique em Novo produto.", "Preencha os dados do produto e selecione a data de validade.", "Informe a quantidade inicial em cada local ativo; use zero onde não houver unidades.", "Clique em Salvar produto."],
  },
  {
    title: "Registrar uma movimentação",
    path: "/movimentacoes",
    action: "Ir para Movimentações",
    steps: ["Abra Movimentações e clique em Nova movimentação.", "Escolha o tipo de operação e informe o produto e a quantidade.", "Selecione a origem e o destino quando for uma transferência.", "Informe o lote e confirme o registro."],
  },
  {
    title: "Consultar validade dos lotes",
    path: "/validades",
    action: "Ir para Validades",
    steps: ["Abra Validades para ver os lotes e seus locais.", "Use os filtros de local, categoria e faixa de vencimento.", "Priorize os lotes vencidos ou próximos do vencimento.", "Use a ação da linha para registrar baixa ou transferência PEPS."],
  },
  {
    title: "Cadastrar uma loja ou máquina",
    path: "/locais",
    action: "Ir para Locais",
    steps: ["Abra Locais e clique em Cadastrar local.", "Informe o nome e o endereço ou descrição.", "Escolha entre mercadinho, centro de distribuição ou vending machine.", "Salve o local; locais ativos aparecem no cadastro de estoque inicial."],
  },
  {
    title: "Consultar o estoque",
    path: "/estoque",
    action: "Ir para Estoque",
    steps: ["Abra Estoque para consultar os produtos por local e lote.", "Filtre pelo local, categoria ou situação do estoque.", "Confira a quantidade e a próxima validade.", "Use a ação da linha para iniciar uma transferência ou reposição."],
  },
];

export const HeaderHelp = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const goTo = (path: string) => { setOpen(false); navigate(path); };

  return <>
    <button type="button" aria-label="Abrir guia de ajuda" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
      <HelpCircle className="h-5 w-5" />
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="help-title" className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><BookOpenCheck className="h-5 w-5"/></span><div><h2 id="help-title" className="text-lg font-bold text-slate-900">Guia rápido</h2><p className="mt-1 text-sm text-slate-500">Passo a passo das principais tarefas do sistema.</p></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar guia" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5"/></button></header>
        <div className="max-h-[calc(85vh-5rem)] space-y-3 overflow-y-auto p-4 sm:p-6">{guides.map((guide) => <details key={guide.path} className="group rounded-xl border border-slate-200 bg-white open:border-blue-200 open:bg-blue-50/30"><summary className="cursor-pointer list-none px-4 py-3 font-semibold text-slate-800 marker:hidden">{guide.title}<span className="float-right text-slate-400 transition-transform group-open:rotate-90">›</span></summary><div className="border-t border-slate-100 px-4 pb-4 pt-3"><ol className="space-y-2 text-sm text-slate-600">{guide.steps.map((step, index) => <li key={step} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">{index + 1}</span><span>{step}</span></li>)}</ol><button type="button" onClick={() => goTo(guide.path)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900">{guide.action}<ArrowRight className="h-3.5 w-3.5"/></button></div></details>)}</div>
      </section>
    </div>}
  </>;
};

export default HeaderHelp;
