'use client';

import { useState } from 'react';
import type { Payment } from 'src/features/sales/types/sales.types';
import { formatMoney, getCurrencyPreferences } from 'src/lib/currency';
import { Button } from 'src/shared/components/ui/button';
import { DateInput } from 'src/shared/components/ui/date-input';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';

interface RegisterPaymentDrawerProps {
  open: boolean;
  onClose: () => void;
  pendingBalance: number;
  onConfirm: (payment: Omit<Payment, 'uid'>) => void;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'Transferencia Bancaria', label: 'Transferencia Bancaria' },
  { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
  { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Cheque', label: 'Cheque' },
];

export function RegisterPaymentDrawer({
  open,
  onClose,
  pendingBalance,
  onConfirm,
}: RegisterPaymentDrawerProps) {
  const { currency } = getCurrencyPreferences('tenant');
  const [form, setForm] = useState({
    method: 'Transferencia Bancaria',
    payment_date: new Date().toISOString().split('T')[0],
    external_reference: '',
    amount: String(pendingBalance.toFixed(2)),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.method) newErrors.method = 'Selecciona un método de pago';
    if (!form.payment_date) newErrors.date = 'La fecha es requerida';
    const amountVal = Number(form.amount);
    if (!form.amount || amountVal <= 0) newErrors.amount = 'El monto debe ser mayor a 0';
    if (amountVal > pendingBalance)
      newErrors.amount = 'El monto no puede superar el saldo pendiente';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    onConfirm({
      method: form.method,
      payment_date: form.payment_date,
      external_reference: form.external_reference || undefined,
      amount: Number(Number(form.amount).toFixed(2)),
      invoice_uid: '',
      meta: {},
    });
    setLoading(false);
    onClose();
  };

  const handleClose = () => {
    setForm({
      method: 'Transferencia Bancaria',
      payment_date: new Date().toISOString().split('T')[0],
      external_reference: '',
      amount: String(pendingBalance.toFixed(2)),
    });
    setErrors({});
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className="sm:max-w-[440px] flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle className="text-h6">Registrar Pago</SheetTitle>
          <SheetDescription>Registra un nuevo pago para esta factura.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Saldo pendiente */}
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
            <p className="text-xs font-medium text-warning/80 uppercase tracking-wide mb-1">
              Saldo Pendiente Actual
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatMoney(pendingBalance, {
                scope: 'tenant',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* Método de pago */}
          <SelectField
            label="Método de Pago"
            required
            options={PAYMENT_METHOD_OPTIONS}
            value={form.method}
            onChange={(v) => setForm((p) => ({ ...p, method: v as string }))}
            error={errors.method}
          />

          {/* Fecha de pago */}
          <DateInput
            label="Fecha de Pago"
            required
            value={form.payment_date}
            onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))}
            error={errors.date ?? errors.payment_date}
          />

          {/* Referencia */}
          <Input
            label="Referencia"
            placeholder="ej: TRF-2024-0099 (opcional)"
            value={form.external_reference}
            onChange={(e) => setForm((p) => ({ ...p, external_reference: e.target.value }))}
          />

          {/* Monto */}
          <Input
            label="Monto del Pago"
            required
            type="number"
            min={0.01}
            max={pendingBalance}
            step={0.01}
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            error={errors.amount}
            leftIcon={<span className="text-sm font-medium text-muted-foreground">{currency}</span>}
            inputClassName="pl-14"
          />
        </div>

        <SheetFooter className="px-6 pb-6">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button color="primary" onClick={handleConfirm} loading={loading} className="flex-1">
            Confirmar Pago
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
