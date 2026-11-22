import { MapPin } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-symbol">
        <MapPin size={23} strokeWidth={2.5} />
      </span>
      <span>
        Ayos<span className="brand-accent">Dito</span>
        <span className="brand-dot">.</span>
      </span>
    </span>
  );
}
