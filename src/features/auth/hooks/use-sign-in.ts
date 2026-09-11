import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { setSession } from 'src/shared/auth/context/jwt/utils';
import { useAuthContext } from 'src/shared/auth/hooks/use-auth-context';
import { getFirstAccessibleRoute } from 'src/shared/auth/route-access';

import { type SignInFormValues, signInSchema } from '../schemas/sign-in.schema';
import { signInWithPassword } from '../services/auth.service';

type BackendErrorBody = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

type BackendError = Error & { data?: BackendErrorBody };

export function useSignIn() {
  const { checkUserSession } = useAuthContext();
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', twoFactorCode: '' },
  });

  const onSubmit = async (values: SignInFormValues) => {
    try {
      const data = await signInWithPassword({
        email: values.email,
        password: values.password,
        twoFactorCode: values.twoFactorCode || undefined,
        recoveryCode: values.recoveryCode || undefined,
      });

      // Backend may wrap response in { data: {...} } or return payload directly
      const payload = data?.data ?? data;
      const { token, user } = payload;

      // Account locked check — backend should return 423 but we handle it here defensively
      if (user?.locked_until) {
        const lockedDate = new Date(user.locked_until);
        if (lockedDate > new Date()) {
          form.setError('root', {
            message: `Cuenta bloqueada hasta ${lockedDate.toLocaleString('es')}`,
          });
          return;
        }
      }

      if (token) {
        setSession(token);
      }

      const session = await checkUserSession?.();
      const target = session ? getFirstAccessibleRoute(session.modules, session.role) : '/';
      window.location.assign(target);
    } catch (error) {
      const err = error as BackendError;
      const body = err?.data ?? (error as BackendErrorBody);
      const message = body?.message || 'Credenciales incorrectas. Inténtalo de nuevo.';

      // Backend signals 2FA required via errors.two_factor_code in error response body
      if (body?.errors?.two_factor_code) {
        if (!needsTwoFactor) {
          setNeedsTwoFactor(true);
          form.clearErrors();
          return;
        }
        // Already in 2FA mode — code was wrong
        form.setError('twoFactorCode', {
          type: 'manual',
          message: body.errors.two_factor_code[0],
        });
        return;
      }

      form.setError('root', { type: 'manual', message });
    }
  };

  const resetTwoFactor = () => {
    setNeedsTwoFactor(false);
    form.resetField('twoFactorCode');
    form.clearErrors();
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
    needsTwoFactor,
    resetTwoFactor,
  };
}
