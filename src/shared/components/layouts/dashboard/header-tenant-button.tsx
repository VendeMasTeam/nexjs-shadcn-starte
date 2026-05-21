'use client';

import type { TenantInfo } from 'src/shared/auth/types';
import { Icon } from 'src/shared/components/ui';

type Props = {
  tenant: TenantInfo | null;
};

export function HeaderTenantButton({ tenant }: Props) {
  if (!tenant?.name) return null;

  return (
    <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="size-8 shrink-0 flex items-center justify-center bg-muted rounded-md">
        <Icon name="Building2" size={16} className="text-muted-foreground" />
      </div>

      {/* Name */}
      <span className="hidden sm:block text-sm font-medium text-foreground truncate max-w-[140px]">
        {tenant.name}
      </span>

      {/* Plan badge */}
      <span className="hidden sm:block text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
        {tenant.plan}
      </span>

      {/* Chevron */}
      <Icon
        name="ChevronDown"
        size={13}
        className="hidden sm:block text-muted-foreground shrink-0"
      />
    </button>
  );
}
