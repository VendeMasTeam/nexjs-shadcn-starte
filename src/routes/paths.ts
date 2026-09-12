const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  INVENTORY: '/inventory',
  SALES: '/sales',
  ADMIN: '/admin',
  CONTACTS: '/contacts',
  SCHEDULE: '/schedule',
  REPORTS: '/reports',
  HR: '/hr',
  SETTINGS: '/settings',
  PROJECTS: '/projects',
  PARTNERS: '/partners',
  INTELLIGENCE: '/intelligence',
  PROFILE: '/profile',
  AUTOMATION: '/automation',
  EXPENSES: '/expenses',
  PURCHASES: '/purchases',
};

export const paths = {
  page404: '/error/404',

  // AUTH
  auth: {
    jwt: {
      signIn: `${ROOTS.AUTH}/login`,
      forgotPassword: `${ROOTS.AUTH}/forgot-password`,
      resetPassword: `${ROOTS.AUTH}/reset-password`,
    },
  },

  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    users: {
      root: `${ROOTS.DASHBOARD}/users`,
      create: `${ROOTS.DASHBOARD}/users/create`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/users/${id}/edit`,
    },
    roles: {
      root: `${ROOTS.DASHBOARD}/roles`,
    },
  },

  // INVENTORY
  inventory: {
    root: ROOTS.INVENTORY,
    products: `${ROOTS.INVENTORY}/products`,
    categories: `${ROOTS.INVENTORY}/categories`,
    warehouses: {
      root: `${ROOTS.INVENTORY}/warehouses`,
      movements: `${ROOTS.INVENTORY}/warehouses/movements`,
    },
    stock: `${ROOTS.INVENTORY}/stock`,
    reports: `${ROOTS.INVENTORY}/reports`,
  },

  // SALES
  sales: {
    root: ROOTS.SALES,
    pipeline: `${ROOTS.SALES}/pipeline`,
    pipelineHistory: `${ROOTS.SALES}/pipeline/history`,
    catalog: `${ROOTS.SALES}/catalog`,
    quotation: (id: string) => `${ROOTS.SALES}/quotation/${id}`,
    quotationNew: (opportunityUid: string) =>
      `${ROOTS.SALES}/quotation/new?opportunity_uid=${opportunityUid}`,
    invoice: (id: string) => `${ROOTS.SALES}/invoice/${id}`,
    finance: {
      root: `${ROOTS.SALES}/finance`,
      quotation: `${ROOTS.SALES}/finance/quotation`,
      invoice: `${ROOTS.SALES}/finance/invoice`,
      creditRules: `${ROOTS.SALES}/finance/credit-rules`,
      multiCurrency: `${ROOTS.SALES}/finance/multi-currency`,
    },
  },

  // REPORTS
  reports: {
    root: ROOTS.REPORTS,
    inventory: `${ROOTS.REPORTS}/inventory`,
    sales: `${ROOTS.REPORTS}/sales`,
  },

  // ADMIN (SaaS)
  admin: {
    root: ROOTS.ADMIN,
    dashboard: `${ROOTS.ADMIN}/dashboard`,
    tenants: `${ROOTS.ADMIN}/tenants`,
    plans: `${ROOTS.ADMIN}/plans`,
    billing: `${ROOTS.ADMIN}/billing`,
    telemetry: `${ROOTS.ADMIN}/telemetry`,
    users: `${ROOTS.ADMIN}/users`,
    roles: `${ROOTS.ADMIN}/roles`,
  },

  // CONTACTS
  contacts: {
    root: ROOTS.CONTACTS,
    segments: `${ROOTS.CONTACTS}/segments`,
  },

  // SCHEDULE
  schedule: {
    root: ROOTS.SCHEDULE,
    overdue: `${ROOTS.SCHEDULE}/overdue`,
    tasks: `${ROOTS.SCHEDULE}/tasks`,
  },

  // HR / COMMISSIONS
  hr: {
    root: ROOTS.HR,
    commissions: {
      root: `${ROOTS.HR}/commissions`,
      plans: `${ROOTS.HR}/commissions/plans`,
      assignment: `${ROOTS.HR}/commissions/assignment`,
      dashboard: `${ROOTS.HR}/commissions/dashboard`,
      simulator: `${ROOTS.HR}/commissions/simulator`,
      history: `${ROOTS.HR}/commissions/history`,
    },
  },

  // PROJECTS
  projects: {
    root: ROOTS.PROJECTS,
    detail: (id: string) => `${ROOTS.PROJECTS}/${id}`,
  },

  // PARTNERS
  partners: {
    root: ROOTS.PARTNERS,
    opportunities: `${ROOTS.PARTNERS}/opportunities`,
    portal: `${ROOTS.PARTNERS}/portal`,
  },

  // INTELLIGENCE
  intelligence: {
    root: ROOTS.INTELLIGENCE,
    battlecards: `${ROOTS.INTELLIGENCE}/battlecards`,
    lostReasons: `${ROOTS.INTELLIGENCE}/lost-reasons`,
  },

  // AUTOMATION
  automation: {
    root: ROOTS.AUTOMATION,
    rules: `${ROOTS.AUTOMATION}/rules`,
    ruleNew: `${ROOTS.AUTOMATION}/rules/new`,
    ruleEdit: (id: string) => `${ROOTS.AUTOMATION}/rules/${id}/edit`,
    assignment: `${ROOTS.AUTOMATION}/assignment`,
  },

  // PROFILE
  profile: {
    root: ROOTS.PROFILE,
  },

  // SETTINGS
  settings: {
    root: ROOTS.SETTINGS,
    users: `${ROOTS.SETTINGS}/users`,
    roles: `${ROOTS.SETTINGS}/roles`,
    teams: `${ROOTS.SETTINGS}/teams`,
    customFields: `${ROOTS.SETTINGS}/custom-fields`,
    localization: `${ROOTS.SETTINGS}/localization`,
    tags: `${ROOTS.SETTINGS}/tags`,
    documentTypes: `${ROOTS.SETTINGS}/document-types`,
  },

  // EXPENSES
  expenses: {
    root: ROOTS.EXPENSES,
    categories: `${ROOTS.EXPENSES}/categories`,
    suppliers: `${ROOTS.EXPENSES}/suppliers`,
    costCenters: `${ROOTS.EXPENSES}/cost-centers`,
    report: `${ROOTS.EXPENSES}/report`,
  },

  // PURCHASES
  purchases: {
    root: ROOTS.PURCHASES,
    payables: `${ROOTS.PURCHASES}/payables`,
  },
};
