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
  availableFunds: number; // Fondos disponibles actuales (acumulado + contribución mensual)
  projectedAvailableFunds: number; // Fondos disponibles proyectados (considerando contribuciones futuras)
  requiredFunds: number;
  totalRequiredFunds: number; // Fondo total requerido para toda la duración de las cuotas
  projectedBalance: number; // Balance proyectado mensual
  totalProjectedBalance: number; // Balance proyectado total
  pendingInstallments: number;
  pendingAmount: number;
  suggestedMonthlyContribution?: number;
  suggestedDurationMonths?: number;
}
