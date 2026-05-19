export const queryKeys = {
  dashboard: {
    core: ['dashboard', 'core'] as const,
    activities: ['dashboard', 'activities'] as const,
  },
  contacts: {
    list: ['contacts', 'list'] as const,
    segments: {
      list: ['contacts', 'segments', 'list'] as const,
    },
  },
  inventory: {
    products: ['inventory', 'products'] as const,
    categories: ['inventory', 'categories'] as const,
    warehouses: ['inventory', 'warehouses'] as const,
    movements: ['inventory', 'movements'] as const,
    movementsSummary: ['inventory', 'movements', 'summary'] as const,
  },
  sales: {
    stages: ['sales', 'stages'] as const,
    opportunities: ['sales', 'opportunities'] as const,
    opportunityList: ['sales', 'opportunities', 'list'] as const,
    opportunityDetail: (uid: string) => ['sales', 'opportunities', uid] as const,
    opportunityActivities: (uid: string) => ['sales', 'opportunities', uid, 'activities'] as const,
    board: ['sales', 'board'] as const,
    quotations: ['sales', 'quotations'] as const,
    quotationsByOpportunity: (uid: string) =>
      ['sales', 'quotations', 'by-opportunity', uid] as const,
    invoices: ['sales', 'invoices'] as const,
    invoicesByQuotation: (uid: string) => ['sales', 'invoices', 'by-quotation', uid] as const,
    creditRules: ['sales', 'credit-rules'] as const,
    creditExceptions: ['sales', 'credit-exceptions'] as const,
    currencyRates: ['sales', 'currency-rates'] as const,
    financeDashboard: ['sales', 'finance-dashboard'] as const,
  },
  settings: {
    tags: ['settings', 'tags'] as const,
    users: ['settings', 'users'] as const,
    roles: ['settings', 'roles'] as const,
    teams: ['settings', 'teams'] as const,
    customFields: ['settings', 'custom-fields'] as const,
    customFieldsModules: ['settings', 'custom-fields-modules'] as const,
    localization: ['settings', 'localization'] as const,
  },
  projects: {
    list: ['projects', 'list'] as const,
  },
  productivity: {
    activities: {
      all: ['productivity', 'activities'] as const,
      byContact: (uid: string) => ['productivity', 'activities', uid] as const,
    },
    interactions: {
      byContact: (uid: string) => ['productivity', 'interactions', uid] as const,
    },
    documents: {
      byContact: (uid: string) => ['productivity', 'documents', uid] as const,
    },
  },
  partners: {
    partners: {
      list: ['partners', 'list'] as const,
      detail: (uid: string) => ['partners', 'detail', uid] as const,
    },
    opportunities: {
      list: ['partner-opportunities', 'list'] as const,
      detail: (uid: string) => ['partner-opportunities', 'detail', uid] as const,
    },
    materials: {
      list: ['portal-materials', 'list'] as const,
      detail: (uid: string) => ['portal-materials', 'detail', uid] as const,
    },
  },
  intelligence: {
    battlecards: ['intelligence', 'battlecards'] as const,
    lostReasons: ['intelligence', 'lost-reasons'] as const,
    competitors: ['intelligence', 'competitors'] as const,
  },
  automation: {
    rules: ['automation', 'rules'] as const,
    assignmentRules: ['automation', 'assignment-rules'] as const,
  },
  commissions: {
    plans: ['commissions', 'plans'] as const,
    assignments: ['commissions', 'assignments'] as const,
    targets: ['commissions', 'targets'] as const,
    rules: ['commissions', 'rules'] as const,
    entries: ['commissions', 'entries'] as const,
    runs: ['commissions', 'runs'] as const,
    dashboard: ['commissions', 'dashboard'] as const,
    periods: ['commissions', 'periods'] as const,
  },
  reports: {
    sales: (tab: string, filters?: Record<string, string>) =>
      ['reports', 'sales', tab, ...(filters ? [JSON.stringify(filters)] : [])] as const,
    inventory: (tab: string, filters?: Record<string, string>) =>
      ['reports', 'inventory', tab, ...(filters ? [JSON.stringify(filters)] : [])] as const,
    filters: ['reports', 'filters'] as const,
  },
  admin: {
    platformUsers: ['admin', 'platform-users'] as const,
    platformRoles: ['admin', 'platform-roles'] as const,
    platformPermissions: ['admin', 'platform-permissions'] as const,
  },
  rbac: {
    permissions: ['rbac', 'permissions'] as const,
  },
  tenant: {
    industries: ['tenant', 'industries'] as const,
    companySizes: ['tenant', 'company-sizes'] as const,
    institutionTypes: ['tenant', 'institution-types'] as const,
    paymentMethods: ['tenant', 'payment-methods'] as const,
    leadOrigins: ['tenant', 'lead-origins'] as const,
    activityTypes: ['tenant', 'activity-types'] as const,
    lostReasonCategories: ['tenant', 'lost-reason-categories'] as const,
    commissionPlanTypes: ['tenant', 'commission-plan-types'] as const,
    opportunityProducts: ['tenant', 'opportunity-products'] as const,
  },
} as const;
