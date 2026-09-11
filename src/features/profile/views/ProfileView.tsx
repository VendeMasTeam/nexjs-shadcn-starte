'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { extractApiError } from 'src/lib/api-errors';
import axiosInstance from 'src/lib/axios';
import { notify } from 'src/lib/notify';
import { queryKeys } from 'src/lib/query-keys';
import { PageContainer, PageHeader } from 'src/shared/components/layouts/page';
import { Button, Input } from 'src/shared/components/ui';
import { Card, CardContent } from 'src/shared/components/ui/card';
import { Icon } from 'src/shared/components/ui/icon';

import { TwoFactorSettings } from '../components/TwoFactorSettings';
import { useMe } from '../hooks/use-me';

export function ProfileView() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: profile, isLoading } = useMe();

  // Initialize form when profile loads
  if (profile && !initialized) {
    setName(profile.name ?? '');
    setEmail(profile.email ?? '');
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const res = await axiosInstance.put('/me', data);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      notify.success('Perfil actualizado');
    },
    onError: (error) => notify.error(extractApiError(error)),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    updateMutation.mutate({ name: name.trim(), email: email.trim() });
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Mi Perfil" subtitle="Cargando..." />
      </PageContainer>
    );
  }

  const initials = (profile?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader title="Mi Perfil" subtitle="Gestioná tu información personal" />

      <div className="space-y-6">
        {/* Avatar + info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary-foreground">{initials}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{profile?.name}</h2>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Editar información</h3>
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
            <div className="flex justify-end">
              <Button
                color="primary"
                onClick={handleSave}
                disabled={updateMutation.isPending || !name.trim()}
              >
                <Icon name="Save" size={16} className="mr-2" />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <TwoFactorSettings />
      </div>
    </PageContainer>
  );
}
