'use client';

import { useMemo } from 'react';
import { paths } from 'src/routes/paths';
import { useAuthContext } from 'src/shared/auth/hooks/use-auth-context';
import type { Module, ModuleItem } from 'src/shared/auth/types';
import { Icon, type IconName } from 'src/shared/components/ui';

import type { NavItemProps } from '../components/layouts/dashboard/nav-item';
import type { NavSectionData } from '../components/layouts/dashboard/nav-section';

// ─────────────────────────────────────────────────────────────────────────────
// Static nav config — each section has a moduleKey matching backend modules.
// Visibility is determined by whether the user's modules[] includes that key
// with enabled: true.
// ─────────────────────────────────────────────────────────────────────────────
type StaticNavItem = {
  title: string;
  path: string;
  icon: IconName;
  gatedByModule?: string; // item visible only if this top-level module is enabled (cross-section gate)
  itemKey?: string; // key within parent module's items[] — item visible only if item.enabled
  children?: StaticNavItem[];
};

type StaticSection = {
  moduleKey?: string;
  subheader: string;
  order?: number;
  items: StaticNavItem[];
};

// ── Tenant NAV — matches GET /api/auth/init modules[] keys ─────────────────
const NAV_CONFIG: StaticSection[] = [
  {
    moduleKey: 'dashboard',
    subheader: 'General',
    order: 1,
    items: [{ title: 'Dashboard', path: paths.dashboard.root, icon: 'LayoutDashboard' }],
  },
  {
    moduleKey: 'inventory',
    subheader: 'Inventario',
    order: 2,
    items: [
      { title: 'Productos', path: paths.inventory.products, icon: 'Package' },
      {
        title: 'Bodegas',
        path: paths.inventory.warehouses.root,
        icon: 'Warehouse',
        children: [
          {
            title: 'Vista General',
            path: paths.inventory.warehouses.root,
            icon: 'LayoutDashboard',
          },
          {
            title: 'Movimientos',
            path: paths.inventory.warehouses.movements,
            icon: 'ArrowLeftRight',
          },
        ],
      },
      { title: 'Stock & Disponibilidad', path: paths.inventory.stock, icon: 'BarChart2' },
      { title: 'Categorías', path: paths.inventory.categories, icon: 'Tag' },
    ],
  },
  {
    moduleKey: 'sales',
    subheader: 'Ventas',
    order: 3,
    items: [
      { title: 'Pipeline', path: paths.sales.pipeline, icon: 'KanbanSquare' },
      { title: 'Catálogo', path: paths.sales.catalog, icon: 'BookOpen' },
      { title: 'Dashboard Financiero', path: paths.sales.finance.root, icon: 'PieChart' },
      { title: 'Cotizaciones', path: paths.sales.finance.quotation, icon: 'FileText' },
      { title: 'Facturas', path: paths.sales.finance.invoice, icon: 'Receipt' },
      { title: 'Reglas de Crédito', path: paths.sales.finance.creditRules, icon: 'ShieldCheck' },
      { title: 'Multimoneda', path: paths.sales.finance.multiCurrency, icon: 'DollarSign' },
    ],
  },
  {
    moduleKey: 'reports',
    subheader: 'Reportes',
    order: 4,
    items: [
      { title: 'Inventario', path: paths.reports.inventory, icon: 'LayoutDashboard' },
      { title: 'Ventas', path: paths.reports.sales, icon: 'PieChart' },
    ],
  },
  {
    moduleKey: 'incentives',
    subheader: 'Incentivos y Comisiones',
    order: 5,
    items: [
      { title: 'Planes de Comisión', path: paths.hr.commissions.plans, icon: 'ClipboardList' },
      {
        title: 'Asignación a Vendedores',
        path: paths.hr.commissions.assignment,
        icon: 'UserCheck',
      },
      { title: 'Mi Dashboard', path: paths.hr.commissions.dashboard, icon: 'LayoutDashboard' },
      { title: 'Simulador', path: paths.hr.commissions.simulator, icon: 'Calculator' },
      { title: 'Historial y Liquidación', path: paths.hr.commissions.history, icon: 'History' },
    ],
  },
  {
    moduleKey: 'projects',
    subheader: 'Proyectos',
    order: 6,
    items: [{ title: 'Todos los Proyectos', path: paths.projects.root, icon: 'FolderKanban' }],
  },
  {
    moduleKey: 'settings',
    subheader: 'Configuración',
    order: 7,
    items: [
      { title: 'Usuarios', path: paths.settings.users, icon: 'Users' },
      { title: 'Roles y Permisos', path: paths.settings.roles, icon: 'ShieldCheck' },
      { title: 'Equipos y Cartera', path: paths.settings.teams, icon: 'UsersRound' },
      { title: 'Campos Personalizados', path: paths.settings.customFields, icon: 'Sliders' },
      { title: 'Localización', path: paths.settings.localization, icon: 'Globe' },
      { title: 'Etiquetas (Tags)', path: paths.settings.tags, icon: 'Tag' },
      { title: 'Tipos de Documento', path: paths.settings.documentTypes, icon: 'FileText' },
    ],
  },
  {
    moduleKey: 'crm',
    subheader: 'CRM',
    order: 8,
    items: [
      { title: 'Directorio', path: paths.contacts.root, icon: 'Users' },
      { title: 'Segmentación Dinámica', path: paths.contacts.segments, icon: 'Filter' },
      { title: 'Agenda & Productividad', path: paths.schedule.root, icon: 'Calendar' },
      { title: 'Tareas', path: paths.schedule.tasks, icon: 'CheckSquare', gatedByModule: 'tasks' },
    ],
  },
  {
    moduleKey: 'expenses',
    subheader: 'Gastos',
    order: 10,
    items: [
      { title: 'Gastos', path: paths.expenses.root, icon: 'Receipt', itemKey: 'expenses' },
      { title: 'Categorías', path: paths.expenses.categories, icon: 'Tag' },
      { title: 'Proveedores', path: paths.expenses.suppliers, icon: 'Package' },
      { title: 'Centros de Costo', path: paths.expenses.costCenters, icon: 'Building2' },
    ],
  },
  {
    moduleKey: 'partners',
    subheader: 'Canales & Partners',
    order: 9,
    items: [
      { title: 'Partners', path: paths.partners.root, icon: 'Handshake' },
      { title: 'Oportunidades', path: paths.partners.opportunities, icon: 'ClipboardList' },
      {
        title: 'Portal de Materiales',
        path: paths.partners.portal,
        icon: 'FolderOpen',
        itemKey: 'portal',
      },
    ],
  },
  {
    moduleKey: 'purchases',
    subheader: 'Compras',
    order: 11,
    items: [
      {
        title: 'Órdenes de Compra',
        path: paths.purchases.root,
        icon: 'ShoppingCart',
        itemKey: 'orders',
      },
    ],
  },
  {
    moduleKey: 'intelligence',
    subheader: 'Inteligencia Competitiva',
    order: 12,
    items: [
      { title: 'Battlecards', path: paths.intelligence.battlecards, icon: 'Swords' },
      { title: 'Razones de Pérdida', path: paths.intelligence.lostReasons, icon: 'TrendingDown' },
    ],
  },
  {
    moduleKey: 'automation',
    subheader: 'Automatización',
    order: 13,
    items: [
      { title: 'Reglas', path: paths.automation.rules, icon: 'Zap', itemKey: 'rules' },
      {
        title: 'Asignación',
        path: paths.automation.assignment,
        icon: 'UserCheck',
        itemKey: 'assignment',
      },
    ],
  },
];

// ── Admin SaaS NAV — shown for platform_admin users ────────────────────────
const ADMIN_NAV: StaticSection[] = [
  {
    subheader: 'Admin SaaS',
    items: [
      { title: 'Dashboard', path: paths.admin.dashboard, icon: 'LayoutDashboard' },
      { title: 'Clientes', path: paths.admin.tenants, icon: 'Building2' },
      { title: 'Planes', path: paths.admin.plans, icon: 'CreditCard' },
      { title: 'Facturación', path: paths.admin.billing, icon: 'Receipt' },
      { title: 'Telemetría', path: paths.admin.telemetry, icon: 'Activity' },
      { title: 'Usuarios Plataforma', path: paths.admin.users, icon: 'Users' },
      { title: 'Roles Plataforma', path: paths.admin.roles, icon: 'ShieldCheck' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isModuleEnabled(modules: Module[], moduleKey: string | undefined): boolean {
  if (!moduleKey) return false;
  const mod = modules.find((m) => m.key === moduleKey);
  return mod?.enabled === true;
}

function isItemEnabled(moduleItems: ModuleItem[] | undefined, itemKey: string): boolean {
  if (!moduleItems?.length) return true; // backend didn't send items → show all
  const item = moduleItems.find((i) => i.key === itemKey);
  return item ? item.enabled : true; // unknown key → show (forward compatible)
}

function isPlatformAdmin(userRole: string | undefined): boolean {
  return userRole === 'platform-admin';
}

function buildNavItems(
  items: StaticNavItem[],
  parentModuleItems: ModuleItem[] | undefined,
  allModules: Module[]
): NavItemProps[] {
  return items
    .filter((item) => {
      if (item.gatedByModule) return isModuleEnabled(allModules, item.gatedByModule);
      if (item.itemKey) return isItemEnabled(parentModuleItems, item.itemKey);
      return true;
    })
    .map((item) => ({
      title: item.title,
      path: item.path,
      icon: <Icon name={item.icon} size={18} />,
      ...(item.children?.length
        ? { children: buildNavItems(item.children, parentModuleItems, allModules) }
        : {}),
    }));
}

function buildSections(config: StaticSection[], modules: Module[]): NavSectionData[] {
  return config
    .filter((section) => {
      if (!section.moduleKey) return true;
      return isModuleEnabled(modules, section.moduleKey);
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .map((section) => {
      const parentModule = modules.find((m) => m.key === section.moduleKey);
      return {
        subheader: section.subheader,
        items: buildNavItems(section.items, parentModule?.items, modules),
      };
    })
    .filter((section) => section.items.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useNavData(): NavSectionData[] {
  const { user, modules } = useAuthContext();

  return useMemo(() => {
    const sections: NavSectionData[] = [];

    if (isPlatformAdmin(user?.role)) {
      sections.push(...buildSections(ADMIN_NAV, modules));
    }

    sections.push(...buildSections(NAV_CONFIG, modules));

    return sections;
  }, [user?.role, modules]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Compat shim — keep BackendModule export for any lingering imports
// ─────────────────────────────────────────────────────────────────────────────
export type BackendModule = Record<string, unknown>;
export type BackendNavItem = Record<string, unknown>;
