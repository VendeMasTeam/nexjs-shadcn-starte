'use client';

import { useState } from 'react';
import { extractApiError } from 'src/lib/api-errors';
import { notify } from 'src/lib/notify';
import { paths } from 'src/routes/paths';
import { beginSupportSession } from 'src/shared/auth/context/jwt/utils';
import { Button } from 'src/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/shared/components/ui/dialog';
import { Textarea } from 'src/shared/components/ui/textarea';

import { tenantsService } from '../services/tenants.service';
import type { Tenant } from '../types/admin.types';

interface SupportLoginDialogProps {
  tenant: Tenant | null;
  onClose: () => void;
}

export function SupportLoginDialog({ tenant, onClose }: SupportLoginDialogProps) {
  const [reason, setReason] = useState('');
  const [isEntering, setIsEntering] = useState(false);

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!tenant || !reason.trim()) return;
    setIsEntering(true);
    try {
      const { token } = await tenantsService.supportLogin(tenant.uid, reason.trim());
      beginSupportSession(token);
      window.location.assign(paths.dashboard.root);
    } catch (error) {
      notify.error(extractApiError(error));
      setIsEntering(false);
    }
  };

  return (
    <Dialog open={!!tenant} onOpenChange={(v) => !v && !isEntering && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ingresar a &quot;{tenant?.nombre}&quot; en modo soporte</DialogTitle>
          <DialogDescription>
            Vas a ver el tenant como si fueras su owner, en modo solo lectura. La sesión queda
            registrada y expira sola.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          label="Motivo de soporte"
          required
          placeholder="Ej: Soporte solicitado por el cliente para revisar el pipeline"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isEntering}
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isEntering}>
            Cancelar
          </Button>
          <Button
            color="primary"
            disabled={!reason.trim()}
            loading={isEntering}
            onClick={handleConfirm}
          >
            Ingresar al tenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
