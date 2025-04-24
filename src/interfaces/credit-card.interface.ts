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
}
