import React from "react";
import { ChevronDown } from "lucide-react";

import type { LocationOption } from "./header.types";

interface HeaderLocationProps {
  locations: LocationOption[];
  selectedLocation: string;
  onLocationChange?: (locationId: string) => void;
}

export const HeaderLocation: React.FC<HeaderLocationProps> = ({
  locations,
  selectedLocation,
  onLocationChange,
}) => {
  const selected =
    locations.find(
      (location) => location.id === selectedLocation
    ) ?? locations[0];

  return (
    <div className="relative hidden md:block">

      <button
        type="button"
        onClick={() =>
          onLocationChange?.(selected?.id ?? "all")
        }
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200/60 transition-colors"
      >

        <span className="w-2 h-2 rounded-full bg-blue-600" />

        <span>
          {selected?.name ?? "Todos os Locais"}
        </span>

        <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />

      </button>

    </div>
  );
};

export default HeaderLocation;