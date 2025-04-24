export enum InstallmentStatus {
  PENDING = 'pending',
  PAID = 'paid'
}

export interface IInstallment {
  number: number;
  amount: number;
  dueDate: Date;
  status: InstallmentStatus;
}

export interface ICreditCardExpense {
  amount: number;
  description: string;
  purchaseDate: Date;
  totalInstallments: number;
  installments: IInstallment[];
  userId: string;
  isSimulation?: boolean;
}

export interface ICreditCardExpenseCreate {
  amount: number;
  description: string;
  purchaseDate?: Date;
  totalInstallments: number;
  userId: string;
  isSimulation?: boolean;
}

export interface ICreditCardFund {
  monthlyContribution: number;
  maxMonthlyContribution: number;
  accumulatedAmount: number;
  userId: string;
  lastUpdateDate: Date;
}

export interface ICreditCardFundCreate {
  monthlyContribution: number;
  maxMonthlyContribution?: number;
  accumulatedAmount?: number;
  userId: string;
}

export interface ICreditCardFundUpdate {
  monthlyContribution?: number;
  maxMonthlyContribution?: number;
  accumulatedAmount?: number;
}

export interface IMonthlyProjection {
  month: string; // Formato YYYY-MM
  monthLabel: string; // Formato legible (ej: "Abril 2025")
  initialAmount: number; // Monto inicial para este mes (antes de aporte mensual)
  monthlyContribution: number; // Aporte mensual
  accumulatedFunds: number; // Fondos acumulados disponibles para el mes (antes de pagos)
  totalBefore: number; // Total de pagos existentes antes de la simulación
  newPayment: number; // Pago de la nueva cuota ("Aire")
  totalFinal: number; // Total de pagos incluyendo la simulación
  remainingMargin: number; // Margen restante (fondos disponibles - total final)
  balanceAfterPayments: number; // Saldo después de pagar todos los gastos del mes
  status: 'Verde' | 'Rojo'; // Estado: Verde si puede pagar, Rojo si no puede
}

export interface ISimulationResult {
  canAfford: boolean;
  canPayTotal: boolean; // Si puede pagar el total a largo plazo
  availableFunds: number; // Fondos disponibles actuales (acumulado + contribución mensual)
  projectedAvailableFunds: number; // Fondos disponibles proyectados (considerando contribuciones futuras)
  projectedAvailableFundsAtStart: number; // Fondos proyectados para la fecha de inicio de pago
  requiredFunds: number;
  monthlyRequiredFunds: number; // Fondos requeridos mensualmente (existentes + simulación)
  totalRequiredFunds: number; // Fondo total requerido para toda la duración de las cuotas
  projectedBalance: number; // Balance proyectado mensual
  totalProjectedBalance: number; // Balance proyectado total
  pendingInstallments: number;
  pendingAmount: number;
  installmentAmount: number; // Monto de cada cuota de la simulación
  suggestedMonthlyContribution?: number;
  suggestedDurationMonths?: number;
  monthlyProjections: IMonthlyProjection[]; // Proyección mensual detallada
}
