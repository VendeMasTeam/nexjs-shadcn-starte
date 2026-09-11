'use client';

import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { queryKeys } from 'src/lib/query-keys';
import { setSession } from 'src/shared/auth/context/jwt/utils';
import { useAuthContext } from 'src/shared/auth/hooks/use-auth-context';

import { confirmTwoFactorSetup, getTwoFactorSetupData } from '../services/auth.service';

type BackendBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

function extractError(err: unknown, fallback: string): string {
  const body = err as BackendBody;
  const code = body?.errors?.code;
  return code?.[0] ?? body?.message ?? fallback;
}

// Activación propia de 2FA — corre con la sesión autenticada normal (no requiere
// un setupToken temporal: el backend expone /2fa/setup y /2fa/confirm bajo el Bearer del usuario).
export function useSetup2FA() {
  const { checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [isLoadingQR, setIsLoadingQR] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  useEffect(() => {
    setIsLoadingQR(true);
    getTwoFactorSetupData()
      .then(async (data) => {
        const payload = data?.data ?? data;
        const secretKey = (payload.secret ?? '') as string;
        const otpauthUrl = payload.otpauth_url as string;
        setSecret(secretKey);
        const dataUrl = await QRCode.toDataURL(otpauthUrl, { width: 192, margin: 1 });
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        setLoadError(extractError(err, 'No se pudo cargar el código QR. Intentá de nuevo.'));
      })
      .finally(() => setIsLoadingQR(false));
  }, []);

  const confirm = async () => {
    if (code.length !== 6) {
      setConfirmError('El código debe tener 6 dígitos.');
      return;
    }
    setIsConfirming(true);
    setConfirmError(null);
    try {
      const data = await confirmTwoFactorSetup(code);
      const payload = data?.data ?? data;
      // Reemplazar el token anterior por el nuevo antes de mostrar los recovery codes
      setSession(payload.token as string);
      await checkUserSession();
      // two_factor_enabled solo viene en GET /me, no en /auth/init
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      setRecoveryCodes((payload.recovery_codes ?? []) as string[]);
      setShowRecoveryCodes(true);
    } catch (err) {
      setConfirmError(extractError(err, 'Código incorrecto. Verificá tu app y volvé a intentar.'));
      setCode('');
    } finally {
      setIsConfirming(false);
    }
  };

  return {
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
  };
}
