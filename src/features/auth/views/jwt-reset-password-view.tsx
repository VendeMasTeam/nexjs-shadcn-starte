'use client';

import Link from 'next/link';
import { useState } from 'react';
import { paths } from 'src/routes/paths';
import { Logo } from 'src/shared/components/Logo';
import { Icon } from 'src/shared/components/ui';
import { Form, FormControl, FormField, FormItem, FormMessage } from 'src/shared/components/ui';

import { useResetPassword } from '../hooks/use-reset-password';

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

function PasswordInput({
  id,
  label,
  disabled,
  placeholder,
  ...field
}: {
  id: string;
  label: string;
  disabled?: boolean;
  placeholder?: string;
  [key: string]: unknown;
}) {
  const [show, setShow] = useState(false);

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
          <Icon name="Lock" size={16} />
        </span>
        <input
          {...field}
          id={id}
          type={show ? 'text' : 'password'}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-10 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <Icon name="EyeOff" size={15} /> : <Icon name="Eye" size={15} />}
        </button>
      </div>
    </div>
  );
}

export function JwtResetPasswordView() {
  const { form, onSubmit, isSubmitting, isValidLink } = useResetPassword();

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 auth-bg-mesh overflow-hidden animate-auth-bg-appear">
      <BgShapes />

      <div className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl px-8 py-10 sm:px-10 auth-floating-shadow animate-auth-form-drop">
        {!isValidLink ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <Icon name="Unlink" size={30} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">
                Enlace inválido
              </h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Este enlace no es válido o ya expiró. Solicitá uno nuevo.
              </p>
            </div>
            <Link
              href={paths.auth.jwt.forgotPassword}
              className="mt-1 w-full h-11 rounded-xl font-semibold text-sm tracking-wide text-white bg-indigo-600 flex items-center justify-center shadow-[0_4px_14px_rgba(67,56,202,0.4)] hover:bg-indigo-500 transition-all"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="mb-6">
                <Logo variant="full" height={120} />
              </div>
              <h1 className="text-[26px] font-bold text-slate-800 tracking-tight leading-tight text-center">
                Nueva contraseña
              </h1>
              <p className="text-sm text-slate-500 mt-1 text-center">
                Elige una contraseña segura de al menos 8 caracteres.
              </p>
            </div>

            {!!form.formState.errors.root && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
                <Icon name="AlertCircle" size={15} className="shrink-0" />
                {form.formState.errors.root.message}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={onSubmit} className="flex flex-col gap-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          id="reset-password"
                          label="Nueva contraseña"
                          placeholder="Mín. 8 caracteres"
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
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          id="reset-confirm-password"
                          label="Confirmar contraseña"
                          placeholder="Repetí tu contraseña"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs ml-1" />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide text-white bg-indigo-600 shadow-[0_4px_14px_rgba(67,56,202,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(67,56,202,0.5)] hover:bg-indigo-500 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Guardando…
                    </>
                  ) : (
                    'Restablecer contraseña'
                  )}
                </button>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
