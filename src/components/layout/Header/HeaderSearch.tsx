import React, { useState } from "react";
import { Search } from "lucide-react";

interface HeaderSearchProps {
  onSearch?: (query: string) => void;
}

export const HeaderSearch: React.FC<HeaderSearchProps> = ({
  onSearch,
}) => {
  const [searchValue, setSearchValue] = useState("");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;

    setSearchValue(value);

    onSearch?.(value);
  };

  return (
    <div className="relative w-full max-w-md">

      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={searchValue}
        onChange={handleChange}
        placeholder="Buscar produto, código ou movimentação..."
        className="w-full pl-10 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
      />

      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
        <kbd className="inline-flex items-center px-1.5 py-0.5 border border-slate-200 rounded text-[11px] font-medium text-slate-400 bg-white shadow-xs">
          Ctrl + K
        </kbd>
      </div>

    </div>
  );
};

export default HeaderSearch;