import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from || "/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Entrar no Stockflow</h1>
        <label className="block text-sm text-slate-600">E-mail
          <input name="email" type="email" autoComplete="username" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800" />
        </label>
        <label className="block text-sm text-slate-600">Senha
          <input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={submitting || loading} className="w-full rounded-md bg-blue-600 px-3 py-2 text-white disabled:opacity-60">
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
