import { Logo } from 'src/shared/components/Logo';

/**
 * Loading de pantalla completa (boot de auth / guards de ruta) — reemplaza el
 * Spinner genérico por el isotipo de marca con anillos concéntricos en
 * animate-ping (patrón estándar: https://tailwindflex.com/@freja-jensen/loading-animation)
 * más un pulso suave sobre el propio ícono. Los anillos usan bg-primary, así
 * siguen el colorPreset configurado en ui.store (indigo/cyan/teal/...) y el
 * theme claro/oscuro, no un color de marca fijo. Sin blur ni gradiente radial
 * — mismo disco nítido de siempre, solo con opacidad más baja (color más
 * tenue/suave).
 * Usa el isotipo dinámico (branding remoto con fallback bundleado, ver
 * Logo.tsx) — sin texto, como un favicon.
 */
export function BrandLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        <span className="absolute size-24 rounded-full bg-primary/15 animate-ping [animation-duration:1.8s]" />
        <span className="absolute size-16 rounded-full bg-primary/25 animate-ping [animation-duration:1.8s] [animation-delay:.3s]" />
        <div className="relative animate-pulse [animation-duration:1.8s]">
          <Logo variant="logo" height={40} />
        </div>
      </div>
    </div>
  );
}
