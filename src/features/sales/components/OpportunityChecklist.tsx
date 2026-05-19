'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Task } from 'src/features/tasks/types/task.types';
import { cn } from 'src/lib/utils';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';

import { opportunityService } from '../services/opportunity.service';
import type { Opportunity } from '../types/sales.types';

interface OpportunityChecklistProps {
  opportunity: Opportunity;
}

export function OpportunityChecklist({ opportunity }: OpportunityChecklistProps) {
  const queryClient = useQueryClient();
  const [newText, setNewText] = useState('');

  const queryKey = ['opportunity-tasks', opportunity.uid];

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey,
    queryFn: () => opportunityService.getTasks(opportunity.uid),
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      opportunityService.createTask(opportunity.uid, {
        title,
        status: 'pending',
        priority: 'medium',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const done = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    createMutation.mutate(text);
    setNewText('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-caption text-muted-foreground">Cargando tareas…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-caption text-muted-foreground">
              {done} de {total} completadas
            </span>
            <span className="text-caption font-bold text-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progress === 100 ? 'bg-success' : progress >= 50 ? 'bg-primary' : 'bg-warning'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-1">
        {tasks.length === 0 ? (
          <p className="text-caption text-muted-foreground text-center py-4">
            No hay tareas. Agregá la primera.
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.uid}
              className="flex items-center gap-2.5 group rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-colors"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                  task.status === 'completed'
                    ? 'bg-success border-success text-white'
                    : 'border-border'
                )}
              >
                {task.status === 'completed' && <Icon name="Check" size={10} strokeWidth={3} />}
              </div>
              <span
                className={cn(
                  'flex-1 text-body2 transition-colors',
                  task.status === 'completed'
                    ? 'line-through text-muted-foreground'
                    : 'text-foreground'
                )}
              >
                {task.title}
              </span>
              {task.priority && task.priority !== 'medium' && (
                <span className="text-[10px] text-muted-foreground capitalize opacity-60">
                  {task.priority}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add item */}
      <div className="flex gap-2 pt-2 border-t border-border/40">
        <Input
          placeholder="Nueva tarea..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 h-8 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!newText.trim() || createMutation.isPending}
        >
          <Icon
            name={createMutation.isPending ? 'Loader2' : 'Plus'}
            size={14}
            className={createMutation.isPending ? 'animate-spin' : ''}
          />
        </Button>
      </div>
    </div>
  );
}
