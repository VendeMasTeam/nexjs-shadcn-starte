'use client';

import Link from 'next/link';
import { paths } from 'src/routes/paths';
import { Logo } from 'src/shared/components/Logo';
import { ThemeToggle } from 'src/shared/components/ThemeToggle';
import { Icon } from 'src/shared/components/ui';
import { Form, FormControl, FormField, FormItem, FormMessage } from 'src/shared/components/ui';

import { useForgotPassword } from '../hooks/use-forgot-password';

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

export function JwtForgotPasswordView() {
  const { form, onSubmit, isSubmitting, emailSent } = useForgotPassword();

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 auth-bg-mesh overflow-hidden animate-auth-bg-appear">
      <BgShapes />

      <ThemeToggle className="absolute top-5 right-5 z-20" />

      <div className="relative z-10 w-full max-w-[420px] bg-card border border-border/60 rounded-2xl px-8 py-10 sm:px-10 auth-floating-shadow animate-auth-form-drop">
        {emailSent ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
              <Icon name="CheckCircle" size={30} className="text-success" />
            </div>
            <div>
              <h1 className="text-[24px] font-bold text-foreground tracking-tight">
                Revisa tu correo
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[300px]">
                Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu
                contraseña.
              </p>
            </div>
            <Link
              href={paths.auth.jwt.signIn}
              className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-indigo-600 transition-colors"
            >
              <Icon name="ChevronLeft" size={14} />
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="mb-6">
                <Logo variant="full" height={68} />
              </div>
              <p className="text-sm text-muted-foreground mt-1 text-center leading-relaxed max-w-[300px]">
                Ingresa tu correo y te enviamos un enlace para recuperarla.
              </p>
            </div>

            {!!form.formState.errors.root && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-sm text-error flex items-center gap-2">
                <Icon name="AlertCircle" size={15} className="shrink-0" />
                {form.formState.errors.root.message}
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
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="forgot-email"
                            className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground"
                          >
                            Correo electrónico
                          </label>
                          <div className="relative group">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-indigo-500 pointer-events-none">
                              <Icon name="Mail" size={16} />
                            </span>
                            <input
                              {...field}
                              id="forgot-email"
                              type="email"
                              placeholder="admin@empresa.com"
                              disabled={isSubmitting}
                              autoFocus
                              className="w-full h-11 pl-10 pr-4 text-sm text-foreground bg-muted/40 border border-border rounded-xl outline-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-muted-foreground/30 hover:bg-background focus:border-indigo-500 focus:bg-background focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
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
                      Enviando…
                    </>
                  ) : (
                    'Enviar enlace'
                  )}
                </button>
              </form>
            </Form>

            <div className="mt-5 text-center">
              <Link
                href={paths.auth.jwt.signIn}
                className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground hover:text-indigo-600 transition-colors"
              >
                <Icon name="ChevronLeft" size={14} />
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
