import React, { useState } from "react";
import { ChevronDown, LogOut, UserRound, Users } from "lucide-react";
import { apiFetch } from "../../../services/api";
import type { HeaderUser as HeaderUserType } from "./header.types";

type AccountOption = { id: string; name: string; email: string; role: "ADMIN" | "USER"; isActive: boolean };

interface HeaderUserProps {
  user: HeaderUserType;
  isAdmin?: boolean;
  onSwitchAccount?: (email: string) => void;
  onLogout?: () => void;
}

export const HeaderUser: React.FC<HeaderUserProps> = ({ user, isAdmin = false, onSwitchAccount, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountsError, setAccountsError] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const toggleMenu = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || !isAdmin || accountsLoaded || loadingAccounts) return;

    setLoadingAccounts(true);
    setAccountsError(false);
    try {
      const result = await apiFetch<{ items: AccountOption[] }>("/users?page=1&pageSize=100&isActive=true");
      setAccounts(result.items.filter((account) => account.isActive && account.id !== user.id));
      setAccountsLoaded(true);
    } catch {
      setAccountsError(true);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const chooseAccount = (email: string) => {
    setOpen(false);
    onSwitchAccount?.(email);
  };

  return (
    <div className="relative flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
      <button
        type="button"
        onClick={() => void toggleMenu()}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <div className="relative">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          {user.isOnline && <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white rounded-full" />}
        </div>
        <div className="hidden xl:flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{user.role}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            {user.email && <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>}
          </div>
          {isAdmin && (
            <div className="py-1">
              <p className="flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <Users className="h-3.5 w-3.5" /> Trocar de conta
              </p>
              {loadingAccounts && <p className="px-4 py-2 text-xs text-slate-500">Carregando contas...</p>}
              {accountsError && <p role="alert" className="px-4 py-2 text-xs text-red-600">Não foi possível carregar as contas.</p>}
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  role="menuitem"
                  onClick={() => chooseAccount(account.email)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-700">{account.name}{account.email === user.email ? " (atual)" : ""}</span>
                    <span className="block truncate text-xs text-slate-400">{account.email}</span>
                  </span>
                </button>
              ))}
              {accountsLoaded && accounts.length === 0 && <p className="px-4 py-2 text-xs text-slate-500">Nenhum outro perfil ativo.</p>}
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout?.(); }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4 text-slate-400" /> Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default HeaderUser;
