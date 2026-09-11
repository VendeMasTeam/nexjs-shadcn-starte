'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { TenantStatusBadge } from 'src/features/admin/components/tenant-status-badge';
import { Tenant } from 'src/features/admin/types/admin.types';
import { formatMoney } from 'src/lib/currency';
import { formatRelative } from 'src/lib/date';
import { formatDate as formatDateLib } from 'src/lib/date';
import { EditButton, IconActionButton, ViewButton } from 'src/shared/components/ui/action-buttons';
import { Avatar, AvatarFallback } from 'src/shared/components/ui/avatar';
import { Badge } from 'src/shared/components/ui/badge';
import { Icon } from 'src/shared/components/ui/icon';

function getInitials(nombre: string) {
  return (nombre ?? '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function formatDate(dateStr: string) {
  return formatDateLib(dateStr);
}

function getUserProgressColor(pct: number) {
  if (pct > 95) return 'bg-red-500';
  if (pct > 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

const columnHelper = createColumnHelper<Tenant>();

export interface TenantColumnHandlers {
  onEdit: (tenant: Tenant) => void;
  onViewDetail: (tenant: Tenant) => void;
  onSupportLogin: (tenant: Tenant) => void;
  canSupport: boolean;
}

export function buildTenantColumns({
  onEdit,
  onViewDetail,
  onSupportLogin,
  canSupport,
}: TenantColumnHandlers) {
  return [
    columnHelper.accessor('nombre', {
      header: 'Cliente',
      cell: (info) => {
        const tenant = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700 font-semibold">
                {getInitials(tenant.nombre)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground text-body2">{tenant.nombre}</p>
              <p className="text-caption text-muted-foreground">{tenant.dominio}</p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('plan_nombre', {
      header: 'Plan',
      cell: (info) => (
        <Badge variant="outline" className="text-xs">
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: 'usuarios',
      header: 'Usuarios',
      cell: (info) => {
        const tenant = info.row.original;
        const userPct = Math.round((tenant.total_usuarios / tenant.limite_usuarios) * 100);
        const progressColor = getUserProgressColor(userPct);
        return (
          <div>
            <p className="text-body2 text-foreground font-medium mb-1">
              {tenant.total_usuarios} / {tenant.limite_usuarios}
            </p>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${progressColor}`}
                style={{ width: `${Math.min(userPct, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('mrr', {
      header: 'MRR',
      cell: (info) => (
        <span className="font-semibold text-foreground">
          {formatMoney(info.getValue(), { scope: 'platform', maximumFractionDigits: 0 })}
        </span>
      ),
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      cell: (info) => <TenantStatusBadge estado={info.getValue()} />,
    }),
    columnHelper.accessor('created_at', {
      header: 'Creado',
      cell: (info) => (
        <span className="text-body2 text-muted-foreground">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('last_access_at', {
      header: 'Último acceso',
      cell: (info) => (
        <span className="text-body2 text-muted-foreground">{formatRelative(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: (info) => {
        const tenant = info.row.original;
        return (
          <div className="flex items-center gap-1">
            <ViewButton onClick={() => onViewDetail(tenant)} />
            <EditButton onClick={() => onEdit(tenant)} />
            {canSupport && tenant.estado === 'ACTIVO' && (
              <IconActionButton
                tooltip="Ingresar al tenant (soporte)"
                className="hover:text-indigo-600 hover:bg-indigo-50"
                onClick={() => onSupportLogin(tenant)}
              >
                <Icon name="LogIn" size={14} />
              </IconActionButton>
            )}
          </div>
        );
      },
    }),
  ];
}
