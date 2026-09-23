'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { paths } from 'src/routes/paths';
import { Logo } from 'src/shared/components/Logo';
import { ThemeToggle } from 'src/shared/components/ThemeToggle';
import { Icon } from 'src/shared/components/ui';
import { Form, FormControl, FormField, FormItem, FormMessage } from 'src/shared/components/ui';

import { useSignIn } from '../hooks/use-sign-in';

// ─── Shared input component ───────────────────────────────────────────────────
function AuthInput({
  id,
  label,
  type = 'text',
  disabled,
  icon,
  placeholder,
  autoFocus,
  ...field
}: {
  id: string;
  label: string;
  type?: string;
  disabled?: boolean;
  icon: React.ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
  [key: string]: unknown;
}) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPass ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-indigo-500 pointer-events-none">
          {icon}
        </span>
        <input
          {...field}
          id={id}
          type={inputType}
          disabled={disabled}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="
            w-full h-11 pl-10 pr-10 text-sm text-foreground
            bg-muted/40 border border-border rounded-xl
            outline-none transition-all duration-200
            placeholder:text-muted-foreground/60
            hover:border-muted-foreground/30 hover:bg-background
            focus:border-indigo-500 focus:bg-background focus:ring-2 focus:ring-indigo-500/10
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-indigo-500 transition-colors"
            tabIndex={-1}
            aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPass ? <Icon name="EyeOff" size={15} /> : <Icon name="Eye" size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Spinner inline ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-sm text-error flex items-center gap-2">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
        <circle cx="7.5" cy="7.5" r="7" stroke="currentColor" />
        <path
          d="M7.5 4v4M7.5 10.5v.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      {message}
    </div>
  );
}

// ─── Step 1: Credentials ──────────────────────────────────────────────────────
function CredentialsStep({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: ReturnType<typeof useSignIn>['form'];
  onSubmit: ReturnType<typeof useSignIn>['onSubmit'];
  isSubmitting: boolean;
}) {
  return (
    <>
      <div className="flex flex-col items-center mb-8">
        <div className="mb-6">
          <Logo variant="full" height={68} />
        </div>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          Ingresa tus credenciales para continuar
        </p>
      </div>

      {!!form.formState.errors.root && (
        <div className="mb-4">
          <ErrorBanner message={form.formState.errors.root.message!} />
        </div>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <AuthInput
                    id="login-email"
                    label="Correo electrónico"
                    type="email"
                    placeholder="admin@empresa.com"
                    icon={<Icon name="Mail" size={16} />}
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs ml-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <AuthInput
                    id="login-password"
                    label="Contraseña"
                    type="password"
                    placeholder="••••••••"
                    icon={<Icon name="Lock" size={16} />}
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs ml-1" />
              </FormItem>
            )}
          />

          <div className="-mt-2 text-right">
            <Link
              href={paths.auth.jwt.forgotPassword}
              className="text-[12px] text-muted-foreground hover:text-indigo-600 transition-colors duration-200"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide text-white bg-indigo-600 shadow-[0_4px_14px_rgba(67,56,202,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(67,56,202,0.5)] hover:bg-indigo-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner />
                Verificando…
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </Form>

      <div className="mt-5 text-center">
        <span className="text-[13px] text-muted-foreground">
          La creación de cuentas es gestionada por el administrador.
        </span>
      </div>
    </>
  );
}

// ─── Step 2: Two-Factor Auth (verify code) ────────────────────────────────────
function TwoFactorStep({
  form,
  onSubmit,
  isSubmitting,
  onBack,
}: {
  form: ReturnType<typeof useSignIn>['form'];
  onSubmit: ReturnType<typeof useSignIn>['onSubmit'];
  isSubmitting: boolean;
  onBack: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const recoveryRef = useRef<HTMLInputElement>(null);
  const [useRecovery, setUseRecovery] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleToggleRecovery = () => {
    if (!useRecovery) {
      form.setValue('twoFactorCode', '');
      setTimeout(() => recoveryRef.current?.focus(), 50);
    } else {
      form.setValue('recoveryCode', '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    setUseRecovery((v) => !v);
    form.clearErrors();
  };

  return (
    <>
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Icon name="ShieldCheck" size={30} className="text-primary" />
        </div>
        <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-tight text-center">
          Verificación en dos pasos
        </h1>
        <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed max-w-[300px]">
          {useRecovery
            ? 'Ingresa uno de tus códigos de recuperación de un solo uso'
            : 'Ingresa el código de 6 dígitos de tu app de autenticación'}
        </p>
      </div>

      {!!form.formState.errors.root && (
        <div className="mb-4">
          <ErrorBanner message={form.formState.errors.root.message!} />
        </div>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {useRecovery ? (
            <FormField
              control={form.control}
              name="recoveryCode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="login-recovery"
                        className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground"
                      >
                        Código de recuperación
                      </label>
                      <input
                        {...field}
                        ref={recoveryRef}
                        id="login-recovery"
                        type="text"
                        autoComplete="off"
                        placeholder="Ej: a1b2c3d4"
                        disabled={isSubmitting}
                        className="
                          w-full h-14 text-center text-lg font-mono font-bold tracking-widest
                          text-foreground bg-muted/40 border border-border rounded-xl
                          outline-none transition-all duration-200
                          placeholder:text-muted-foreground/50 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal
                          hover:border-muted-foreground/30 hover:bg-background
                          focus:border-indigo-500 focus:bg-background focus:ring-2 focus:ring-indigo-500/10
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs ml-1" />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="twoFactorCode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="login-2fa"
                        className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground"
                      >
                        Código de verificación
                      </label>
                      <input
                        {...field}
                        ref={inputRef}
                        id="login-2fa"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoComplete="one-time-code"
                        placeholder="000000"
                        disabled={isSubmitting}
                        className="
                          w-full h-14 text-center text-2xl font-bold tracking-[0.4em]
                          text-foreground bg-muted/40 border border-border rounded-xl
                          outline-none transition-all duration-200
                          placeholder:text-muted-foreground/50 placeholder:tracking-[0.4em]
                          hover:border-muted-foreground/30 hover:bg-background
                          focus:border-indigo-500 focus:bg-background focus:ring-2 focus:ring-indigo-500/10
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs ml-1" />
                </FormItem>
              )}
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide text-white bg-indigo-600 shadow-[0_4px_14px_rgba(67,56,202,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(67,56,202,0.5)] hover:bg-indigo-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner />
                Verificando…
              </>
            ) : (
              'Confirmar'
            )}
          </button>
        </form>
      </Form>

      <button
        type="button"
        onClick={handleToggleRecovery}
        disabled={isSubmitting}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-[13px] text-indigo-500 hover:text-indigo-700 transition-colors duration-200 disabled:opacity-40"
      >
        <Icon name={useRecovery ? 'ShieldCheck' : 'Shield'} size={13} />
        {useRecovery
          ? 'Usar código de autenticación'
          : '¿No puedes acceder a tu app? Usa un código de recuperación'}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="mt-2 w-full flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground hover:text-indigo-600 transition-colors duration-200"
      >
        <Icon name="ChevronLeft" size={14} />
        Volver al inicio de sesión
      </button>
    </>
  );
}

// ─── Background shapes (reusable) ────────────────────────────────────────────
function BgShapes() {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
      <svg
        className="absolute -top-32 -left-32 w-[600px] h-[600px] text-indigo-600/10"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M42.7,-64.1C55.6,-53.6,66.6,-40.7,73.1,-25.6C79.6,-10.5,81.5,6.7,77.3,22.2C73,37.6,62.6,51.3,49.5,61.9C36.4,72.4,20.5,80,4,74.7C-12.4,69.5,-28.9,51.5,-44,38.8C-59,26,-72.6,18.5,-77.4,6.5C-82.3,-5.5,-78.4,-21.9,-69,-34.5C-59.6,-47.1,-44.6,-56,-30.5,-63.3C-16.4,-70.6,-3.2,-76.4,10.1,-81.4C23.3,-86.3,42.7,-64.1,42.7,-64.1Z"
          transform="translate(100 100) scale(1.1)"
        />
      </svg>
      <svg
        className="absolute -bottom-40 -right-40 w-[700px] h-[700px] text-indigo-700/5"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M47.5,-74.6C62,-66.1,74.6,-52.1,81.7,-35.3C88.8,-18.4,90.3,1.3,84.9,18.8C79.5,36.4,67.3,51.8,52.3,62.6C37.3,73.3,19.5,79.5,0.7,78.5C-18,77.5,-36,69.3,-51.1,57.7C-66.2,46,-78.5,31,-83.5,13.4C-88.5,-4.2,-86.2,-24.4,-76,-40.5C-65.7,-56.5,-47.6,-68.4,-30.2,-75.4C-12.8,-82.4,33,-83.1,47.5,-74.6Z"
          transform="translate(100 100)"
        />
      </svg>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function JwtSignInView() {
  const { form, onSubmit, isSubmitting, needsTwoFactor, resetTwoFactor } = useSignIn();
  const searchParams = useSearchParams();
  const passwordReset = searchParams.get('passwordReset') === '1';

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 auth-bg-mesh overflow-hidden animate-auth-bg-appear">
      <BgShapes />

      <ThemeToggle className="absolute top-5 right-5 z-20" />

      <div className="relative z-10 w-full max-w-[420px] bg-card border border-border/60 rounded-2xl px-8 py-10 sm:px-10 auth-floating-shadow animate-auth-form-drop">
        {passwordReset && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-sm text-success flex items-center gap-2">
            <Icon name="CheckCircle" size={15} className="shrink-0" />
            Contraseña restablecida. Ya puedes iniciar sesión.
          </div>
        )}

        {needsTwoFactor ? (
          <TwoFactorStep
            form={form}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            onBack={resetTwoFactor}
          />
        ) : (
          <CredentialsStep form={form} onSubmit={onSubmit} isSubmitting={isSubmitting} />
        )}

        {/* Trust badges — always visible */}
        <div className="mt-6 pt-5 border-t border-border flex items-center justify-center gap-3 sm:gap-6 whitespace-nowrap">
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground cursor-default">
            <Icon name="ShieldCheck" size={13} />
            <span className="text-[10px] sm:text-[11px] font-medium">Seguridad SSL</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground cursor-default">
            <Icon name="Globe" size={13} />
            <span className="text-[10px] sm:text-[11px] font-medium">Red Empresarial</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground cursor-default">
            <Icon name="Cloud" size={13} />
            <span className="text-[10px] sm:text-[11px] font-medium">Nube</span>
          </div>
        </div>
      </div>
    </div>
  );
}
