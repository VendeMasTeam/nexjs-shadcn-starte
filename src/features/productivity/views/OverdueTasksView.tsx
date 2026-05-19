'use client';

import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import { Badge } from 'src/shared/components/ui/badge';
import { Icon } from 'src/shared/components/ui/icon';

import { SOURCE_CONFIG, useAgendaItems } from '../hooks/use-agenda-items';
import type { ActivityStatus } from '../types/productivity.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusIcon = (status: ActivityStatus) => {
  switch (status) {
    case 'pending':
      return (
        <Icon
          name="Circle"
          size={20}
          className="text-gray-300 hover:text-blue-500 transition-colors"
        />
      );
    case 'in_progress':
      return <Icon name="Loader2" size={20} className="text-blue-500 animate-spin" />;
    case 'completed':
      return <Icon name="CheckCircle2" size={20} className="text-emerald-500" />;
    case 'cancelled':
      return <Icon name="XCircle" size={20} className="text-gray-400" />;
    case 'overdue':
      return (
        <Icon
          name="AlertCircle"
          size={20}
          className="text-red-500 hover:text-red-600 transition-colors"
        />
      );
    default:
      return <Icon name="Circle" size={20} className="text-gray-300" />;
  }
};

const getRelativeDateLabel = (dateStr: string, status: ActivityStatus): string => {
  if (status === 'completed' || status === 'cancelled') return 'Completada';
  const d = new Date(dateStr);
  if (isPast(d) && !isToday(d)) return 'Vencida';
  if (isToday(d)) return 'Vence hoy';
  if (isTomorrow(d)) return 'Vence mañana';
  return 'Pendiente';
};

type FilterTab = 'todas' | 'vencidas' | 'pendientes';

// ─── View ─────────────────────────────────────────────────────────────────────

export function OverdueTasksView() {
  const { data, isLoading, updateStatus } = useAgendaItems();
  const [filterTab, setFilterTab] = useState<FilterTab>('todas');

  // Filter: only non-completed, non-cancelled activities
  const pendingOnly = useMemo(
    () => data.filter((a) => a.status !== 'completed' && a.status !== 'cancelled'),
    [data]
  );

  // Apply tab filter
  const filteredData = useMemo(() => {
    switch (filterTab) {
      case 'vencidas':
        return pendingOnly.filter((a) => a.status === 'overdue');
      case 'pendientes':
        return pendingOnly.filter((a) => a.status !== 'overdue');
      case 'todas':
      default:
        return pendingOnly;
    }
  }, [pendingOnly, filterTab]);

  // Sort: overdue first (oldest date first), then pending by due date ascending
  const sortedData = useMemo(
    () =>
      [...filteredData].sort((a, b) => {
        const aOverdue = a.status === 'overdue' ? 0 : 1;
        const bOverdue = b.status === 'overdue' ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }),
    [filteredData]
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: pendingOnly.length,
      vencidas: pendingOnly.filter((a) => a.status === 'overdue').length,
      pendientes: pendingOnly.filter((a) => a.status !== 'overdue').length,
    }),
    [pendingOnly]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Tareas Pendientes"
        subtitle="Todas las tareas pendientes y vencidas del CRM. Requieren atención para mantener el flujo de trabajo al día."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SectionCard className="hover:border-primary/40 hover:shadow-sm transition flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total pendientes</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
          </div>
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Icon name="List" size={24} />
          </div>
        </SectionCard>
        <SectionCard className="hover:border-red-200 hover:shadow-sm transition flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Vencidas</p>
            <h3 className="text-2xl font-bold text-red-600">{stats.vencidas}</h3>
          </div>
          <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
            <Icon name="AlertCircle" size={24} />
          </div>
        </SectionCard>
        <SectionCard className="hover:border-blue-200 hover:shadow-sm transition flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Por vencer</p>
            <h3 className="text-2xl font-bold text-blue-600">{stats.pendientes}</h3>
          </div>
          <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Icon name="Clock" size={24} />
          </div>
        </SectionCard>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b mb-6">
        {(
          [
            { value: 'todas', label: `Todas (${stats.total})` },
            { value: 'vencidas', label: `Vencidas (${stats.vencidas})` },
            { value: 'pendientes', label: `Por vencer (${stats.pendientes})` },
          ] as { value: FilterTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterTab(tab.value)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filterTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SectionCard className="p-10 text-center text-sm text-gray-500">
          Cargando tareas...
        </SectionCard>
      ) : sortedData.length === 0 ? (
        <SectionCard className="p-16 text-center flex flex-col items-center justify-center">
          <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-400 mb-4">
            <Icon name="Check" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">¡Todo al día!</h3>
          <p className="text-sm text-gray-500">
            {filterTab === 'vencidas'
              ? 'No hay tareas vencidas.'
              : filterTab === 'pendientes'
                ? 'No hay tareas por vencer.'
                : 'No hay tareas pendientes en el CRM.'}
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {sortedData.map((activity) => {
            const sourceCfg = activity.source ? SOURCE_CONFIG[activity.source] : undefined;
            const isReadOnly = activity.source === 'pipeline' || activity.source === 'project';
            const dateLabel = getRelativeDateLabel(activity.due_date, activity.status);
            const isOverdue = activity.status === 'overdue';

            return (
              <SectionCard
                key={activity.uid}
                className={`group flex items-start gap-4 transition-all duration-200 cursor-default ${
                  isOverdue
                    ? 'border-red-200 bg-red-50/20 dark:bg-red-500/5'
                    : 'hover:border-primary/40 hover:shadow-md'
                }`}
              >
                {/* Toggle status button */}
                <button
                  onClick={() =>
                    !isReadOnly &&
                    updateStatus(
                      activity.uid,
                      activity.status === 'completed' ? 'pending' : 'completed'
                    )
                  }
                  disabled={isReadOnly}
                  className={`mt-1 transform transition focus:outline-none shrink-0 ${
                    isReadOnly ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 active:scale-95'
                  }`}
                  title={
                    isReadOnly
                      ? 'Actualiza el estado en la fuente original'
                      : activity.status === 'completed'
                        ? 'Marcar como pendiente'
                        : 'Completar'
                  }
                >
                  {getStatusIcon(activity.status)}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1">
                    <div>
                      <h5 className="text-[15px] leading-tight font-semibold tracking-tight text-foreground">
                        {activity.title}
                      </h5>
                      {activity.contact_name && (
                        <div className="text-xs text-primary font-medium mt-1 truncate">
                          {activity.source === 'project'
                            ? `Proyecto: ${activity.source_label}`
                            : `Cliente: ${activity.contact_name}`}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 items-center shrink-0">
                      {/* Date label badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                          isOverdue
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {dateLabel}
                      </Badge>

                      {/* Source badge */}
                      {sourceCfg && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 ${sourceCfg.className}`}
                        >
                          {sourceCfg.label}
                        </Badge>
                      )}

                      {/* Activity type badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                          activity.type === 'meeting'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : activity.type === 'reminder'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : activity.type === 'call'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : activity.type === 'email'
                                  ? 'bg-gray-50 text-gray-700 border-gray-200'
                                  : activity.type === 'note'
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {activity.type === 'task'
                          ? 'Tarea'
                          : activity.type === 'reminder'
                            ? 'Recordatorio'
                            : activity.type === 'meeting'
                              ? 'Reunión'
                              : activity.type === 'call'
                                ? 'Llamada'
                                : activity.type === 'email'
                                  ? 'Correo'
                                  : 'Nota'}
                      </Badge>
                    </div>
                  </div>

                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[12px] font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-md border border-border/50">
                      <Icon
                        name="Clock"
                        size={14}
                        className={isOverdue ? 'text-red-500' : 'text-primary'}
                      />
                      <span className={isOverdue ? 'text-red-600' : 'text-foreground'}>
                        {format(new Date(activity.due_date), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-md border border-border/50">
                      <Icon name="User" size={14} className="text-emerald-500" />
                      <span className="text-foreground">{activity.assigned_to_name}</span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
