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
  accumulatedAmount: number;
  userId: string;
  lastUpdateDate: Date;
}

export interface ICreditCardFundCreate {
  monthlyContribution: number;
  accumulatedAmount?: number;
  userId: string;
}

export interface ICreditCardFundUpdate {
  monthlyContribution?: number;
  accumulatedAmount?: number;
}

export interface ISimulationResult {
  canAfford: boolean;
  availableFunds: number;
  requiredFunds: number;
  projectedBalance: number;
  pendingInstallments: number;
  pendingAmount: number;
  suggestedMonthlyContribution?: number;
}
