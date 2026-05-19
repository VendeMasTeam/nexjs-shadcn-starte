'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { paths } from 'src/routes/paths';
import { Logo } from 'src/shared/components/Logo';
import { Icon } from 'src/shared/components/ui';
import { Form, FormControl, FormField, FormItem, FormMessage } from 'src/shared/components/ui';

import { useSetup2FA } from '../hooks/use-setup-2fa';
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
        className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-500"
      >
        {label}
      </label>
      <div className="relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-indigo-500 pointer-events-none">
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
            w-full h-11 pl-10 pr-10 text-sm text-slate-800
            bg-slate-50 border border-slate-200 rounded-xl
            outline-none transition-all duration-200
            placeholder:text-slate-400
            hover:border-slate-300 hover:bg-white
            focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10
            disabled:opacity-50 disabled:cursor-not-allowed
            autofill:bg-white
          "
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
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
    <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
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
          <Logo variant="full" height={120} />
        </div>
        <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-tight text-center">
          Bienvenido de nuevo
        </h1>
        <p className="text-sm text-slate-500 mt-1 text-center">
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
              className="text-[12px] text-slate-400 hover:text-indigo-600 transition-colors duration-200"
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
        <span className="text-[13px] text-slate-500">
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
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
          <Icon name="ShieldCheck" size={30} className="text-indigo-600" />
        </div>
        <h1 className="text-[24px] font-bold text-slate-800 tracking-tight leading-tight text-center">
          Verificación en dos pasos
        </h1>
        <p className="text-sm text-slate-500 mt-2 text-center leading-relaxed max-w-[300px]">
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
                        className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-500"
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
                          text-slate-800 bg-slate-50 border border-slate-200 rounded-xl
                          outline-none transition-all duration-200
                          placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal
                          hover:border-slate-300 hover:bg-white
                          focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10
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
                        className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-500"
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
                          text-slate-800 bg-slate-50 border border-slate-200 rounded-xl
                          outline-none transition-all duration-200
                          placeholder:text-slate-300 placeholder:tracking-[0.4em]
                          hover:border-slate-300 hover:bg-white
                          focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10
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
        className="mt-2 w-full flex items-center justify-center gap-1.5 text-[13px] text-slate-400 hover:text-indigo-600 transition-colors duration-200"
      >
        <Icon name="ChevronLeft" size={14} />
        Volver al inicio de sesión
      </button>
    </>
  );
}

// ─── Step 3: Two-Factor Setup (first time) ────────────────────────────────────
function TwoFactorSetupStep({
  setupToken,
  onComplete,
  onBack,
}: {
  setupToken: string;
  onComplete: (newToken: string) => Promise<void>;
  onBack: () => void;
}) {
  const {
    qrDataUrl,
    secret,
    isLoadingQR,
    fatalError,
    code,
    setCode,
    confirm,
    isConfirming,
    confirmError,
    showSecret,
    setShowSecret,
    showRecoveryCodes,
    recoveryCodes,
    proceed,
    isProceding,
  } = useSetup2FA(setupToken, onComplete);

  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoadingQR && !showRecoveryCodes && !fatalError) codeInputRef.current?.focus();
  }, [isLoadingQR, showRecoveryCodes, fatalError]);

  // ── Fatal error step (tenant suspendido, token inválido, etc.) ───────────
  if (fatalError) {
    return (
      <>
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
            <Icon name="Shield" size={30} className="text-red-500" />
          </div>
          <h1 className="text-[22px] font-bold text-slate-800 tracking-tight leading-tight text-center">
            Acceso restringido
          </h1>
          <p className="text-sm text-slate-500 mt-2 text-center leading-relaxed max-w-[300px]">
            Tu cuenta no puede acceder al sistema en este momento. Contactá con soporte para
            resolver esto.
          </p>
        </div>

        <div className="px-4 py-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 text-center mb-6 leading-relaxed">
          {fatalError}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="ChevronLeft" size={16} />
          Volver al inicio de sesión
        </button>
      </>
    );
  }

  // ── Recovery codes step ───────────────────────────────────────────────────
  if (showRecoveryCodes) {
    return (
      <>
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
            <Icon name="ShieldCheck" size={30} className="text-emerald-600" />
          </div>
          <h1 className="text-[22px] font-bold text-slate-800 tracking-tight leading-tight text-center">
            2FA activado correctamente
          </h1>
          <p className="text-sm text-slate-500 mt-2 text-center leading-relaxed max-w-[320px]">
            Guarda estos códigos de recuperación en un lugar seguro. Son de un solo uso y los
            necesitarás si pierdes acceso a tu app de autenticación.
          </p>
        </div>

        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5">
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((rc) => (
              <code
                key={rc}
                className="text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 text-center tracking-widest"
              >
                {rc}
              </code>
            ))}
          </div>
        </div>

        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
          <Icon name="AlertTriangle" size={14} className="shrink-0 mt-0.5" />
          <span>No podrás ver estos códigos de nuevo. Guárdalos ahora.</span>
        </div>

        <button
          type="button"
          onClick={proceed}
          disabled={isProceding}
          className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide text-white bg-indigo-600 shadow-[0_4px_14px_rgba(67,56,202,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(67,56,202,0.5)] hover:bg-indigo-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProceding ? (
            <>
              <Spinner />
              Ingresando…
            </>
          ) : (
            'Ya los guardé, ingresar'
          )}
        </button>
      </>
    );
  }

  // ── QR scan + code confirmation step ─────────────────────────────────────
  return (
    <>
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
          <Icon name="ShieldCheck" size={30} className="text-indigo-600" />
        </div>
        <h1 className="text-[22px] font-bold text-slate-800 tracking-tight leading-tight text-center">
          Configurar verificación en dos pasos
        </h1>
        <p className="text-sm text-slate-500 mt-2 text-center leading-relaxed max-w-[320px]">
          Escaneá el código QR con Google Authenticator, Authy u otra app compatible.
        </p>
      </div>

      {/* QR code */}
      <div className="flex flex-col items-center gap-3 mb-5">
        {isLoadingQR ? (
          <div className="w-48 h-48 rounded-xl bg-slate-100 flex items-center justify-center">
            <Spinner />
          </div>
        ) : qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt="Código QR para 2FA"
            width={192}
            height={192}
            unoptimized
            className="rounded-xl border border-slate-200 p-2 bg-white"
          />
        ) : null}

        {secret && (
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="text-[12px] text-indigo-600 hover:underline flex items-center gap-1"
          >
            <Icon name={showSecret ? 'EyeOff' : 'Eye'} size={12} />
            {showSecret ? 'Ocultar clave manual' : 'No puedo escanear, ingresar manualmente'}
          </button>
        )}

        {showSecret && secret && (
          <div className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-1">
              Clave secreta
            </p>
            <code className="text-sm font-mono font-bold text-slate-700 tracking-[0.15em] break-all select-all">
              {secret}
            </code>
          </div>
        )}
      </div>

      {confirmError && (
        <div className="mb-4">
          <ErrorBanner message={confirmError} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="setup-2fa-code"
            className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-500"
          >
            Código de verificación
          </label>
          <input
            ref={codeInputRef}
            id="setup-2fa-code"
            type="text"
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
            className="
              w-full h-14 text-center text-2xl font-bold tracking-[0.4em]
              text-slate-800 bg-slate-50 border border-slate-200 rounded-xl
              outline-none transition-all duration-200
              placeholder:text-slate-300 placeholder:tracking-[0.4em]
              hover:border-slate-300 hover:bg-white
              focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={isConfirming || isLoadingQR || code.length !== 6}
          className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide text-white bg-indigo-600 shadow-[0_4px_14px_rgba(67,56,202,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(67,56,202,0.5)] hover:bg-indigo-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isConfirming ? (
            <>
              <Spinner />
              Verificando…
            </>
          ) : (
            'Activar y continuar'
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-[13px] text-slate-400 hover:text-indigo-600 transition-colors duration-200"
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
  const {
    form,
    onSubmit,
    isSubmitting,
    needsTwoFactor,
    resetTwoFactor,
    needsTwoFactorSetup,
    setupToken,
    completeSetup,
    resetSetup,
  } = useSignIn();
  const searchParams = useSearchParams();
  const passwordReset = searchParams.get('passwordReset') === '1';

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 auth-bg-mesh overflow-hidden animate-auth-bg-appear">
      <BgShapes />

      <div className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl px-8 py-10 sm:px-10 auth-floating-shadow animate-auth-form-drop">
        {passwordReset && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700 flex items-center gap-2">
            <Icon name="CheckCircle" size={15} className="shrink-0" />
            Contraseña restablecida. Ya puedes iniciar sesión.
          </div>
        )}

        {needsTwoFactorSetup && setupToken ? (
          <TwoFactorSetupStep
            setupToken={setupToken}
            onComplete={(newToken) => completeSetup(newToken)}
            onBack={resetSetup}
          />
        ) : needsTwoFactor ? (
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
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-3 sm:gap-6 whitespace-nowrap">
          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 cursor-default">
            <Icon name="ShieldCheck" size={13} />
            <span className="text-[10px] sm:text-[11px] font-medium">Seguridad SSL</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 cursor-default">
            <Icon name="Globe" size={13} />
            <span className="text-[10px] sm:text-[11px] font-medium">Red Empresarial</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 cursor-default">
            <Icon name="Cloud" size={13} />
            <span className="text-[10px] sm:text-[11px] font-medium">Nube</span>
          </div>
        </div>
      </div>
    </div>
  );
}
