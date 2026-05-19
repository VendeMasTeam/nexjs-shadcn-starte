import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: CONFIG.serverUrl });

// Interceptor para agregar el token de autenticación automáticamente
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const accessToken =
        sessionStorage.getItem('accessToken') || sessionStorage.getItem('jwt_access_token');

      if (accessToken) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginRequest = error?.config?.url?.includes('/login');
    if (typeof window !== 'undefined' && error?.response?.status === 401 && !isLoginRequest) {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('jwt_access_token');
      window.location.href = paths.auth.jwt.signIn;
    }

    const message = error?.response?.data?.message || error?.message || 'Algo salió mal';
    const err = new Error(message);
    (err as Error & { status?: number; data?: unknown }).status = error?.response?.status;
    (err as Error & { status?: number; data?: unknown }).data = error?.response?.data;
    return Promise.reject(err);
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await axiosInstance.get(url, { ...config });

  return res.data;
};

// ----------------------------------------------------------------------

export const endpoints = {
  auth: {
    login: '/login',
    me: '/me',
    init: '/auth/init',
    logout: '/logout',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    userAccess: (uid: string) => `/users/${uid}/access`, // unused — kept for reference
    twoFactor: {
      setup: '/2fa/setup', // GET → { secret, otpauth_url }
      confirm: '/2fa/confirm', // POST { code } → { token, recovery_codes[] }
    },
  },
  users: {
    list: '/users',
    create: '/users',
    show: (uid: string) => `/users/${uid}`,
    update: (uid: string) => `/users/${uid}`,
    delete: (uid: string) => `/users/${uid}`,
    access: (uid: string) => `/users/${uid}/access`,
    assignRole: (uid: string) => `/users/${uid}/roles`,
    removeRole: (uid: string, roleUid: string) => `/users/${uid}/roles/${roleUid}`,
    assignPermission: (uid: string) => `/users/${uid}/permissions`,
    removePermission: (uid: string, permUid: string) => `/users/${uid}/permissions/${permUid}`,
    assignManager: (uid: string) => `/users/${uid}/manager`,
    statuses: '/users/statuses',
  },
  rbac: {
    roles: '/rbac/roles',
    role: (uid: string) => `/rbac/roles/${uid}`,
    permissions: '/rbac/permissions',
  },
  plans: {
    list: '/plans',
    create: '/plans',
    update: (uid: string) => `/plans/${uid}`,
    delete: (uid: string) => `/plans/${uid}`,
  },
  dashboard: {
    core: '/dashboard/core',
  },
  inventory: {
    master: '/inventory/master',
    availability: '/inventory/availability',
    movements: '/inventory/movements',
    adjust: '/inventory/stocks/adjust',
    transfer: '/inventory/movements/transfer',
    products: '/inventory/products',
    product: (uid: string) => `/inventory/products/${uid}`,
    warehouses: '/inventory/warehouses',
    warehouse: (uid: string) => `/inventory/warehouses/${uid}`,
    warehouseStocks: (uid: string) => `/inventory/warehouses/${uid}/stocks`,
    categories: '/inventory/categories',
    reservations: '/inventory/reservations',
    reservation: (uid: string) => `/inventory/reservations/${uid}`,
    reservationConsume: (uid: string) => `/inventory/reservations/${uid}/consume`,
    reservationsBySource: (type: string, uid: string) =>
      `/inventory/reservations/source/${type}/${uid}`,
    movementsSummary: '/inventory/movements/summary',
    report: '/inventory/report',
  },
  admin: {
    dashboard: '/admin/dashboard',
    planModules: '/admin/plan-modules',
    platform: {
      users: {
        list: '/admin/platform/users',
        create: '/admin/platform/users',
        show: (uid: string) => `/admin/platform/users/${uid}`,
        update: (uid: string) => `/admin/platform/users/${uid}`,
        delete: (uid: string) => `/admin/platform/users/${uid}`,
        lock: (uid: string) => `/admin/platform/users/${uid}/lock`,
        unlock: (uid: string) => `/admin/platform/users/${uid}/unlock`,
      },
      roles: {
        list: '/admin/platform/roles',
        create: '/admin/platform/roles',
        show: (uid: string) => `/admin/platform/roles/${uid}`,
        update: (uid: string) => `/admin/platform/roles/${uid}`,
        delete: (uid: string) => `/admin/platform/roles/${uid}`,
        syncPermissions: (uid: string) => `/admin/platform/roles/${uid}/permissions`,
      },
      permissions: '/admin/platform/permissions',
    },
    tenants: {
      list: '/admin/tenants',
      create: '/admin/tenants',
      show: (uid: string) => `/admin/tenants/${uid}`,
      update: (uid: string) => `/admin/tenants/${uid}`,
      suspend: (uid: string) => `/admin/tenants/${uid}/suspend`,
      activate: (uid: string) => `/admin/tenants/${uid}/activate`,
      archive: (uid: string) => `/admin/tenants/${uid}/archive`,
      restore: (uid: string) => `/admin/tenants/${uid}/restore`,
      lockUser: (uid: string, userUid: string) => `/admin/tenants/${uid}/users/${userUid}/lock`,
      unlockUser: (uid: string, userUid: string) => `/admin/tenants/${uid}/users/${userUid}/unlock`,
      createUser: (uid: string) => `/admin/tenants/${uid}/users`,
      users: (uid: string) => `/admin/tenants/${uid}/users`,
    },
    billing: {
      list: '/admin/billing',
      summary: '/admin/billing/summary',
      markPaid: (uid: string) => `/admin/billing/${uid}/mark-paid`,
      markPaidBulk: '/admin/billing/mark-paid-bulk',
      export: '/admin/billing/export',
    },
    telemetry: {
      logs: '/admin/telemetry/logs',
      stats: '/admin/telemetry/stats',
      summary: '/admin/telemetry/summary',
      alerts: '/admin/telemetry/alerts',
      alert: (uid: string) => `/admin/telemetry/alerts/${uid}`,
      toggleAlert: (uid: string) => `/admin/telemetry/alerts/${uid}/toggle`,
      deleteAlert: (uid: string) => `/admin/telemetry/alerts/${uid}`,
    },
  },
  settings: {
    tags: '/tags',
    tag: (uid: string) => `/tags/${uid}`,
    tagsAssign: '/tags/assign',
    tagsUnassign: '/tags/unassign',
    teams: {
      list: '/teams',
      create: '/teams',
      update: (uid: string) => `/teams/${uid}`,
      delete: (uid: string) => `/teams/${uid}`,
      addMember: (uid: string) => `/teams/${uid}/members`,
      removeMember: (uid: string, userUid: string) => `/teams/${uid}/members/${userUid}`,
    },
    customFields: {
      list: '/custom-fields',
      create: '/custom-fields',
      update: (uid: string) => `/custom-fields/${uid}`,
      delete: (uid: string) => `/custom-fields/${uid}`,
      modules: '/custom-fields/modules',
    },
    localization: {
      get: '/settings/localization',
      update: '/settings/localization',
      options: '/settings/localization/options',
    },
    countries: '/settings/countries',
    cities: '/settings/cities',
  },
  relations: {
    list: '/relations',
    listWithEntities: '/relations/with-entities',
    create: '/relations',
    detail: (uid: string) => `/relations/${uid}`,
    delete: (uid: string) => `/relations/${uid}`,
    byEntity: (type: string, uid: string) => `/relations/${type}/${uid}`,
    hierarchy: (type: string, uid: string) => `/relations/hierarchy/${type}/${uid}`,
    remove: '/relations/remove',
  },
  contacts: {
    checkDuplicate: '/contacts/check-duplicate',
    accounts: {
      list: '/accounts',
      detail: (uid: string) => `/accounts/${uid}`,
      create: '/accounts',
      update: (uid: string) => `/accounts/${uid}`,
      delete: (uid: string) => `/accounts/${uid}`,
    },
    contacts: {
      list: '/contacts',
      detail: (uid: string) => `/contacts/${uid}`,
      create: '/contacts',
      update: (uid: string) => `/contacts/${uid}`,
      delete: (uid: string) => `/contacts/${uid}`,
    },
    segments: {
      list: '/segments',
      detail: (uid: string) => `/segments/${uid}`,
      create: '/segments',
      update: (uid: string) => `/segments/${uid}`,
      delete: (uid: string) => `/segments/${uid}`,
    },
  },
  catalog: {
    products: '/products',
    product: (uid: string) => `/products/${uid}`,
    dependencies: (uid: string) => `/products/${uid}/dependencies`,
  },
  sales: {
    stages: '/opportunities/stages',
    board: '/opportunities/board',
    opportunities: '/opportunities',
    opportunity: (uid: string) => `/opportunities/${uid}`,
    opportunityActivities: (uid: string) => `/opportunities/${uid}/activities`,
    opportunityActivity: (uid: string, activityUid: string) =>
      `/opportunities/${uid}/activities/${activityUid}`,
    opportunityWon: (uid: string) => `/opportunities/${uid}/won`,
    opportunityLost: (uid: string) => `/opportunities/${uid}/lost`,
    opportunityTasks: (uid: string) => `/opportunities/${uid}/tasks`,
    opportunitiesTemplate: '/opportunities/template',
    opportunitiesImport: '/opportunities/import',
    quotations: '/quotations',
    quotation: (uid: string) => `/quotations/${uid}`,
    quotationPdf: (uid: string) => `/quotations/${uid}/pdf`,
    quotationSend: (uid: string) => `/quotations/${uid}/send`,
    quotationItems: (uid: string) => `/quotations/${uid}/items`,
    quotationItem: (itemUid: string) => `/quotations/items/${itemUid}`,
    quotationStatuses: '/quotations/statuses',
    invoiceStatuses: '/invoices/statuses',
    quotes: '/quotes',
    quote: (uid: string) => `/quotes/${uid}`,
    financeDashboard: '/finance/dashboard',
    financeInvoices: '/finance/invoices',
    invoiceSend: (uid: string) => `/finance/invoices/${uid}/send`,
    invoicesByQuotation: (uid: string) => `/invoices?quotation_uid=${uid}`,
    financePayments: '/finance/payments',
    financeAlerts: '/finance/alerts',
    creditSummary: (type: string, uid: string) => `/finance/credit/${type}/${uid}`,
    creditUpdate: (type: string, uid: string) => `/finance/credit/${type}/${uid}`,
    creditRules: '/finance/credit/rules',
    creditExceptions: '/finance/credit/exceptions',
    creditException: (uid: string) => `/finance/credit/exceptions/${uid}`,
    currencyRates: '/currency/rates',
    currencyConvert: '/currency/convert',
    paymentHistory: (invoiceUid: string) => `/payments/${invoiceUid}`,
    financeSyncOverdue: '/finance/sync-overdue',
    lostReasonsByOpportunity: (uid: string) => `/lost-reasons?opportunity_uid=${uid}`,
  },
  projects: {
    list: '/projects',
    detail: (uid: string) => `/projects/${uid}`,
    create: '/projects',
    update: (uid: string) => `/projects/${uid}`,
    delete: (uid: string) => `/projects/${uid}`,
    statuses: '/projects/statuses',
    milestones: {
      list: (projectUid: string) => `/projects/${projectUid}/milestones`,
      create: (projectUid: string) => `/projects/${projectUid}/milestones`,
      update: (projectUid: string, milestoneUid: string) =>
        `/projects/${projectUid}/milestones/${milestoneUid}`,
      delete: (projectUid: string, milestoneUid: string) =>
        `/projects/${projectUid}/milestones/${milestoneUid}`,
      statuses: '/milestones/statuses',
    },
    resources: {
      list: (projectUid: string) => `/projects/${projectUid}/assignments`,
      create: (projectUid: string) => `/projects/${projectUid}/assignments`,
      delete: (projectUid: string, resourceUid: string) =>
        `/projects/${projectUid}/assignments/${resourceUid}`,
    },
    resourceRoles: '/projects/resource-roles',
  },
  documentTypes: '/document-types',
  contactsExport: '/contacts/export',
  inventoryExport: '/inventory/export',
  productsExport: '/inventory/products/export',
  stockExport: '/inventory/stock/export',
  invoicesExport: '/sales/finance/invoices/export',
  expenses: {
    list: '/expenses',
    categories: '/expenses/categories',
    suppliers: '/expenses/suppliers',
    costCenters: '/expenses/cost-centers',
    report: '/expenses/report',
    profitability: '/expenses/profitability',
  },
  tasks: {
    list: '/tasks',
    detail: (uid: string) => `/tasks/${uid}`,
    create: '/tasks',
    update: (uid: string) => `/tasks/${uid}`,
    delete: (uid: string) => `/tasks/${uid}`,
    statuses: '/tasks/statuses',
    priorities: '/tasks/priorities',
  },
  purchases: {
    list: '/purchases/orders',
    detail: (uid: string) => `/purchases/orders/${uid}`,
    create: '/purchases/orders',
    update: (uid: string) => `/purchases/orders/${uid}`,
    approve: (uid: string) => `/purchases/orders/${uid}/approve`,
    receive: (uid: string) => `/purchases/orders/${uid}/receive`,
    payables: '/purchases/payables',
  },
  productivity: {
    schedule: '/schedule',
    activities: {
      list: '/activities',
      detail: (uid: string) => `/activities/${uid}`,
      create: '/activities',
      update: (uid: string) => `/activities/${uid}`,
      delete: (uid: string) => `/activities/${uid}`,
      range: '/activities/range',
    },
    interactions: {
      list: (contactUid: string) => `/interactions/contact/${contactUid}`,
      timeline: '/interactions/timeline',
      notes: '/interactions/notes',
      calls: '/interactions/calls',
      emails: '/interactions/emails',
    },
    documents: {
      list: (entityType: string, entityUid: string) =>
        `/documents/entity/${entityType}/${entityUid}`,
      upload: '/documents',
      delete: (docUid: string) => `/documents/${docUid}`,
    },
  },
  partners: {
    partners: {
      list: '/partners',
      detail: (uid: string) => `/partners/${uid}`,
      create: '/partners',
      update: (uid: string) => `/partners/${uid}`,
      delete: (uid: string) => `/partners/${uid}`,
      types: '/partners/types',
    },
    opportunities: {
      list: '/partners/opportunities',
      detail: (uid: string) => `/partners/opportunities/${uid}`,
      create: '/partners/opportunities',
      update: (uid: string) => `/partners/opportunities/${uid}`,
      delete: (uid: string) => `/partners/opportunities/${uid}`,
      approve: (uid: string) => `/partners/opportunities/${uid}/approve`,
      reject: (uid: string) => `/partners/opportunities/${uid}/reject`,
      convert: (uid: string) => `/partners/opportunities/${uid}/convert`,
      /** @deprecated Use approve/reject/convert instead */
      validate: '/partners/opportunities/validate',
      /** @deprecated Use convert(uid) instead */
      close: (uid: string) => `/partners/opportunities/${uid}/close`,
      statuses: '/partners/opportunities/statuses',
    },
    materials: {
      list: '/partner-resources',
      detail: (uid: string) => `/partner-resources/${uid}`,
      download: (uid: string) => `/partner-resources/${uid}/download`,
      create: '/partner-resources',
      update: (uid: string) => `/partner-resources/${uid}`,
      delete: (uid: string) => `/partner-resources/${uid}`,
      types: '/partner-resources/types',
    },
  },
  intelligence: {
    lostReasonsReport: '/competitive-intelligence/lost-reasons/report',
    battlecards: {
      list: '/competitive-intelligence/battlecards',
      detail: (uid: string) => `/competitive-intelligence/battlecards/${uid}`,
      create: '/competitive-intelligence/battlecards',
      update: (uid: string) => `/competitive-intelligence/battlecards/${uid}`,
      delete: (uid: string) => `/competitive-intelligence/battlecards/${uid}`,
    },
    lostReasons: {
      list: '/competitive-intelligence/lost-reasons',
      create: '/competitive-intelligence/lost-reasons',
      update: (uid: string) => `/competitive-intelligence/lost-reasons/${uid}`,
      delete: (uid: string) => `/competitive-intelligence/lost-reasons/${uid}`,
    },
    competitors: {
      list: '/competitive-intelligence/competitors',
      store: '/competitive-intelligence/competitors',
      update: (uid: string) => `/competitive-intelligence/competitors/${uid}`,
      delete: (uid: string) => `/competitive-intelligence/competitors/${uid}`,
    },
  },
  automation: {
    triggerEvents: '/automation/trigger-events',
    actions: '/automation/actions',
    rules: {
      list: '/automation/rules',
      detail: (uid: string) => `/automation/rules/${uid}`,
      create: '/automation/rules',
      update: (uid: string) => `/automation/rules/${uid}`,
      delete: (uid: string) => `/automation/rules/${uid}`,
      toggle: (uid: string) => `/automation/rules/${uid}/toggle`,
    },
    assignmentRules: {
      list: '/automation/assignment-rules',
      create: '/automation/assignment-rules',
      update: (uid: string) => `/automation/assignment-rules/${uid}`,
      delete: (uid: string) => `/automation/assignment-rules/${uid}`,
    },
  },
  commissions: {
    plans: {
      list: '/commissions/plans',
      create: '/commissions/plans',
      update: (uid: string) => `/commissions/plans/${uid}`,
    },
    assignments: {
      list: '/commissions/assignments',
      create: '/commissions/assignments',
      bulk: '/commissions/assignments/bulk',
      update: (uid: string) => `/commissions/assignments/${uid}`,
    },
    targets: {
      list: '/commissions/targets',
      create: '/commissions/targets',
      targetDetail: (uid: string) => `/commissions/targets/${uid}`,
    },
    rules: {
      list: '/commissions/rules',
      create: '/commissions/rules',
      update: (uid: string) => `/commissions/rules/${uid}`,
      delete: (uid: string) => `/commissions/rules/${uid}`,
    },
    entries: {
      list: '/commissions/entries',
      pay: (uid: string) => `/commissions/entries/${uid}/pay`,
    },
    financialRecords: {
      create: '/commissions/financial-records',
    },
    runs: {
      list: '/commissions/runs',
      create: '/commissions/runs',
      approve: (uid: string) => `/commissions/runs/${uid}/approve`,
      pay: (uid: string) => `/commissions/runs/${uid}/pay`,
    },
    simulate: '/commissions/simulate',
    historyPdf: '/commissions/history/pdf',
    periods: '/commissions/periods',
    dashboard: (userUid: string) => `/commissions/dashboard/${userUid}`,
    mySummary: '/commissions/my-summary',
  },
  reports: {
    sales: '/reports/sales',
    inventory: '/reports/inventory',
    filters: '/reports/filters',
    salesExport: '/reports/sales/export',
    inventoryExport: '/reports/inventory/export',
  },
  tenant: {
    industries: '/tenant/industries',
    companySizes: '/tenant/company-sizes',
    institutionTypes: '/tenant/institution-types',
    paymentMethods: '/tenant/payment-methods',
    leadOrigins: '/tenant/lead-origins',
    activityTypes: '/tenant/activity-types',
    lostReasonCategories: '/tenant/lost-reason-categories',
    commissionPlanTypes: '/tenant/commission-plan-types',
    opportunityProducts: '/tenant/opportunity-products',
  },
};
