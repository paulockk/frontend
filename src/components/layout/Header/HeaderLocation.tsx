import React, { useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import type { LocationOption } from "./header.types";

interface HeaderLocationProps {
  locations: LocationOption[];
  selectedLocation: string;
  onLocationChange?: (locationId: string) => void;
}

export const HeaderLocation: React.FC<HeaderLocationProps> = ({ locations, selectedLocation, onLocationChange }) => {
  const [open, setOpen] = useState(false);
  const selected = locations.find((location) => location.id === selectedLocation) ?? locations[0];
  return <div className="relative hidden md:block">
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200/80">
      <MapPin className="h-3.5 w-3.5 text-blue-600"/><span>{selected?.name ?? "Todos os locais"}</span><ChevronDown className={`ml-0.5 h-3.5 w-3.5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}/>
    </button>
    {open && <div role="listbox" aria-label="Filtrar por local" className="absolute right-0 top-full z-50 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">{locations.map((location) => <button key={location.id} type="button" role="option" aria-selected={location.id === selectedLocation} onClick={() => { onLocationChange?.(location.id); setOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${location.id === selectedLocation ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}><span>{location.name}</span>{location.id === selectedLocation && <Check className="h-4 w-4"/>}</button>)}</div>}
  </div>;
};

export default HeaderLocation;
