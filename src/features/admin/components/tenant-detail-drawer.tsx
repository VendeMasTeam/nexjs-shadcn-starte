'use client';

import { useEffect, useState } from 'react';
import { TenantStatusBadge } from 'src/features/admin/components/tenant-status-badge';
import { tenantsService } from 'src/features/admin/services/tenants.service';
import {
  Tenant,
  TenantActividadItem,
  TenantFacturaItem,
  TenantUser,
} from 'src/features/admin/types/admin.types';
import { formatMoney } from 'src/lib/currency';
import { diffDays, formatDate, formatRelative } from 'src/lib/date';
import { Avatar, AvatarFallback } from 'src/shared/components/ui/avatar';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { PaginationControl } from 'src/shared/components/ui/pagination-control';
import { Progress } from 'src/shared/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/shared/components/ui/tabs';

interface TenantDetailDrawerProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSuspend?: (tenant: Tenant) => void;
  onActivate?: (tenant: Tenant) => void;
  onArchive?: (tenant: Tenant) => void;
  onRestore?: (tenant: Tenant) => void;
  onCreateUser: (
    tenantId: string,
    data: { name: string; email: string; role: string }
  ) => Promise<{ reset_email_sent: boolean }>;
}

function getInitials(nombre: string) {
  return (nombre ?? '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
function getDaysSince(dateStr: string) {
  return diffDays(dateStr);
}

export function TenantDetailDrawer({
  tenant,
  isOpen,
  onClose,
  onSuspend,
  onActivate,
  onArchive,
  onRestore,
  onCreateUser,
}: TenantDetailDrawerProps) {
  const [confirmandoSuspension, setConfirmandoSuspension] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userCreatedMsg, setUserCreatedMsg] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<TenantUser[]>([]);
  const [facturas, setFacturas] = useState<TenantFacturaItem[]>([]);
  const [actividad, setActividad] = useState<TenantActividadItem[]>([]);
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [lockingUser, setLockingUser] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const PER_PAGE = 5;

  useEffect(() => {
    if (tenant && isOpen) {
      setUsuarios([]);
      setFacturas([]);
      setActividad([]);
      setUserCreatedMsg(null);
      setNewUserName('');
      setNewUserEmail('');
      setUsersPage(1);
    }
  }, [tenant, isOpen]);

  const cargarUsuarios = async (page = 1) => {
    if (!tenant) return;
    setLoadingTab('usuarios');
    try {
      const payload = await tenantsService.getUsers(tenant.uid, page, PER_PAGE);
      const data = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setUsuarios(data as TenantUser[]);
      setUsersTotal(payload?.meta?.total ?? (Array.isArray(payload) ? payload.length : 0));
      setUsersPage(page);
    } finally {
      setLoadingTab(null);
    }
  };

  const cargar = async (
    tab: string,
    fetcher: () => Promise<unknown[]>,
    setter: (d: never[]) => void,
    current: unknown[]
  ) => {
    if (!tenant || current.length > 0) return;
    setLoadingTab(tab);
    try {
      setter((await fetcher()) as never[]);
    } finally {
      setLoadingTab(null);
    }
  };

  if (!tenant) return null;
  const userPct =
    tenant.limite_usuarios > 0
      ? Math.round((tenant.total_usuarios / tenant.limite_usuarios) * 100)
      : 0;
  const storagePct =
    tenant.limite_almacenamiento_gb > 0
      ? Math.round((tenant.almacenamiento_usado_gb / tenant.limite_almacenamiento_gb) * 100)
      : 0;
  const dias = getDaysSince(tenant.created_at);

  const handleClose = () => {
    setConfirmandoSuspension(false);
    setTextoConfirmacion('');
    setNewUserName('');
    setNewUserEmail('');
    setUserCreatedMsg(null);
    onClose();
  };
  const handleSuspend = () => {
    onSuspend?.(tenant);
    setConfirmandoSuspension(false);
    setTextoConfirmacion('');
    onClose();
  };
  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    setCreatingUser(true);
    try {
      const result = await onCreateUser(tenant.uid, {
        name: newUserName,
        email: newUserEmail,
        role: 'owner',
      });
      setUserCreatedMsg(
        result.reset_email_sent
          ? 'Usuario creado. Se envió el link de acceso al email.'
          : 'Usuario creado, pero no se pudo enviar el email. Envía el acceso manualmente.'
      );
      setNewUserName('');
      setNewUserEmail('');
      setUsuarios([]);
    } catch {
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="text-sm bg-blue-100 text-blue-700 font-bold">
                {getInitials(tenant.nombre)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-h6 truncate">{tenant.nombre}</SheetTitle>
              <SheetDescription className="text-caption text-muted-foreground">
                {tenant.dominio}
              </SheetDescription>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <TenantStatusBadge estado={tenant.estado} />
                <Badge variant="outline" className="text-xs">
                  {tenant.plan_nombre}
                </Badge>
                <span className="text-caption text-muted-foreground">
                  Desde {formatDate(tenant.created_at)}
                </span>
                {tenant.estado === 'TRIAL' && tenant.expires_at && (
                  <Badge variant="soft" className="text-xs bg-amber-100 text-amber-700">
                    Trial vence {formatDate(tenant.expires_at)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {confirmandoSuspension ? (
            <div className="p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Icon name="AlertTriangle" className="h-6 w-6 text-red-600 shrink-0" />
                  <h3 className="font-semibold text-red-700 text-body2">
                    ¿Suspender a &quot;{tenant.nombre}&quot;?
                  </h3>
                </div>
                <p className="text-body2 text-red-600 mb-5">
                  Esta acción bloqueará el acceso de todos sus usuarios al sistema de forma
                  inmediata.
                </p>
                <Input
                  value={textoConfirmacion}
                  onChange={(e) => setTextoConfirmacion(e.target.value)}
                  label='Escribe "SUSPENDER" para confirmar:'
                  placeholder="SUSPENDER"
                />
              </div>
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setConfirmandoSuspension(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={textoConfirmacion !== 'SUSPENDER'}
                  onClick={handleSuspend}
                >
                  Confirmar Suspensión
                </Button>
              </div>
            </div>
          ) : (
            <Tabs
              defaultValue="resumen"
              className="flex flex-col h-full"
              onValueChange={(val) => {
                if (val === 'usuarios') cargarUsuarios();
                if (val === 'facturas')
                  cargar(
                    'facturas',
                    () => tenantsService.getFacturas(tenant.uid),
                    setFacturas as never,
                    facturas
                  );
                if (val === 'actividad')
                  cargar(
                    'actividad',
                    () => tenantsService.getActividad(tenant.uid),
                    setActividad as never,
                    actividad
                  );
              }}
            >
              <TabsList className="mx-6 mt-4 mb-2 w-auto self-start">
                <TabsTrigger value="resumen">Resumen</TabsTrigger>
                <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
                <TabsTrigger value="facturas">Facturas</TabsTrigger>
                <TabsTrigger value="actividad">Actividad</TabsTrigger>
              </TabsList>

              <TabsContent value="resumen" className="px-6 pb-6 space-y-5">
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <div className="flex justify-center mb-1">
                      <Icon name="Users" className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-h6 font-bold text-foreground">{tenant.total_usuarios}</p>
                    <p className="text-caption text-muted-foreground">Usuarios activos</p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <div className="flex justify-center mb-1">
                      <Icon name="DollarSign" className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-h6 font-bold text-foreground">
                      {formatMoney(tenant.mrr, { scope: 'platform', maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-caption text-muted-foreground">MRR</p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <div className="flex justify-center mb-1">
                      <Icon name="Calendar" className="h-4 w-4 text-purple-600" />
                    </div>
                    <p className="text-h6 font-bold text-foreground">{dias}</p>
                    <p className="text-caption text-muted-foreground">Días activo</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-body2 font-semibold text-foreground">Uso de recursos</h3>
                  <div>
                    <div className="flex justify-between text-caption text-muted-foreground mb-1">
                      <span className="flex items-center gap-1.5">
                        <Icon name="Users" className="h-3.5 w-3.5" /> Usuarios
                      </span>
                      <span>
                        {tenant.total_usuarios} / {tenant.limite_usuarios} ({userPct}%)
                      </span>
                    </div>
                    <Progress value={userPct} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-caption text-muted-foreground mb-1">
                      <span className="flex items-center gap-1.5">
                        <Icon name="HardDrive" className="h-3.5 w-3.5" /> Almacenamiento
                      </span>
                      <span>
                        {tenant.almacenamiento_usado_gb} / {tenant.limite_almacenamiento_gb} GB (
                        {storagePct}%)
                      </span>
                    </div>
                    <Progress value={storagePct} className="h-2" />
                  </div>
                </div>
                {(onSuspend || onActivate || onArchive || onRestore) && (
                  <div className="pt-4 border-t border-border/40 flex flex-col gap-2">
                    {tenant.estado === 'ARCHIVADO' ? (
                      onRestore && (
                        <Button
                          variant="outline"
                          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => onRestore(tenant)}
                        >
                          <Icon name="RefreshCw" className="h-4 w-4 mr-2" />
                          Restaurar Tenant
                        </Button>
                      )
                    ) : (
                      <>
                        {tenant.estado === 'SUSPENDIDO'
                          ? onActivate && (
                              <Button
                                variant="outline"
                                className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                                onClick={() => onActivate(tenant)}
                              >
                                <Icon name="CheckCircle" className="h-4 w-4 mr-2" />
                                Activar Tenant
                              </Button>
                            )
                          : onSuspend && (
                              <Button
                                variant="outline"
                                className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                onClick={() => setConfirmandoSuspension(true)}
                              >
                                <Icon name="AlertTriangle" className="h-4 w-4 mr-2" />
                                Suspender Tenant
                              </Button>
                            )}
                        {onArchive && (
                          <Button
                            variant="outline"
                            className="w-full text-muted-foreground hover:text-foreground"
                            onClick={() => onArchive(tenant)}
                          >
                            <Icon name="Minus" className="h-4 w-4 mr-2" />
                            Archivar Tenant
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="usuarios" className="px-6 pb-6 space-y-4">
                {userCreatedMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 mt-2">
                    <Icon name="CheckCircle2" className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-body2 text-emerald-700">{userCreatedMsg}</p>
                  </div>
                )}
                <div className="mt-2">
                  <h3 className="text-body2 font-semibold text-foreground mb-1">Crear usuario</h3>
                  <p className="text-caption text-muted-foreground mb-4">
                    El usuario recibirá un email para establecer su contraseña.
                  </p>
                  <div className="space-y-3 mb-6">
                    <Input
                      label="Nombre completo"
                      placeholder="Juan Pérez"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="juan@empresa.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      disabled={!newUserName.trim() || !newUserEmail.trim() || creatingUser}
                      onClick={handleCreateUser}
                    >
                      {creatingUser ? (
                        <>
                          <Icon name="Loader2" className="h-4 w-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Icon name="UserPlus" className="h-4 w-4 mr-2" />
                          Crear usuario
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="border-t border-border/40 pt-4">
                  <h3 className="text-body2 font-semibold text-foreground mb-3">
                    Usuarios del tenant
                  </h3>
                  {loadingTab === 'usuarios' ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Icon name="Loader2" className="h-5 w-5 mr-2 animate-spin" />
                      Cargando...
                    </div>
                  ) : usuarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                      <Icon name="Users" className="h-8 w-8 opacity-30" />
                      <p className="text-body2">Sin datos de usuarios</p>
                      <p className="text-caption">No se encontraron usuarios en este tenant.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/40">
                              <th className="text-left py-2 text-caption font-semibold text-muted-foreground">
                                Usuario
                              </th>
                              <th className="text-left py-2 text-caption font-semibold text-muted-foreground">
                                Rol
                              </th>
                              <th className="text-left py-2 text-caption font-semibold text-muted-foreground">
                                Último acceso
                              </th>
                              <th className="text-left py-2 text-caption font-semibold text-muted-foreground">
                                Estado
                              </th>
                              <th className="py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {usuarios.map((u) => {
                              const isLocking = lockingUser === u.uid;
                              const isActive = u.estado === 'Activo';
                              return (
                                <tr key={u.uid} className="border-b border-border/20">
                                  <td className="py-2.5">
                                    <p className="font-medium text-foreground text-body2">
                                      {u.name}
                                    </p>
                                    <p className="text-caption text-muted-foreground">{u.email}</p>
                                  </td>
                                  <td className="py-2.5 text-body2 text-muted-foreground">
                                    {u.rol}
                                  </td>
                                  <td className="py-2.5 text-body2 text-muted-foreground">
                                    {formatRelative(u.ultimo_acceso)}
                                  </td>
                                  <td className="py-2.5">
                                    <Badge
                                      variant="soft"
                                      className={
                                        isActive
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-gray-100 text-gray-500'
                                      }
                                    >
                                      {u.estado}
                                    </Badge>
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={isLocking}
                                      className={
                                        isActive
                                          ? 'text-red-500 hover:text-red-600 hover:bg-red-50 text-xs'
                                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs'
                                      }
                                      onClick={async () => {
                                        if (!tenant) return;
                                        setLockingUser(u.uid);
                                        try {
                                          if (isActive) {
                                            await tenantsService.lockUser(tenant.uid, u.uid);
                                          } else {
                                            await tenantsService.unlockUser(tenant.uid, u.uid);
                                          }
                                          await cargarUsuarios(usersPage);
                                        } finally {
                                          setLockingUser(null);
                                        }
                                      }}
                                    >
                                      {isLocking ? (
                                        <Icon name="Loader2" className="h-3.5 w-3.5 animate-spin" />
                                      ) : isActive ? (
                                        'Bloquear'
                                      ) : (
                                        'Desbloquear'
                                      )}
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {usersTotal > PER_PAGE && (
                        <PaginationControl
                          page={usersPage}
                          totalPages={Math.ceil(usersTotal / PER_PAGE)}
                          total={usersTotal}
                          pageSize={PER_PAGE}
                          onPageChange={cargarUsuarios}
                        />
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="facturas" className="px-6 pb-6">
                {loadingTab === 'facturas' ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Icon name="Loader2" className="h-5 w-5 mr-2 animate-spin" />
                    Cargando...
                  </div>
                ) : facturas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <Icon name="Activity" className="h-8 w-8 opacity-30" />
                    <p className="text-body2">Sin facturas disponibles</p>
                    <p className="text-caption">Este tenant aún no tiene facturas registradas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40">
                          <th className="text-left py-2 text-caption font-semibold text-muted-foreground">
                            Periodo
                          </th>
                          <th className="text-left py-2 text-caption font-semibold text-muted-foreground">
                            Monto
                          </th>
                          <th className="text-left py-2 text-caption font-semibold text-muted-foreground">
                            Estado
                          </th>
                          <th className="text-left py-2 text-caption font-semibold text-muted-foreground">
                            Vencimiento
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturas.map((f, i) => (
                          <tr key={i} className="border-b border-border/20">
                            <td className="py-2.5 text-body2 text-foreground">{f.periodo}</td>
                            <td className="py-2.5 font-semibold text-foreground">
                              {formatMoney(f.total, {
                                scope: 'platform',
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="py-2.5">
                              <Badge
                                variant="soft"
                                className={
                                  f.status === 'PAGADA'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : f.status === 'VENCIDA'
                                      ? 'bg-red-100 text-red-700'
                                      : f.status === 'PENDIENTE'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-gray-100 text-gray-400'
                                }
                              >
                                {f.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-body2 text-muted-foreground">
                              {f.due_at ? formatDate(f.due_at) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="actividad" className="px-6 pb-6">
                {loadingTab === 'actividad' ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Icon name="Loader2" className="h-5 w-5 mr-2 animate-spin" />
                    Cargando...
                  </div>
                ) : actividad.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <Icon name="Clock" className="h-8 w-8 opacity-30" />
                    <p className="text-body2">Sin actividad reciente</p>
                    <p className="text-caption">No se ha registrado actividad para este tenant.</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-2">
                    {actividad.map((ev, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <div>
                          <p className="text-body2 text-foreground">{ev.message}</p>
                          <p className="text-caption text-muted-foreground font-mono">
                            {ev.timestamp ? formatDate(ev.timestamp) : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
        <SheetFooter className="border-t border-border/40 px-6 py-4">
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
