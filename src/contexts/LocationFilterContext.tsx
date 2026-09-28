import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { operationsService } from "../services/operations.service";
import type { StoreLocation } from "../types/operations";

interface LocationFilterValue {
  locations: StoreLocation[];
  selectedLocationId: string;
  selectedLocation: StoreLocation | null;
  setSelectedLocationId: (id: string) => void;
  refreshLocations: () => Promise<void>;
  matchesLocation: (name: string | null | undefined) => boolean;
}

const LocationFilterContext = createContext<LocationFilterValue | null>(null);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const aliases: Record<string, string[]> = {
  "mercadinho 1": ["mercadinho 1", "mercado principal", "unidade central"],
  "mercadinho 2": ["mercadinho 2", "mercadinho norte", "unidade norte"],
  "vending machine 01": ["vending machine 01", "maquina 01", "vending machine 1"],
  cd: ["cd", "estoque", "centro de distribuicao"],
};

export function LocationFilterProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [selectedLocationId, setSelectedLocationIdState] = useState(() => window.localStorage.getItem("selectedLocationId") ?? "all");
  const refreshLocations = useCallback(async () => {
    try { setLocations([...(await operationsService.listLocations())]); }
    catch { setLocations([]); }
  }, []);
  useEffect(() => { void refreshLocations(); }, [refreshLocations]);
  const setSelectedLocationId = useCallback((id: string) => {
    setSelectedLocationIdState(id);
    window.localStorage.setItem("selectedLocationId", id);
  }, []);
  useEffect(() => {
    if (locations.length && selectedLocationId !== "all" && !locations.some((location) => location.id === selectedLocationId)) {
      setSelectedLocationId("all");
    }
  }, [locations, selectedLocationId, setSelectedLocationId]);
  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? null;
  const matchesLocation = useCallback((candidate: string | null | undefined) => {
    if (selectedLocationId === "all") return true;
    if (!candidate || !selectedLocation) return false;
    const selected = normalize(selectedLocation.name);
    const value = normalize(candidate);
    if (selected === value) return true;
    const group = Object.entries(aliases).find(([key, names]) => selected === key || names.includes(selected));
    return group?.[1].includes(value) ?? false;
  }, [selectedLocation, selectedLocationId]);
  const value = useMemo(() => ({ locations, selectedLocationId, selectedLocation, setSelectedLocationId, refreshLocations, matchesLocation }), [locations, selectedLocationId, selectedLocation, setSelectedLocationId, refreshLocations, matchesLocation]);
  return <LocationFilterContext.Provider value={value}>{children}</LocationFilterContext.Provider>;
}

export function useLocationFilter() {
  const context = useContext(LocationFilterContext);
  if (!context) throw new Error("useLocationFilter deve ser usado dentro de LocationFilterProvider.");
  return context;
}
