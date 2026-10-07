import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";
import { accessService, type AccessPermission, type AccessProfile, type ManagedUser } from "../services/access.service";
import { useAuth } from "../contexts/AuthContext";

const permissionGroups: Array<{ title: string; items: Array<{ key: AccessPermission; label: string }> }> = [
  { title: "Dashboard", items: [{ key: "dashboard.view", label: "Visualizar indicadores" }] },
  { title: "Produtos", items: [{ key: "products.view", label: "Visualizar" }, { key: "products.manage", label: "Criar e editar" }, { key: "products.delete", label: "Desativar" }] },
  { title: "Estoque e validades", items: [{ key: "stock.view", label: "Visualizar estoque, movimentações e validades" }, { key: "stock.manage", label: "Registrar entradas, saídas e transferências" }] },
  { title: "Locais", items: [{ key: "locations.view", label: "Visualizar" }, { key: "locations.manage", label: "Criar e editar" }, { key: "locations.delete", label: "Excluir" }] },
  { title: "Categorias", items: [{ key: "categories.view", label: "Visualizar" }, { key: "categories.manage", label: "Criar e editar" }, { key: "categories.delete", label: "Arquivar" }] },
  { title: "Vendas", items: [{ key: "sales.view", label: "Visualizar vendas" }, { key: "sales.manage", label: "Registrar vendas" }, { key: "sales.reverse", label: "Estornar vendas" }] },
  { title: "Relatórios", items: [{ key: "reports.view", label: "Visualizar relatórios" }] },
];
const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";
const viewPermissionFor: Partial<Record<AccessPermission, AccessPermission>> = {
  "products.manage": "products.view", "products.delete": "products.view",
  "stock.manage": "stock.view", "locations.manage": "locations.view",
  "locations.delete": "locations.view", "categories.manage": "categories.view",
  "categories.delete": "categories.view", "sales.manage": "sales.view",
  "sales.reverse": "sales.view",
};
const writePermissionsForView: Partial<Record<AccessPermission, AccessPermission[]>> = {
  "products.view": ["products.manage", "products.delete"], "stock.view": ["stock.manage"],
  "locations.view": ["locations.manage", "locations.delete"], "categories.view": ["categories.manage", "categories.delete"],
  "sales.view": ["sales.manage", "sales.reverse"],
};

export default function Configuracoes() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<AccessProfile | null>(null);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<AccessPermission[]>([]);

  const refresh = useCallback(async () => {
    const [nextProfiles, nextUsers] = await Promise.all([accessService.listProfiles(), accessService.listUsers()]);
    setProfiles(nextProfiles); setUsers(nextUsers);
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as configurações."))
        .finally(() => setLoading(false));
    });
  }, [refresh]);
  const assignedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const account of users) if (account.accessProfileId) counts.set(account.accessProfileId, (counts.get(account.accessProfileId) ?? 0) + 1);
    return counts;
  }, [users]);

  const beginCreateProfile = () => { setEditing(null); setSelectedPermissions([]); setProfileFormOpen(true); setError(""); };
  const beginEditProfile = (profile: AccessProfile) => { setEditing(profile); setSelectedPermissions(profile.permissions); setProfileFormOpen(true); setError(""); };
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); setError(""); setNotice("");
    try {
      const input = { name: String(data.get("name")).trim(), description: String(data.get("description")).trim() || null, permissions: selectedPermissions };
      if (editing) await accessService.updateProfile(editing.id, input); else await accessService.createProfile(input);
      await refresh(); setProfileFormOpen(false); setNotice(editing ? "Perfil atualizado." : "Perfil criado.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar o perfil."); }
    finally { setSaving(false); }
  };
  const deleteProfile = async (profile: AccessProfile) => {
    if (!window.confirm("Excluir o perfil “" + profile.name + "”?")) return;
    setError(""); setNotice("");
    try { await accessService.deleteProfile(profile.id); await refresh(); setNotice("Perfil excluído."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir o perfil."); }
  };
  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setSaving(true); setError(""); setNotice("");
    try {
      await accessService.createUser({ name: String(data.get("name")).trim(), email: String(data.get("email")).trim(), password: String(data.get("password")), accessProfileId: String(data.get("accessProfileId")) });
      await refresh(); form.reset(); setUserFormOpen(false); setNotice("Conta criada e vinculada ao perfil selecionado.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar a conta."); }
    finally { setSaving(false); }
  };
  const updateAccount = async (account: ManagedUser, changes: { accessProfileId?: string; isActive?: boolean }) => {
    setError(""); setNotice("");
    try {
      const updated = await accessService.updateUser(account.id, changes);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice("Acesso atualizado. A conta precisa entrar novamente para receber as novas permissões.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a conta."); }
  };
  if (user?.role !== "ADMIN") return <div className="p-6 text-sm text-slate-600">Esta área é exclusiva do administrador.</div>;

  return <div className="min-w-0 space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Administração</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Configurações</h1><p className="mt-1 text-sm text-slate-500">Crie perfis de acesso e vincule as contas dos sócios.</p></div><div className="flex gap-2"><button type="button" onClick={() => setUserFormOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Users className="h-4 w-4"/>Nova conta</button><button type="button" onClick={beginCreateProfile} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Novo perfil</button></div></header>
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando perfis e contas...</p> : <>
      {userFormOpen && <form onSubmit={(event) => void createAccount(event)} className="grid gap-3 rounded-xl border border-blue-200 bg-white p-4 md:grid-cols-2"><h2 className="font-bold text-slate-900 md:col-span-2">Criar conta de sócio ou colaborador</h2>
        <label className="text-xs font-semibold text-slate-500">Nome<input name="name" required maxLength={120} className={inputClass}/></label>
        <label className="text-xs font-semibold text-slate-500">E-mail<input name="email" type="email" required maxLength={254} className={inputClass}/></label>
        <label className="text-xs font-semibold text-slate-500">Senha inicial (mínimo 12 caracteres)<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className={inputClass}/></label>
        <label className="text-xs font-semibold text-slate-500">Perfil de acesso<select name="accessProfileId" required className={inputClass}><option value="">Selecione</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setUserFormOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4"/>Criar conta</button></div>
      </form>}
      {profileFormOpen && <form onSubmit={(event) => void saveProfile(event)} className="space-y-4 rounded-xl border border-blue-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">{editing ? "Editar perfil: " + editing.name : "Novo perfil de acesso"}</h2><button type="button" onClick={() => setProfileFormOpen(false)} aria-label="Fechar" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-500">Nome do perfil<input name="name" defaultValue={editing?.name ?? ""} required minLength={2} maxLength={80} className={inputClass}/></label><label className="text-xs font-semibold text-slate-500">Descrição<input name="description" defaultValue={editing?.description ?? ""} maxLength={240} className={inputClass}/></label></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{permissionGroups.map((group) => <fieldset key={group.title} className="space-y-2 rounded-lg border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold text-slate-700">{group.title}</legend>{group.items.map((item) => <label key={item.key} className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={selectedPermissions.includes(item.key)} onChange={(event) => setSelectedPermissions((current) => { if (event.target.checked) return [...new Set([...current, item.key, ...(viewPermissionFor[item.key] ? [viewPermissionFor[item.key]!] : [])])]; return current.filter((permission) => permission !== item.key && !writePermissionsForView[item.key]?.includes(permission)); })}/>{item.label}</label>)}</fieldset>)}</div>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setProfileFormOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4"/>Salvar perfil</button></div>
      </form>}
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Perfis de acesso</h2><span className="text-xs text-slate-500">{profiles.length} perfis</span></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{profiles.map((profile) => <article key={profile.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-slate-800">{profile.name}{profile.isSystem && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">PADRÃO</span>}</h3><p className="mt-1 text-xs text-slate-500">{profile.description || "Sem descrição"}</p></div><span className="text-xs text-slate-400">{assignedCounts.get(profile.id) ?? 0} contas</span></div><p className="text-xs text-slate-500">{profile.permissions.length} permissões ativas</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => beginEditProfile(profile)} disabled={profile.isSystem} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"><Pencil className="h-3.5 w-3.5"/>Editar</button><button type="button" onClick={() => void deleteProfile(profile)} disabled={profile.isSystem || (assignedCounts.get(profile.id) ?? 0) > 0} title={(assignedCounts.get(profile.id) ?? 0) > 0 ? "Transfira as contas antes de excluir" : undefined} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5"/>Excluir</button></div></article>)}</div>
      </section>
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Contas e sócios</h2><span className="text-xs text-slate-500">{users.length} contas</span></div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Pessoa</th><th className="px-3 py-3">Perfil</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Acesso</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((account) => <tr key={account.id}><td className="px-4 py-3"><p className="font-semibold text-slate-800">{account.name}</p><p className="text-xs text-slate-400">{account.email}</p></td><td className="px-3 py-3">{account.role === "ADMIN" ? "Administrador" : <select aria-label={"Perfil de " + account.name} value={account.accessProfileId ?? ""} onChange={(event) => void updateAccount(account, { accessProfileId: event.target.value })} className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>}</td><td className="px-3 py-3"><span className={"rounded-full px-2 py-1 text-xs font-semibold " + (account.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{account.isActive ? "Ativa" : "Inativa"}</span></td><td className="px-4 py-3 text-right">{account.role !== "ADMIN" && <button type="button" onClick={() => void updateAccount(account, { isActive: !account.isActive })} className="text-xs font-semibold text-blue-700 hover:text-blue-900">{account.isActive ? "Desativar" : "Ativar"}</button>}</td></tr>)}</tbody></table></div>
      </section>
    </>}
  </div>;
}
