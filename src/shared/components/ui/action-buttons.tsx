'use client';

import * as React from 'react';
import { cn } from 'src/lib/utils';

import { Button, type ButtonProps } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Icon } from './icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

// ─── Base icon button (cursor + hover + active scale) ─────────────────────────

export interface IconActionButtonProps extends Omit<ButtonProps, 'size' | 'variant'> {
  tooltip?: string;
}

export function IconActionButton({
  tooltip,
  className,
  children,
  ...props
}: IconActionButtonProps & { children: React.ReactNode }) {
  const btn = (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        'cursor-pointer text-muted-foreground transition-all duration-150 active:scale-90',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );

  if (!tooltip) return btn;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── EditButton ───────────────────────────────────────────────────────────────

export function EditButton({ tooltip = 'Editar', className, ...props }: IconActionButtonProps) {
  return (
    <IconActionButton
      tooltip={tooltip}
      className={cn('hover:text-primary hover:bg-primary/10', className)}
      {...props}
    >
      <Icon name="Pencil" size={14} />
    </IconActionButton>
  );
}

// ─── DeleteButton ─────────────────────────────────────────────────────────────

export function DeleteButton({ tooltip = 'Eliminar', className, ...props }: IconActionButtonProps) {
  return (
    <IconActionButton
      tooltip={tooltip}
      className={cn('hover:text-error hover:bg-error/10', className)}
      {...props}
    >
      <Icon name="Trash2" size={14} />
    </IconActionButton>
  );
}

// ─── ViewButton ───────────────────────────────────────────────────────────────

export function ViewButton({
  tooltip = 'Ver detalle',
  className,
  ...props
}: IconActionButtonProps) {
  return (
    <IconActionButton
      tooltip={tooltip}
      className={cn('hover:text-info hover:bg-info/10', className)}
      {...props}
    >
      <Icon name="Eye" size={14} />
    </IconActionButton>
  );
}

// ─── MoreActionsMenu ──────────────────────────────────────────────────────────

export interface MoreActionsItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  color?: 'default' | 'error' | 'warning' | 'primary';
  disabled?: boolean;
  separator?: boolean;
}

interface MoreActionsMenuProps {
  items: MoreActionsItem[];
  orientation?: 'vertical' | 'horizontal';
  tooltip?: string;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  default: 'text-foreground',
  primary: 'text-primary focus:text-primary focus:bg-primary/10',
  warning: 'text-warning focus:text-warning focus:bg-warning/10',
  error: 'text-error focus:text-error focus:bg-error/10',
};

export function MoreActionsMenu({
  items,
  orientation = 'vertical',
  tooltip = 'Más acciones',
  className,
}: MoreActionsMenuProps) {
  const triggerIcon =
    orientation === 'vertical' ? ('MoreVertical' as const) : ('MoreHorizontal' as const);

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  'cursor-pointer text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-90',
                  className
                )}
              >
                <Icon name={triggerIcon} size={15} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="min-w-40">
        {items.map((item, i) => (
          <DropdownMenuItem
            key={i}
            onClick={item.onClick}
            disabled={item.disabled}
            className={cn('cursor-pointer gap-2 text-sm', COLOR_MAP[item.color ?? 'default'])}
          >
            {item.icon && <span className="size-4 flex items-center">{item.icon}</span>}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
