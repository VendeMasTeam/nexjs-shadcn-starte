'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Opportunity } from 'src/features/sales/types/sales.types';
import { extractApiError } from 'src/lib/api-errors';
import { formatDateTime } from 'src/lib/date';
import { notify } from 'src/lib/notify';
import { queryKeys } from 'src/lib/query-keys';
import { cn } from 'src/lib/utils';
import { Button } from 'src/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/shared/components/ui/dialog';
import { Icon, type IconName } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { Textarea } from 'src/shared/components/ui/textarea';

import { opportunityService } from '../services/opportunity.service';
import type { Activity, ActivityStatus, ActivityType } from '../types/sales.types';
import { normalizeActivityType } from '../types/sales.types';

interface OpportunityTimelineProps {
  opportunity: Opportunity;
}

const ACTIVITY_ICONS: Record<ActivityType, IconName> = {
  llamada: 'Phone',
  email: 'Mail',
  reunion: 'CalendarDays',
  demo: 'CalendarDays',
  seguimiento: 'CalendarDays',
  nota: 'MessageSquare',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente',
  completed: 'completada',
  cancelled: 'cancelada',
  overdue: 'vencida',
};

export function OpportunityTimeline({ opportunity }: OpportunityTimelineProps) {
  const queryClient = useQueryClient();
  const uid = opportunity.uid;

  const [activeTab, setActiveTab] = useState<'nota' | 'actividad'>('nota');
  const [newNote, setNewNote] = useState('');
  const [newActivity, setNewActivity] = useState({
    type: 'llamada' as ActivityType,
    date: '',
    notes: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingType, setEditingType] = useState<ActivityType>('llamada');
  const [editingDate, setEditingDate] = useState('');
  const [deleteItem, setDeleteItem] = useState<{
    uid: string;
    type: ActivityType;
  } | null>(null);

  // ─── Query: fetch activities from backend ────────────────────────────────────

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: queryKeys.sales.opportunityActivities(uid),
    queryFn: () => opportunityService.getActivities(uid),
    staleTime: 0,
  });

  // ─── Create mutation ─────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: { type: ActivityType; content: string; date: string }) =>
      opportunityService.createActivity(uid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.opportunityActivities(uid) });
    },
    onError: (error) => {
      notify.error(extractApiError(error));
    },
  });

  // ─── Update mutation ─────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (payload: {
      activityUid: string;
      content: string;
      type: ActivityType;
      date: string;
    }) =>
      opportunityService.updateActivity(uid, payload.activityUid, {
        content: payload.content,
        type: payload.type,
        date: payload.date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.opportunityActivities(uid) });
    },
    onError: (error) => {
      notify.error(extractApiError(error));
    },
  });

  // ─── Delete mutation ─────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (activityUid: string) => opportunityService.deleteActivity(uid, activityUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.opportunityActivities(uid) });
    },
    onError: (error) => {
      notify.error(extractApiError(error));
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const startEdit = (id: string, content: string | undefined, type: ActivityType, date: Date) => {
    setEditingId(id);
    setEditingContent(content || '');
    setEditingType(type);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    setEditingDate(local.toISOString().slice(0, 16));
  };

  const handleUpdate = (activityUid: string) => {
    if (!editingDate) return;
    updateMutation.mutate({
      activityUid,
      content: editingContent.trim(),
      type: editingType,
      date: new Date(editingDate).toISOString(),
    });
    setEditingId(null);
  };

  const confirmDelete = () => {
    if (deleteItem) {
      deleteMutation.mutate(deleteItem.uid);
      setDeleteItem(null);
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createMutation.mutate({
      type: 'nota',
      content: newNote.trim(),
      date: new Date().toISOString(),
    });
    setNewNote('');
  };

  const handleAddActivity = () => {
    if (!newActivity.date) return;
    createMutation.mutate({
      type: newActivity.type,
      content: newActivity.notes.trim() || '',
      date: new Date(newActivity.date).toISOString(),
    });
    setNewActivity({ type: 'llamada', date: '', notes: '' });
  };

  // ─── Build timeline items from API data ─────────────────────────────────────

  const timelineItems = activities
    .map((a) => ({
      uid: a.uid,
      date: new Date(a.scheduled_at),
      type: normalizeActivityType(a.type),
      content: a.description,
      author: a.assigned_to_name || a.owner_user_name || 'Sin asignar',
      status: (a.status as ActivityStatus) || 'pendiente',
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
      {/* ── Acciones de creacion ────────────────────────────────────────────── */}
      <div className="bg-muted/10 p-5 border-b border-border/40">
        <div className="flex items-center gap-1 mb-4 border-b border-border/40 pb-2">
          <button
            onClick={() => setActiveTab('nota')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2',
              activeTab === 'nota'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Nueva Nota
          </button>
          <button
            onClick={() => setActiveTab('actividad')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2',
              activeTab === 'actividad'
                ? 'border-indigo-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Registrar Actividad
          </button>
        </div>

        {activeTab === 'nota' ? (
          <div className="flex flex-col gap-3">
            <Textarea
              label="Nota"
              placeholder="Escribe una nota sobre esta oportunidad..."
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="bg-background"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim() || createMutation.isPending}
              >
                Guardar Nota
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Tipo"
                options={[
                  { value: 'llamada', label: 'Llamada' },
                  { value: 'email', label: 'Email' },
                  { value: 'reunion', label: 'Reunión' },
                  { value: 'demo', label: 'Demostración' },
                  { value: 'seguimiento', label: 'Seguimiento' },
                ]}
                value={newActivity.type}
                onChange={(v) => setNewActivity((p) => ({ ...p, type: v as ActivityType }))}
              />
              <Input
                label="Fecha y hora"
                type="datetime-local"
                value={newActivity.date}
                onChange={(e) => setNewActivity((p) => ({ ...p, date: e.target.value }))}
                rightIcon={<Icon name="Clock" size={16} />}
                inputClassName="[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
              />
            </div>
            <Textarea
              label="Detalles"
              placeholder="Resumen o detalles de la actividad..."
              rows={2}
              value={newActivity.notes}
              onChange={(e) => setNewActivity((p) => ({ ...p, notes: e.target.value }))}
              className="bg-background"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                color="primary"
                onClick={handleAddActivity}
                disabled={!newActivity.date || createMutation.isPending}
              >
                Programar Actividad
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Lista Timeline ──────────────────────────────────────────────────── */}
      <div className="p-6">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-6">
          Historial y Seguimiento
        </h3>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Cargando historial…</p>
        ) : timelineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No hay historial aún.</p>
        ) : (
          <div className="space-y-6 relative before:absolute before:top-0 before:bottom-0 before:left-5 before:w-0.5 before:-translate-x-1/2 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
            {timelineItems.map((item) => {
              const activityIcon = ACTIVITY_ICONS[item.type] ?? 'Mail';
              const isNote = item.type === 'nota';

              return (
                <div key={item.uid} className="relative flex items-start gap-4 group">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 shadow-sm z-10 mt-1',
                      isNote ? 'bg-primary/10 text-primary' : 'bg-indigo-500/10 text-indigo-500'
                    )}
                  >
                    {item.status === 'completada' ? (
                      <Icon name="Check" size={16} />
                    ) : (
                      <Icon name={activityIcon} size={16} />
                    )}
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-muted/10 p-4 rounded-xl border border-border/40 shadow-sm hover:border-indigo-500/30 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {item.type}{' '}
                          {item.status ? `• ${STATUS_LABEL[item.status] || item.status}` : ''}
                        </span>
                        <time className="text-[10px] text-muted-foreground font-mono">
                          {formatDateTime(item.date, {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>

                      {/* Actions on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(item.uid, item.content, item.type, item.date)}
                          className="p-1 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded transition-colors"
                          title="Editar"
                        >
                          <Icon name="Edit2" size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteItem({ uid: item.uid, type: item.type })}
                          className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Icon name="Trash2" size={12} />
                        </button>
                      </div>
                    </div>

                    {editingId === item.uid ? (
                      <div className="mt-2 space-y-3">
                        {!isNote && (
                          <div className="grid grid-cols-2 gap-3">
                            <SelectField
                              label="Tipo"
                              options={[
                                { value: 'llamada', label: 'Llamada' },
                                { value: 'email', label: 'Email' },
                                { value: 'reunion', label: 'Reunión' },
                                { value: 'demo', label: 'Demostración' },
                                { value: 'seguimiento', label: 'Seguimiento' },
                              ]}
                              value={editingType}
                              onChange={(v) => setEditingType(v as ActivityType)}
                            />
                            <Input
                              label="Fecha y hora"
                              type="datetime-local"
                              value={editingDate}
                              onChange={(e) => setEditingDate(e.target.value)}
                              rightIcon={<Icon name="Clock" size={16} />}
                              inputClassName="[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                            />
                          </div>
                        )}
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="bg-background min-h-[80px] text-sm"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingId(null)}
                            className="h-7 text-xs px-2"
                          >
                            <Icon name="X" size={12} className="mr-1" /> Cancelar
                          </Button>
                          <Button
                            size="sm"
                            color="primary"
                            onClick={() => handleUpdate(item.uid)}
                            disabled={updateMutation.isPending}
                            className="h-7 text-xs px-2"
                          >
                            <Icon name="Check" size={12} className="mr-1" /> Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {item.content && (
                          <p className="text-sm text-foreground/80 leading-relaxed mb-2 whitespace-pre-wrap">
                            {item.content}
                          </p>
                        )}
                        <span className="text-xs font-medium text-foreground/60">
                          Por {item.author}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmación Eliminar Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar registro</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este registro del historial? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>
              Cancelar
            </Button>
            <Button color="error" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
