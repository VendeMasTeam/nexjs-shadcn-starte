'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useSetup2FA } from 'src/features/auth/hooks/use-setup-2fa';
import {
  useDisableTwoFactor,
  useRegenerateRecoveryCodes,
} from 'src/features/auth/hooks/use-two-factor';
import { Button } from 'src/shared/components/ui/button';
import { Card, CardContent } from 'src/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/shared/components/ui/dialog';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';

import { useMe } from '../hooks/use-me';

type BackendErrorBody = { message?: string; errors?: Record<string, string[]> };
type BackendError = Error & { data?: BackendErrorBody };

function RecoveryCodesGrid({ codes }: { codes: string[] }) {
  return (
    <div className="w-full rounded-xl border border-border bg-muted/40 p-4">
      <div className="grid grid-cols-2 gap-2">
        {codes.map((rc) => (
          <code
            key={rc}
            className="text-xs font-mono font-semibold text-foreground bg-background border border-border rounded-lg px-3 py-2 text-center tracking-widest"
          >
            {rc}
          </code>
        ))}
      </div>
    </div>
  );
}

function SaveCodesWarning() {
  return (
    <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
      <Icon name="AlertTriangle" size={14} className="shrink-0 mt-0.5" />
      <span>No vas a poder ver estos códigos de nuevo. Guárdalos ahora.</span>
    </div>
  );
}

// ─── Activar 2FA ────────────────────────────────────────────────────────────

function ActivateTwoFactorContent({
  onDone,
  onRecoveryCodesChange,
}: {
  onDone: () => void;
  onRecoveryCodesChange: (shown: boolean) => void;
}) {
  const {
    qrDataUrl,
    secret,
    isLoadingQR,
    loadError,
    code,
    setCode,
    confirm,
    isConfirming,
    confirmError,
    showSecret,
    setShowSecret,
    showRecoveryCodes,
    recoveryCodes,
  } = useSetup2FA();

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Bloquea el cierre del modal (X / Escape / click afuera) mientras se muestran
  // los recovery codes: solo se puede salir confirmando que ya se guardaron.
  useEffect(() => {
    onRecoveryCodesChange(showRecoveryCodes);
  }, [showRecoveryCodes, onRecoveryCodesChange]);

  if (loadError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>No se pudo iniciar la activación</DialogTitle>
          <DialogDescription>{loadError}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Cerrar
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (showRecoveryCodes) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>2FA activado correctamente</DialogTitle>
          <DialogDescription>
            Guardá estos códigos de recuperación en un lugar seguro. Son de un solo uso y los vas a
            necesitar si perdés acceso a tu app de autenticación.
          </DialogDescription>
        </DialogHeader>
        <RecoveryCodesGrid codes={recoveryCodes} />
        <SaveCodesWarning />
        <DialogFooter>
          <Button color="primary" onClick={onDone}>
            Ya los guardé
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Activar verificación en dos pasos</DialogTitle>
        <DialogDescription>
          Escaneá el código QR con Google Authenticator, Authy u otra app compatible.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center gap-3">
        {isLoadingQR ? (
          <div className="w-44 h-44 rounded-xl bg-muted flex items-center justify-center">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt="Código QR para 2FA"
            width={176}
            height={176}
            unoptimized
            className="rounded-xl border border-border p-2 bg-background"
          />
        ) : null}

        {secret && (
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name={showSecret ? 'EyeOff' : 'Eye'} size={12} />
            {showSecret ? 'Ocultar clave manual' : 'No puedo escanear, ingresar manualmente'}
          </button>
        )}

        {showSecret && secret && (
          <div className="w-full px-4 py-3 rounded-xl bg-muted/40 border border-border text-center">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
              Clave secreta
            </p>
            <code className="text-sm font-mono font-bold tracking-[0.15em] break-all select-all">
              {secret}
            </code>
          </div>
        )}
      </div>

      <Input
        ref={codeInputRef}
        label="Código de verificación"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete="one-time-code"
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && code.length === 6) confirm();
        }}
        disabled={isConfirming || isLoadingQR}
        error={confirmError ?? undefined}
        className="text-center text-2xl font-bold tracking-[0.4em]"
      />

      <DialogFooter>
        <Button
          color="primary"
          onClick={confirm}
          loading={isConfirming}
          disabled={isLoadingQR || code.length !== 6}
        >
          Activar y continuar
        </Button>
      </DialogFooter>
    </>
  );
}

function ActivateTwoFactorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [blockClose, setBlockClose] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !blockClose && onClose()}>
      <DialogContent
        className="sm:max-w-[420px]"
        showCloseButton={!blockClose}
        onEscapeKeyDown={(e) => blockClose && e.preventDefault()}
        onPointerDownOutside={(e) => blockClose && e.preventDefault()}
      >
        {open && (
          <ActivateTwoFactorContent onDone={onClose} onRecoveryCodesChange={setBlockClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Regenerar recovery codes ───────────────────────────────────────────────

function RegenerateCodesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const regenerate = useRegenerateRecoveryCodes();
  const [codes, setCodes] = useState<string[]>([]);

  const handleClose = () => {
    setCodes([]);
    regenerate.reset();
    onClose();
  };

  const handleConfirm = async () => {
    const result = await regenerate.mutateAsync();
    setCodes(result);
  };

  // Igual que en la activación: una vez que se muestran los códigos, la única
  // salida es el botón "Ya los guardé" — no X, no Escape, no click afuera.
  const blockClose = codes.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !blockClose && handleClose()}>
      <DialogContent
        className="sm:max-w-[420px]"
        showCloseButton={!blockClose}
        onEscapeKeyDown={(e) => blockClose && e.preventDefault()}
        onPointerDownOutside={(e) => blockClose && e.preventDefault()}
      >
        {codes.length > 0 ? (
          <>
            <DialogHeader>
              <DialogTitle>Nuevos códigos de recuperación</DialogTitle>
              <DialogDescription>
                Los códigos anteriores dejaron de funcionar. Guardá estos ahora.
              </DialogDescription>
            </DialogHeader>
            <RecoveryCodesGrid codes={codes} />
            <SaveCodesWarning />
            <DialogFooter>
              <Button color="primary" onClick={handleClose}>
                Ya los guardé
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>¿Regenerar códigos de recuperación?</DialogTitle>
              <DialogDescription>
                Los códigos de recuperación actuales van a dejar de funcionar de inmediato.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={regenerate.isPending}>
                Cancelar
              </Button>
              <Button color="primary" onClick={handleConfirm} loading={regenerate.isPending}>
                Regenerar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Desactivar 2FA ─────────────────────────────────────────────────────────

function DisableTwoFactorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const disable = useDisableTwoFactor();

  const handleClose = () => {
    setPassword('');
    disable.reset();
    onClose();
  };

  const handleConfirm = async () => {
    try {
      await disable.mutateAsync(password);
      handleClose();
    } catch {
      // el error ya se muestra vía toast global + inline debajo
    }
  };

  const passwordError = (disable.error as BackendError | null)?.data?.errors?.password?.[0];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Desactivar verificación en dos pasos</DialogTitle>
          <DialogDescription>
            Ingresá tu contraseña para confirmar. Tu cuenta quedará sin la protección de 2FA.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={disable.isPending}>
            Cancelar
          </Button>
          <Button
            color="error"
            onClick={handleConfirm}
            loading={disable.isPending}
            disabled={!password}
          >
            Desactivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sección principal (Perfil) ─────────────────────────────────────────────

type DialogKind = 'activate' | 'regenerate' | 'disable' | null;

export function TwoFactorSettings() {
  const { data: profile } = useMe();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const enabled = !!profile?.two_factor_enabled;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
              enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Icon name="ShieldCheck" size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Verificación en dos pasos</h3>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? 'Tu cuenta está protegida con 2FA.'
                : 'Agregá una capa extra de seguridad a tu cuenta.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setDialog('regenerate')}>
                <Icon name="RefreshCw" size={14} className="mr-2" />
                Regenerar códigos
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-error border-error/30 hover:bg-error/10"
                onClick={() => setDialog('disable')}
              >
                <Icon name="ShieldOff" size={14} className="mr-2" />
                Desactivar 2FA
              </Button>
            </>
          ) : (
            <Button color="primary" size="sm" onClick={() => setDialog('activate')}>
              <Icon name="ShieldCheck" size={14} className="mr-2" />
              Activar 2FA
            </Button>
          )}
        </div>
      </CardContent>

      <ActivateTwoFactorDialog open={dialog === 'activate'} onClose={() => setDialog(null)} />
      <RegenerateCodesDialog open={dialog === 'regenerate'} onClose={() => setDialog(null)} />
      <DisableTwoFactorDialog open={dialog === 'disable'} onClose={() => setDialog(null)} />
    </Card>
  );
}
