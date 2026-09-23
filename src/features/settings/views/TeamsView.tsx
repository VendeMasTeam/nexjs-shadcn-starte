'use client';

import React, { useState } from 'react';
import { PageContainer, PageHeader } from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { useDebounce } from 'use-debounce';

import { TeamDrawer } from '../components/teams/team-drawer';
import { TeamsGrid } from '../components/teams/teams-table';
import { useTeams } from '../hooks/use-teams';
import type { Team } from '../types/settings.types';

export const TeamsView = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);

  const { teams, isLoading, createTeam, updateTeam, addMember, removeMember, deleteTeam } =
    useTeams(debouncedSearch);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  // Sync selectedTeam with latest data after mutations (e.g. addMember)
  const currentTeam = selectedTeam
    ? (teams.find((t) => t.uid === selectedTeam.uid) ?? selectedTeam)
    : null;

  const handleOpenNew = () => {
    setSelectedTeam(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setIsDrawerOpen(true);
  };

  const handleSave = async (
    data: Omit<Team, 'uid' | 'created_at' | 'members_count' | 'members'>
  ) => {
    if (selectedTeam) return updateTeam(selectedTeam.uid, data);
    return createTeam(data);
  };

  const handleAddMember = (teamUid: string, userUid: string) => {
    addMember(teamUid, userUid);
  };

  const handleRemoveMember = (teamUid: string, userUid: string) => {
    removeMember(teamUid, userUid);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Equipos y Cartera"
        subtitle="Organiza vendedores en equipos y controla qué clientes puede ver cada uno"
        action={
          <div className="flex items-center gap-3">
            <Input
              placeholder="Buscar equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Icon name="Search" size={15} />}
              className="w-52"
            />
            <Button color="primary" onClick={handleOpenNew} className="gap-2">
              <Icon name="Plus" size={16} />
              Nuevo equipo
            </Button>
          </div>
        }
      />

      {isLoading && teams.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-muted/40 rounded-2xl w-full" />
          ))}
        </div>
      ) : (
        <>
          <TeamsGrid teams={teams} onEdit={handleEdit} onDelete={(t) => setDeleteTarget(t)} />
          <div className="p-4 text-sm text-muted-foreground">
            {teams.length} equipo{teams.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      <TeamDrawer
        key={isDrawerOpen ? (selectedTeam?.uid ?? 'new') : 'closed'}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        team={currentTeam}
        onSave={handleSave}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteTeam(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar equipo?"
        description={
          <>
            Vas a eliminar <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
};
