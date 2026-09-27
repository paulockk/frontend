import React from "react";
import { HelpCircle } from "lucide-react";

interface HeaderHelpProps {
  onClick?: () => void;
}

export const HeaderHelp: React.FC<HeaderHelpProps> = ({
  onClick,
}) => {
  return (
    <button
      type="button"
      aria-label="Ajuda e Suporte"
      onClick={onClick}
      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
};

export default HeaderHelp;