'use client';

import { ReactNode, useCallback, useRef, useState } from 'react';
import { useUiStore } from 'src/store/ui.store';

import { layoutClasses } from './classes';

type Props = {
  children: ReactNode;
  headerSection?: ReactNode;
  sidebarSection?: ReactNode;
  footerSection?: ReactNode;
  /** Franja opcional que se pega arriba del header (banner de modo soporte, etc.) */
  topBanner?: ReactNode;
};

export function LayoutSection({
  children,
  headerSection,
  sidebarSection,
  footerSection,
  topBanner,
}: Props) {
  const { navLayout, navColor } = useUiStore();

  const isNavMini = navLayout === 'mini';
  const [isScrolled, setIsScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);

  // Throttle con rAF: evita "forced reflow" al leer scrollTop síncronamente
  // en cada evento de scroll. El browser lee scrollTop en el próximo frame,
  // cuando el layout ya está calculado, eliminando el reflow forzado.
  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return; // ya hay un frame pendiente, skip
    rafRef.current = requestAnimationFrame(() => {
      if (mainRef.current) {
        setIsScrolled(mainRef.current.scrollTop > 10);
      }
      rafRef.current = null;
    });
  }, []);

  return (
    <div
      className={`fixed inset-0 flex w-full h-[100dvh] overflow-hidden bg-background text-foreground ${layoutClasses.root}`}
    >
      {/* Sidebar Area */}
      {sidebarSection && (
        <aside
          className={`
            transition-all duration-300 flex max-[1199px]:hidden shrink-0 flex-col z-20 border-r
            bg-sidebar text-sidebar-foreground border-sidebar-border
            ${navColor === 'dark' ? 'sidebar-dark' : ''}
            ${isNavMini ? 'w-[88px]' : 'w-[280px]'}
            ${layoutClasses.nav.root}
          `}
        >
          {sidebarSection}
        </aside>
      )}

      {/* Main Container Area: flex column, fills remaining space */}
      <div className={`flex flex-1 flex-col min-h-0 min-w-0 ${layoutClasses.content}`}>
        {/* Content Area — the ONLY scroll container */}
        <main
          ref={mainRef}
          onScroll={handleScroll}
          className="flex-1 overflow-x-hidden overflow-y-auto min-h-0 min-w-0"
        >
          {/* Banner + header flotan juntos sobre el contenido, pegados como una sola
              unidad sticky — así el banner nunca queda tapado por el header ni al revés. */}
          {(topBanner || headerSection) && (
            <div className="sticky top-0 z-10">
              {topBanner}
              {headerSection && (
                <header
                  className={`
                    h-[72px] flex items-center px-4 w-full
                    transition-[background-color,backdrop-filter] duration-200
                    ${isScrolled ? 'bg-background/80 backdrop-blur-xs' : 'bg-transparent'}
                    ${layoutClasses.header}
                  `}
                >
                  {headerSection}
                </header>
              )}
            </div>
          )}

          {/* Page content */}
          {children}
        </main>

        {/* Footer Area */}
        {footerSection}
      </div>
    </div>
  );
}
