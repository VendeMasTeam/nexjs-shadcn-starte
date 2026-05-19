'use client';

import { isPast, isToday } from 'date-fns';
import { useMemo } from 'react';
import { notify } from 'src/lib/notify';

import { useProjects } from '../../projects/hooks/useProjects';
import type { Activity, ActivitySource, ActivityStatus } from '../types/productivity.types';
import { useActivities } from './use-activities';

// ─── Map milestone status → ActivityStatus ──────────────────────────────────

function milestoneStatusToActivityStatus(mStatus: string, dueDate: string): ActivityStatus {
  if (mStatus === 'completed') return 'completed';
  if (mStatus === 'delayed') return 'overdue';
  const d = new Date(dueDate);
  if (isPast(d) && !isToday(d)) return 'overdue';
  return 'pending';
}

// ─── Source badge config ──────────────────────────────────────────────────────

// NOTE: SOURCE_CONFIG CSS class names are a frontend concern — not a backend gap.
// Tailwind classes are static and belong here.
export const SOURCE_CONFIG: Record<
  ActivitySource,
  { label: string; className: string } | undefined
> = {
  pipeline: { label: 'Pipeline', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  project: { label: 'Proyecto', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  agenda: undefined,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAgendaItems(filters?: { status?: string; source?: string }) {
  // Manual activities with server-side filters
  const activityFilters =
    filters?.source === 'agenda' || !filters?.source ? { status: filters?.status } : undefined;

  const {
    data: manualItems,
    isLoading: manualLoading,
    addActivity,
    updateStatus: updateManualStatus,
    refetch: refetchManual,
  } = useActivities(undefined, activityFilters);

  // Project milestones (consumed cross-feature from useProjects)
  const { projects, isLoading: projectsLoading } = useProjects();

  // ─── Pipeline items (TODO: fetch from pipeline backend) ────────────────
  const pipelineItems = useMemo((): Activity[] => [], []);

  // ─── Project milestone items ────────────────────────────────────────────
  const projectItems = useMemo((): Activity[] => {
    const items: Activity[] = [];
    projects.forEach((project) => {
      if (project.status === 'cancelled' || project.status === 'completed') return;
      project.milestones.forEach((milestone) => {
        items.push({
          uid: `project-${milestone.uid}`,
          type: 'task',
          title: milestone.name,
          description: milestone.description,
          status: milestoneStatusToActivityStatus(milestone.status, milestone.due_date),
          due_date: milestone.due_date,
          assigned_to_name: milestone.assigned_to_name ?? '',
          contact_name: project.client_name,
          source: 'project',
          source_uid: project.uid,
          source_path: `/projects/${project.uid}`,
          source_label: project.name,
        });
      });
    });
    return items;
  }, [projects]);

  // ─── Unified list ───────────────────────────────────────────────────────
  const allItems = useMemo(
    () => [...manualItems, ...pipelineItems, ...projectItems],
    [manualItems, pipelineItems, projectItems]
  );

  // ─── Update status (only manual items) ──────────────────────────────────
  const updateStatus = async (uid: string, status: ActivityStatus) => {
    if (uid.startsWith('pipeline-') || uid.startsWith('project-')) {
      notify.info('Para actualizar este item, andá a la fuente original.');
      return;
    }
    try {
      await updateManualStatus(uid, status);
      notify.success('Estado actualizado');
    } catch {
      notify.error('Error actualizando estado');
    }
  };

  return {
    data: allItems,
    isLoading: manualLoading || projectsLoading,
    updateStatus,
    addActivity,
    refetch: refetchManual,
  };
}
