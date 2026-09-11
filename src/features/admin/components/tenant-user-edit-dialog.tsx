'use client';

import { useState } from 'react';
import { extractApiError } from 'src/lib/api-errors';
import { notify } from 'src/lib/notify';
import { Button } from 'src/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/shared/components/ui/dialog';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';

import { tenantsService } from '../services/tenants.service';
import type { TenantUser } from '../types/admin.types';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'seller', label: 'Seller' },
];

interface TenantUserEditDialogProps {
  tenantUid: string;
  user: TenantUser | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TenantUserEditDialog({
  tenantUid,
  user,
  onClose,
  onSaved,
}: TenantUserEditDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (user && initializedFor !== user.uid) {
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setRole(user.rol ?? '');
    setPassword('');
    setInitializedFor(user.uid);
  }

  const handleClose = () => {
    setInitializedFor(null);
    onClose();
  };

  const handleSave = async () => {
    if (!user) return;
    const payload: Record<string, unknown> = {};
    if (name.trim() && name.trim() !== user.name) payload.name = name.trim();
    if (email.trim() && email.trim() !== user.email) payload.email = email.trim();
    if (role && role !== user.rol) payload.role = role;
    if (password.trim()) payload.password = password.trim();

    if (Object.keys(payload).length === 0) {
      handleClose();
      return;
    }

    setSaving(true);
    try {
      await tenantsService.updateUser(tenantUid, user.uid, payload);
      notify.success('Usuario actualizado');
      onSaved();
      handleClose();
    } catch (error) {
      notify.error(extractApiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SelectField
            label="Rol"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(v) => setRole(v as string)}
          />
          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="Dejar vacío para no cambiarla"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
