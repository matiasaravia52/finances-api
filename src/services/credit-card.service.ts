import { CreditCardExpense } from '../models/credit-card-expense.model';
import { CreditCardFund } from '../models/credit-card-fund.model';
import { 
  ICreditCardExpense, 
  ICreditCardExpenseCreate, 
  ICreditCardFund, 
  ICreditCardFundCreate, 
  ICreditCardFundUpdate,
  IInstallment,
  InstallmentStatus,
  ISimulationResult
} from '../interfaces/credit-card.interface';

export class CreditCardService {
  // Métodos para el fondo de tarjeta de crédito
  static async getFundByUserId(userId: string): Promise<ICreditCardFund | null> {
    try {
      const fund = await CreditCardFund.findOne({ userId });
      return fund;
    } catch (error) {
      console.error(`Error fetching credit card fund for user ${userId}:`, error);
      throw error;
    }
  }

  static async createOrUpdateFund(userId: string, data: ICreditCardFundCreate | ICreditCardFundUpdate): Promise<ICreditCardFund> {
    try {
      // Intentar encontrar un fondo existente
      const existingFund = await CreditCardFund.findOne({ userId });
      
      if (existingFund) {
        // Actualizar el fondo existente
        existingFund.lastUpdateDate = new Date();
        
        if ('monthlyContribution' in data && data.monthlyContribution !== undefined) {
          existingFund.monthlyContribution = data.monthlyContribution;
        }
        
        if ('accumulatedAmount' in data && data.accumulatedAmount !== undefined) {
          existingFund.accumulatedAmount = data.accumulatedAmount;
        }
        
        return await existingFund.save();
      } else {
        // Crear un nuevo fondo
        const newFundData: ICreditCardFundCreate = {
          monthlyContribution: 'monthlyContribution' in data && data.monthlyContribution !== undefined ? data.monthlyContribution : 0,
          accumulatedAmount: 'accumulatedAmount' in data && data.accumulatedAmount !== undefined ? data.accumulatedAmount : 0,
          userId
        };
        
        const newFund = new CreditCardFund(newFundData);
        return await newFund.save();
      }
    } catch (error) {
      console.error(`Error creating/updating credit card fund for user ${userId}:`, error);
      throw error;
    }
  }

  static async updateAccumulatedAmount(userId: string): Promise<ICreditCardFund | null> {
    try {
      const fund = await CreditCardFund.findOne({ userId });
      
      if (!fund) {
        return null;
      }
      
      const now = new Date();
      const lastUpdate = new Date(fund.lastUpdateDate);
      
      // Calcular cuántos meses han pasado desde la última actualización
      const monthsDiff = (now.getFullYear() - lastUpdate.getFullYear()) * 12 + 
                         (now.getMonth() - lastUpdate.getMonth());
      
      if (monthsDiff > 0) {
        // Actualizar el monto acumulado sumando la contribución mensual por cada mes transcurrido
        fund.accumulatedAmount += fund.monthlyContribution * monthsDiff;
        fund.lastUpdateDate = now;
        
        return await fund.save();
      }
      
      return fund;
    } catch (error) {
      console.error(`Error updating accumulated amount for user ${userId}:`, error);
      throw error;
    }
  }

  // Métodos para los gastos de tarjeta de crédito
  static async getExpensesByUserId(userId: string, includeSimulations: boolean = false): Promise<ICreditCardExpense[]> {
    try {
      const query: any = { userId };
      
      if (!includeSimulations) {
        query.isSimulation = { $ne: true };
      }
      
      return await CreditCardExpense.find(query).sort({ purchaseDate: -1 });
    } catch (error) {
      console.error(`Error fetching credit card expenses for user ${userId}:`, error);
      throw error;
    }
  }

  static async getExpenseById(id: string, userId: string): Promise<ICreditCardExpense | null> {
    try {
      return await CreditCardExpense.findOne({ _id: id, userId });
    } catch (error) {
      console.error(`Error fetching credit card expense ${id} for user ${userId}:`, error);
      throw error;
    }
  }

  static async createExpense(data: ICreditCardExpenseCreate): Promise<ICreditCardExpense> {
    try {
      // Generar las cuotas
      const installments = this.generateInstallments(
        data.amount,
        data.totalInstallments,
        data.purchaseDate || new Date()
      );
      
      const expenseData: ICreditCardExpense = {
        ...data,
        purchaseDate: data.purchaseDate || new Date(),
        installments
      };
      
      const expense = new CreditCardExpense(expenseData);
      return await expense.save();
    } catch (error) {
      console.error('Error creating credit card expense:', error);
      throw error;
    }
  }

  static async updateExpenseStatus(id: string, userId: string, isSimulation: boolean): Promise<ICreditCardExpense | null> {
    try {
      const expense = await CreditCardExpense.findOne({ _id: id, userId });
      
      if (!expense) {
        return null;
      }
      
      expense.isSimulation = isSimulation;
      return await expense.save();
    } catch (error) {
      console.error(`Error updating expense status ${id}:`, error);
      throw error;
    }
  }

  static async updateInstallmentStatus(
    expenseId: string, 
    installmentNumber: number, 
    userId: string, 
    status: InstallmentStatus
  ): Promise<ICreditCardExpense | null> {
    try {
      const expense = await CreditCardExpense.findOne({ _id: expenseId, userId });
      
      if (!expense) {
        return null;
      }
      
      const installment = expense.installments.find(i => i.number === installmentNumber);
      
      if (!installment) {
        return null;
      }
      
      installment.status = status;
      return await expense.save();
    } catch (error) {
      console.error(`Error updating installment status for expense ${expenseId}:`, error);
      throw error;
    }
  }

  static async deleteExpense(id: string, userId: string): Promise<boolean> {
    try {
      const result = await CreditCardExpense.deleteOne({ _id: id, userId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting credit card expense ${id}:`, error);
      throw error;
    }
  }

  // Método para actualizar la fecha de compra y regenerar las cuotas
  static async updatePurchaseDate(id: string, userId: string, purchaseDate: Date): Promise<ICreditCardExpense | null> {
    try {
      const expense = await CreditCardExpense.findOne({ _id: id, userId });
      
      if (!expense) {
        return null;
      }
      
      // Regenerar las cuotas con la nueva fecha de compra
      const installments = this.generateInstallments(
        expense.amount,
        expense.totalInstallments,
        purchaseDate
      );
      
      expense.purchaseDate = purchaseDate;
      expense.installments = installments;
      
      return await expense.save();
    } catch (error) {
      console.error(`Error updating purchase date for expense ${id}:`, error);
      throw error;
    }
  }

  // Método para simular un gasto
  static async simulateExpense(userId: string, amount: number, totalInstallments: number): Promise<ISimulationResult> {
    try {
      // Actualizar el monto acumulado primero
      await this.updateAccumulatedAmount(userId);
      
      // Obtener el fondo del usuario
      const fund = await CreditCardFund.findOne({ userId });
      
      if (!fund) {
        throw new Error('Credit card fund not found for this user');
      }
      
      // Obtener todos los gastos activos (no simulaciones)
      const expenses = await CreditCardExpense.find({ 
        userId, 
        isSimulation: { $ne: true } 
      });
      
      // Calcular el monto total de las cuotas pendientes
      let pendingAmount = 0;
      let pendingInstallments = 0;
      
      expenses.forEach(expense => {
        expense.installments.forEach(installment => {
          if (installment.status === InstallmentStatus.PENDING) {
            pendingAmount += installment.amount;
            pendingInstallments++;
          }
        });
      });
      
      // Calcular el monto por cuota del nuevo gasto
      const installmentAmount = amount / totalInstallments;
      
      // Calcular el monto total necesario para cubrir todas las cuotas pendientes más las nuevas
      const requiredFunds = pendingAmount + (installmentAmount * totalInstallments);
      
      // Calcular el monto disponible (acumulado + contribuciones futuras para el período de las cuotas)
      const availableFunds = fund.accumulatedAmount + (fund.monthlyContribution * totalInstallments);
      
      // Determinar si se puede realizar el gasto
      const canAfford = availableFunds >= requiredFunds;
      
      // Calcular el balance proyectado después de todas las cuotas
      const projectedBalance = availableFunds - requiredFunds;
      
      // Calcular el aporte mensual necesario si no se puede realizar el gasto
      let suggestedMonthlyContribution = 0;
      if (!canAfford) {
        // Calcular cuánto más se necesita por mes para cubrir el gasto
        const deficit = requiredFunds - availableFunds;
        // Sugerir un nuevo aporte mensual que cubra el déficit más un 10% de margen
        suggestedMonthlyContribution = fund.monthlyContribution + (deficit / totalInstallments) * 1.1;
        // Redondear a un número entero para facilidad de uso
        suggestedMonthlyContribution = Math.ceil(suggestedMonthlyContribution);
      }
      
      return {
        canAfford,
        availableFunds,
        requiredFunds,
        projectedBalance,
        pendingInstallments,
        pendingAmount,
        suggestedMonthlyContribution
      };
    } catch (error) {
      console.error(`Error simulating expense for user ${userId}:`, error);
      throw error;
    }
  }

  // Método auxiliar para generar las cuotas
  private static generateInstallments(amount: number, totalInstallments: number, startDate: Date): IInstallment[] {
    const installments: IInstallment[] = [];
    const installmentAmount = amount / totalInstallments;
    
    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(startDate);
      // La primera cuota (i=1) será en el mismo mes seleccionado
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      
      installments.push({
        number: i,
        amount: installmentAmount,
        dueDate,
        status: InstallmentStatus.PENDING
      });
    }
    
    return installments;
  }
}
