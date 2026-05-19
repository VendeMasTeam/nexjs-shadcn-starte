'use client';

import { useState } from 'react';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import { Button, DeleteButton, EditButton, Icon } from 'src/shared/components/ui';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';

import { AssignmentRuleDrawer } from '../components/AssignmentRuleDrawer';
import { RuleStatusBadge } from '../components/RuleStatusBadge';
import { useAssignmentRules } from '../hooks/useAssignmentRules';
import type { AssignmentRule } from '../types';

export function AssignmentRulesView() {
  const {
    assignmentRules,
    createAssignmentRule,
    updateAssignmentRule,
    deleteAssignmentRule,
    isLoading,
  } = useAssignmentRules();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRule | null>(null);

  const handleEdit = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setEditingRule(null);
  };

  return (
    <PageContainer className="pb-10">
      <PageHeader
        title="Reglas de Asignación"
        subtitle="Configurá cómo se distribuyen automáticamente los leads entre los vendedores"
        action={
          <Button color="primary" onClick={() => setDrawerOpen(true)}>
            <Icon name="Plus" size={16} />
            Nueva regla
          </Button>
        }
      />

      <SectionCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Lógica
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Usuarios
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && assignmentRules.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Cargando reglas...
                  </td>
                </tr>
              )}
              {!isLoading && assignmentRules.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Sin reglas de asignación. Crea una nueva.
                  </td>
                </tr>
              )}
              {assignmentRules.map((rule) => (
                <tr
                  key={rule.uid}
                  className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-foreground">{rule.name}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                        {rule.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                      {rule.logic ?? 'AND'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Icon name="Users" size={13} className="shrink-0" />
                      <span>
                        {rule.user_names?.length
                          ? rule.user_names.join(', ')
                          : rule.user_ids.length === 0
                            ? '—'
                            : rule.user_ids.join(', ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RuleStatusBadge enabled={rule.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EditButton onClick={() => handleEdit(rule)} />
                      <DeleteButton onClick={() => setDeleteTarget(rule)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <AssignmentRuleDrawer
        open={drawerOpen}
        item={editingRule}
        onClose={handleClose}
        onCreate={createAssignmentRule}
        onUpdate={updateAssignmentRule}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteAssignmentRule(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar regla de asignación?"
        description={
          <>
            Vas a eliminar la regla <strong>{deleteTarget?.name}</strong>. Esta acción no se puede
            deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
