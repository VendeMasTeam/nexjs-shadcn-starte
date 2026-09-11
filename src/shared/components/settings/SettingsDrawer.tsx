'use client';

import { useTheme } from 'next-themes';
import { useState } from 'react';
import { cn } from 'src/lib/utils';
import {
  Button,
  Icon,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'src/shared/components/ui';
import {
  type BgVariant,
  type ColorPreset,
  type FontFamily,
  type NavColor,
  type NavLayout,
  type ThemeMode,
  useUiStore,
} from 'src/store/ui.store';

// ─────────────────────────────────────────────────────────────────────────────
// Maps de opciones
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS: { value: ColorPreset; hex: string }[] = [
  { value: 'indigo', hex: '#6366f1' },
  { value: 'cyan', hex: '#06b6d4' },
  { value: 'teal', hex: '#14b8a6' },
  { value: 'purple', hex: '#a855f7' },
  { value: 'rose', hex: '#f43f5e' },
  { value: 'orange', hex: '#f97316' },
];

const THEMES: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { value: 'light', icon: <Icon name="Sun" size={18} />, label: 'Light' },
  { value: 'system', icon: <Icon name="Monitor" size={18} />, label: 'System' },
  { value: 'dark', icon: <Icon name="Moon" size={18} />, label: 'Dark' },
];

const BG_VARIANTS: { value: BgVariant; label: string; icon: string }[] = [
  { value: 'default', label: 'Default', icon: 'Box' },
  { value: 'subtle', label: 'Subtle', icon: 'Layers' },
  { value: 'canvas', label: 'Canvas', icon: 'LayoutGrid' },
];

const NAV_COLORS: { value: NavColor; label: string; icon: string }[] = [
  { value: 'default', label: 'Integrado', icon: 'LayoutTemplate' },
  { value: 'dark', label: 'Oscuro', icon: 'Moon' },
];

const NAV_LAYOUTS: { value: NavLayout; label: string; icon: string }[] = [
  { value: 'vertical', label: 'Vertical', icon: 'PanelLeft' },
  // Horizontal: comentado porque todavía no está integrado en layout-section.tsx
  // (no hay rama que renderice un nav horizontal real, cae al vertical por defecto).
  // { value: 'horizontal', label: 'Horiz.', icon: 'PanelBottom' },
  { value: 'mini', label: 'Mini', icon: 'StretchHorizontal' },
];

const FONT_FAMILIES: { value: FontFamily; label: string; cssFamily: string }[] = [
  { value: 'public-sans', label: 'Public Sans', cssFamily: "'Public Sans Variable', sans-serif" },
  { value: 'inter', label: 'Inter', cssFamily: "'Inter Variable', sans-serif" },
  { value: 'dm-sans', label: 'DM Sans', cssFamily: "'DM Sans Variable', sans-serif" },
  { value: 'nunito-sans', label: 'Nunito Sans', cssFamily: "'Nunito Sans Variable', sans-serif" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Etiqueta de sección */
const OptionLabel = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
    {children}
  </h4>
);

/**
 * Botón de opción — estilo card.
 * Selected  → card blanca con shadow, texto foreground
 * Default   → sin borde, fondo transparente, texto muted
 */
function OptionCard({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-200 rounded-xl text-center',
        selected
          ? 'bg-card shadow-md text-foreground'
          : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/60',
        className
      )}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
export function SettingsDrawer() {
  const [open, setOpen] = useState(false);

  const {
    theme,
    navColor,
    colorPreset,
    bgVariant,
    fontSize,
    contrast,
    navLayout,
    fontFamily,
    setTheme,
    setNavColor,
    setColorPreset,
    setBgVariant,
    setFontSize,
    setContrast,
    setNavLayout,
    setFontFamily,
  } = useUiStore();

  const { setTheme: setNextTheme } = useTheme();

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setNextTheme(newTheme);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Botón flotante */}
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'h-9 w-9 rounded-full text-muted-foreground',
            'hover:bg-accent hover:text-foreground transition-all duration-300'
          )}
        >
          <Icon name="Settings" size={20} className="animate-[spin_4s_linear_infinite]" />
        </Button>
      </SheetTrigger>

      {/* Contenido del panel */}
      <SheetContent className="w-full p-0 border-l border-border/50 shadow-dialog sm:max-w-[400px]">
        <SheetHeader className="px-5 py-4 border-b border-border/40 text-left">
          <SheetTitle className="text-sm font-semibold flex items-center gap-2">
            <Icon name="Settings" size={16} className="text-primary" />
            Configuración visual
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-65px)] custom-scrollbar">
          <div className="flex flex-col divide-y divide-border/40">
            {/* ── 1. Modo ──────────────────────────────────────── */}
            <div className="px-5 py-5">
              <OptionLabel>Modo</OptionLabel>
              <div className="grid grid-cols-3 gap-1 p-1 bg-background rounded-xl">
                {THEMES.map((t) => (
                  <OptionCard
                    key={t.value}
                    selected={theme === t.value}
                    onClick={() => handleThemeChange(t.value)}
                    className="flex flex-col items-center justify-center gap-1.5 py-2.5 text-xs font-medium"
                  >
                    {t.icon}
                    {t.label}
                  </OptionCard>
                ))}
              </div>
            </div>

            {/* ── 2. Color Principal ───────────────────────────── */}
            <div className="px-5 py-5">
              <OptionLabel>Color Principal</OptionLabel>
              {/* p-2 para que el scale-110 del item seleccionado no se clipee */}
              <div className="flex flex-wrap gap-3 p-2 -mx-1">
                {PRESETS.map((p) => (
                  <TooltipProvider key={p.value} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setColorPreset(p.value)}
                          className={cn(
                            'w-11 h-11 rounded-full flex items-center justify-center cursor-pointer',
                            'transition-all duration-200',
                            colorPreset === p.value
                              ? 'scale-110 shadow-lg ring-2 ring-white/80 ring-offset-1'
                              : 'opacity-80 hover:opacity-100 hover:scale-105'
                          )}
                          style={{ backgroundColor: p.hex }}
                        >
                          {colorPreset === p.value && (
                            <Icon name="Check" size={14} className="text-white drop-shadow" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="capitalize" sideOffset={8}>
                        {p.value}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* ── 3. Layout de Navegación ──────────────────────── */}
            <div className="px-5 py-5">
              <OptionLabel>Layout de Navegación</OptionLabel>
              <div className="grid grid-cols-2 gap-1 p-1 bg-background rounded-xl">
                {NAV_LAYOUTS.map((nl) => (
                  <OptionCard
                    key={nl.value}
                    selected={navLayout === nl.value}
                    onClick={() => setNavLayout(nl.value)}
                    className="flex flex-col items-center justify-center gap-1.5 py-3"
                  >
                    <Icon name={nl.icon as import('src/shared/components/ui').IconName} size={20} />
                    <span className="text-[11px] font-semibold">{nl.label}</span>
                  </OptionCard>
                ))}
              </div>
            </div>

            {/* ── 4. Apariencia del Sidebar ────────────────────── */}
            <div className="px-5 py-5">
              <OptionLabel>Apariencia del Sidebar</OptionLabel>
              <div className="grid grid-cols-2 gap-1 p-1 bg-background rounded-xl">
                {NAV_COLORS.map((nc) => (
                  <OptionCard
                    key={nc.value}
                    selected={navColor === nc.value}
                    onClick={() => setNavColor(nc.value)}
                    className="flex flex-col items-center justify-center gap-1.5 py-3"
                  >
                    <Icon name={nc.icon as import('src/shared/components/ui').IconName} size={20} />
                    <span className="text-[11px] font-semibold">{nc.label}</span>
                  </OptionCard>
                ))}
              </div>
            </div>

            {/* ── 5. Fondo General ─────────────────────────────── */}
            <div className="px-5 py-5">
              <OptionLabel>Fondo General</OptionLabel>
              <div className="grid grid-cols-3 gap-1 p-1 bg-background rounded-xl">
                {BG_VARIANTS.map((bg) => (
                  <OptionCard
                    key={bg.value}
                    selected={bgVariant === bg.value}
                    onClick={() => setBgVariant(bg.value)}
                    className="flex flex-col items-center justify-center gap-1.5 py-3"
                  >
                    <Icon name={bg.icon as import('src/shared/components/ui').IconName} size={20} />
                    <span className="text-[11px] font-semibold">{bg.label}</span>
                  </OptionCard>
                ))}
              </div>
            </div>

            {/* ── 6. Contraste ─────────────────────────────────── */}
            <div className="px-5 py-5">
              <OptionLabel>Contraste</OptionLabel>
              <div className="grid grid-cols-2 gap-1 p-1 bg-background rounded-xl">
                <OptionCard
                  selected={contrast === 'default'}
                  onClick={() => setContrast('default')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3"
                >
                  <Icon name="Circle" size={20} />
                  <span className="text-[11px] font-semibold">Suave</span>
                </OptionCard>
                <OptionCard
                  selected={contrast === 'bold'}
                  onClick={() => setContrast('bold')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3"
                >
                  <Icon name="Contrast" size={20} />
                  <span className="text-[11px] font-semibold">Intenso</span>
                </OptionCard>
              </div>
            </div>

            {/* ── 7. Tipografía ────────────────────────────────── */}
            <div className="px-5 py-5">
              <OptionLabel>Tipografía</OptionLabel>
              <div className="grid grid-cols-2 gap-1 p-1 bg-background rounded-xl">
                {FONT_FAMILIES.map((ff) => (
                  <OptionCard
                    key={ff.value}
                    selected={fontFamily === ff.value}
                    onClick={() => setFontFamily(ff.value)}
                    className="flex flex-col items-center justify-center gap-1 py-3.5 px-2"
                  >
                    <span
                      className="text-xl font-semibold leading-none"
                      style={{ fontFamily: ff.cssFamily }}
                    >
                      Aa
                    </span>
                    <span className="text-[11px] font-medium mt-1">{ff.label}</span>
                  </OptionCard>
                ))}
              </div>
            </div>

            {/* ── 8. Tamaño de Fuente (Slider) ─────────────────── */}
            <div className="px-5 py-5">
              <OptionLabel>Tamaño de Fuente</OptionLabel>

              <div className="px-1">
                {/* Valor actual + preview */}
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-xs text-muted-foreground">
                    Base:{' '}
                    <span className="text-sm font-semibold text-foreground">{fontSize}px</span>
                  </span>
                  <span
                    className="font-semibold text-primary leading-none"
                    style={{ fontSize: fontSize }}
                  >
                    Aa
                  </span>
                </div>

                {/* Slider */}
                <input
                  id="font-size-slider"
                  type="range"
                  min={12}
                  max={20}
                  step={1}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className={cn(
                    'w-full h-1.5 rounded-full appearance-none cursor-pointer',
                    'bg-border',
                    '[&::-webkit-slider-thumb]:appearance-none',
                    '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
                    '[&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:bg-primary',
                    '[&::-webkit-slider-thumb]:shadow-md',
                    '[&::-webkit-slider-thumb]:cursor-pointer',
                    '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background',
                    '[&::-webkit-slider-thumb]:transition-transform',
                    '[&::-webkit-slider-thumb]:hover:scale-110',
                    '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
                    '[&::-moz-range-thumb]:rounded-full',
                    '[&::-moz-range-thumb]:bg-primary',
                    '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background',
                    '[&::-moz-range-thumb]:cursor-pointer'
                  )}
                />

                {/* Tick labels */}
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground select-none">
                  <span>12px</span>
                  <span>16px</span>
                  <span>20px</span>
                </div>
              </div>
            </div>

            {/* Espacio inferior */}
            <div className="h-6" />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
