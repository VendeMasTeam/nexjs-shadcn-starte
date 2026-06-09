import { ReactNode } from 'react';
import { cn } from 'src/lib/utils';

export { SectionCard, SectionCardHeader, StatsCard } from '../ui/section-card';

// ─────────────────────────────────────────────────────────────────────────────
// PageContainer — contenedor estándar de todas las páginas
//
// Uso:
//   <PageContainer>
//     <PageHeader title="..." subtitle="..." />
//     ...contenido...
//   </PageContainer>
// ─────────────────────────────────────────────────────────────────────────────
interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** true = sin padding máx-width, útil para páginas full-width */
  fluid?: boolean;
}

export function PageContainer({ children, className, fluid = false }: PageContainerProps) {
  return (
    <div className={cn('p-6 md:p-8 space-y-6', !fluid && 'max-w-[1400px] mx-auto', className)}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PageHeader — título + subtítulo + acciones de página
//
// Uso:
//   <PageHeader
//     title="Gestión de Productos"
//     subtitle="Administra el catálogo completo"
//     action={<Button color="primary">Nuevo producto</Button>}
//   />
// ─────────────────────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-h4 text-foreground mb-1">{title}</h1>
        {subtitle && <p className="text-body2 text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
