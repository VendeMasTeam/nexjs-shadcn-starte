'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuthContext } from 'src/shared/auth/hooks/use-auth-context';
import { useNavData } from 'src/shared/hooks/use-nav-data';
import { useUiStore } from 'src/store/ui.store';

import { SettingsDrawer } from '../settings';
import { LayoutSection } from './core/layout-section';
import { HeaderSection } from './dashboard/header-section';
import { HeaderTenantButton } from './dashboard/header-tenant-button';
import { HeaderUserButton } from './dashboard/header-user-button';
import { NavMobile } from './dashboard/nav-mobile';
import { NavVertical } from './dashboard/nav-vertical';

type Props = {
  children: ReactNode;
};

export function AppLayout({ children }: Props) {
  const { user, tenant } = useAuthContext();
  const { isMobileNavOpen, toggleMobileNav } = useUiStore();
  const pathname = usePathname();

  // Cerrar menú mobile SOLO al cambiar de ruta.
  // toggleMobileNav/isMobileNavOpen se excluyen intencionalmente de las dependencias:
  // agregarlos causaría que el menú se cierre en cada render cuando está abierto.
  useEffect(() => {
    if (isMobileNavOpen) toggleMobileNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navData = useNavData();

  return (
    <LayoutSection
      sidebarSection={<NavVertical navData={navData} />}
      headerSection={
        <HeaderSection
          slots={{
            left: <HeaderTenantButton tenant={tenant} />,
            right: (
              <div className="flex items-center gap-2">
                <SettingsDrawer />
                <HeaderUserButton user={user} />
              </div>
            ),
          }}
        />
      }
    >
      {/* Mobile Drawer */}
      <NavMobile open={isMobileNavOpen} onClose={toggleMobileNav} navData={navData} />

      {/* Contenido de la página actual */}
      {children}
    </LayoutSection>
  );
}
