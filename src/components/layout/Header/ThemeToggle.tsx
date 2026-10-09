import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const storageKey = "stockflow-theme";

function readDarkPreference() {
  return window.localStorage.getItem(storageKey) === "dark";
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(readDarkPreference);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    window.localStorage.setItem(storageKey, isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark((current) => !current)}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={isDark}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
