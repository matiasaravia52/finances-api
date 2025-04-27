import { 
  ICreditCardFund, 
  ICreditCardExpenseCreate, 
  ISimulationResult,
  IInstallment
} from '../credit-card.interface';

export interface IExpenseCalculator {
  simulateExpense(fund: ICreditCardFund, expense: ICreditCardExpenseCreate): Promise<ISimulationResult>;
  calculateInstallments(amount: number, installments: number, startDate: Date): IInstallment[];
}
