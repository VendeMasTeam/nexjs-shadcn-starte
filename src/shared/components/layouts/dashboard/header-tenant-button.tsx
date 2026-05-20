'use client';

import type { TenantInfo } from 'src/shared/auth/types';
import { Icon } from 'src/shared/components/ui';

type Props = {
  tenant: TenantInfo | null;
};

export function HeaderTenantButton({ tenant }: Props) {
  if (!tenant?.name) return null;

  const initials = tenant.name.slice(0, 2).toUpperCase();

  return (
    <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {/* Hex icon */}
      <div className="relative size-8 shrink-0">
        <div
          className="absolute inset-0 bg-gradient-to-br from-violet-500 to-blue-500"
          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white z-10">
          {initials}
        </span>
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
