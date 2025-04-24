import { CreditCardFund } from '../models/credit-card-fund.model';
import { CreditCardExpense } from '../models/credit-card-expense.model';
import { 
  ICreditCardFund, 
  ICreditCardFundCreate, 
  ICreditCardFundUpdate,
  ICreditCardExpense,
  ICreditCardExpenseCreate,
  IInstallment,
  InstallmentStatus,
  ISimulationResult,
  IMonthlyProjection
} from '../interfaces/credit-card.interface';

export class CreditCardService {
  // Método para obtener el fondo de tarjeta de crédito de un usuario
  static async getFund(userId: string): Promise<ICreditCardFund | null> {
    try {
      return await CreditCardFund.findOne({ userId });
    } catch (error) {
      console.error(`Error fetching credit card fund for user ${userId}:`, error);
      throw error;
    }
  }

  // Método para crear un fondo de tarjeta de crédito
  static async createFund(fundData: ICreditCardFundCreate): Promise<ICreditCardFund> {
    try {
      // Verificar si ya existe un fondo para este usuario
      const existingFund = await CreditCardFund.findOne({ userId: fundData.userId });
      
      if (existingFund) {
        throw new Error('Credit card fund already exists for this user');
      }
      
      // Si no se proporciona un valor para maxMonthlyContribution, usar el doble de la contribución mensual
      if (!fundData.maxMonthlyContribution) {
        fundData.maxMonthlyContribution = fundData.monthlyContribution * 2;
      }
      
      // Si no se proporciona un valor para accumulatedAmount, usar 0
      if (fundData.accumulatedAmount === undefined) {
        fundData.accumulatedAmount = 0;
      }
      
      const fund = new CreditCardFund(fundData);
      return await fund.save();
    } catch (error) {
      console.error('Error creating credit card fund:', error);
      throw error;
    }
  }

  // Método para actualizar un fondo de tarjeta de crédito
  static async updateFund(userId: string, updateData: ICreditCardFundUpdate): Promise<ICreditCardFund | null> {
    try {
      // Verificar si existe el fondo
      const fund = await CreditCardFund.findOne({ userId });
      
      if (!fund) {
        throw new Error('Credit card fund not found for this user');
      }
      
      // Actualizar los campos proporcionados
      if (updateData.monthlyContribution !== undefined) {
        fund.monthlyContribution = updateData.monthlyContribution;
      }
      
      if (updateData.maxMonthlyContribution !== undefined) {
        fund.maxMonthlyContribution = updateData.maxMonthlyContribution;
      }
      
      if (updateData.accumulatedAmount !== undefined) {
        fund.accumulatedAmount = updateData.accumulatedAmount;
      }
      
      // Actualizar la fecha de última actualización
      fund.lastUpdateDate = new Date();
      
      return await fund.save();
    } catch (error) {
      console.error(`Error updating credit card fund for user ${userId}:`, error);
      throw error;
    }
  }

  // Método para obtener todos los gastos de tarjeta de crédito de un usuario
  static async getExpenses(userId: string): Promise<ICreditCardExpense[]> {
    try {
      return await CreditCardExpense.find({ userId }).sort({ purchaseDate: -1 });
    } catch (error) {
      console.error(`Error fetching credit card expenses for user ${userId}:`, error);
      throw error;
    }
  }

  // Método para obtener un gasto específico por ID
  static async getExpenseById(id: string): Promise<ICreditCardExpense | null> {
    try {
      return await CreditCardExpense.findById(id);
    } catch (error) {
      console.error(`Error fetching credit card expense with ID ${id}:`, error);
      throw error;
    }
  }

  // Método para crear un nuevo gasto de tarjeta de crédito
  static async createExpense(expenseData: ICreditCardExpenseCreate): Promise<ICreditCardExpense> {
    try {
      // Verificar si existe el fondo
      const fund = await CreditCardFund.findOne({ userId: expenseData.userId });
      
      if (!fund) {
        throw new Error('Credit card fund not found for this user');
      }
      
      // Si es una simulación, simplemente crear el gasto
      if (expenseData.isSimulation) {
        const expense = new CreditCardExpense(expenseData);
        
        // Generar las cuotas
        expense.installments = CreditCardService.generateInstallments(
          expenseData.amount,
          expenseData.totalInstallments,
          expenseData.purchaseDate || new Date()
        );
        
        return await expense.save();
      }
      
      // Si no es una simulación, verificar si hay fondos suficientes
      // Simular el gasto primero
      const simulationResult = await CreditCardService.simulateExpense(
        expenseData.userId,
        expenseData.amount,
        expenseData.totalInstallments,
        expenseData.purchaseDate
      );
      
      if (!simulationResult.canAfford) {
        throw new Error('Insufficient funds to create this expense');
      }
      
      // Crear el gasto
      const expense = new CreditCardExpense(expenseData);
      
      // Generar las cuotas
      expense.installments = CreditCardService.generateInstallments(
        expenseData.amount,
        expenseData.totalInstallments,
        expenseData.purchaseDate || new Date()
      );
      
      return await expense.save();
    } catch (error) {
      console.error('Error creating credit card expense:', error);
      throw error;
    }
  }

  // Método para ejecutar un gasto simulado
  static async executeExpense(id: string): Promise<ICreditCardExpense> {
    try {
      // Obtener el gasto
      const expense = await CreditCardExpense.findById(id);
      
      if (!expense) {
        throw new Error('Credit card expense not found');
      }
      
      // Verificar que sea una simulación
      if (!expense.isSimulation) {
        throw new Error('This expense is not a simulation');
      }
      
      // Cambiar el estado de simulación
      expense.isSimulation = false;
      
      return await expense.save();
    } catch (error) {
      console.error(`Error executing simulated expense ${id}:`, error);
      throw error;
    }
  }

  // Método para eliminar un gasto
  static async deleteExpense(id: string): Promise<boolean> {
    try {
      const result = await CreditCardExpense.deleteOne({ _id: id });
      return result.deletedCount === 1;
    } catch (error) {
      console.error(`Error deleting credit card expense ${id}:`, error);
      throw error;
    }
  }

  // Método para actualizar el estado de una cuota
  static async updateInstallmentStatus(
    id: string,
    installmentNumber: number,
    status: InstallmentStatus
  ): Promise<ICreditCardExpense> {
    try {
      // Obtener el gasto
      const expense = await CreditCardExpense.findById(id);
      
      if (!expense) {
        throw new Error('Credit card expense not found');
      }
      
      // Encontrar la cuota
      const installment = expense.installments.find(i => i.number === installmentNumber);
      
      if (!installment) {
        throw new Error(`Installment ${installmentNumber} not found`);
      }
      
      // Actualizar el estado
      installment.status = status;
      
      // Si estamos marcando como pagada, actualizar el fondo acumulado
      if (status === InstallmentStatus.PAID) {
        // Obtener el fondo
        const fund = await CreditCardFund.findOne({ userId: expense.userId });
        
        if (fund) {
          // Si el fondo existe, actualizar el monto acumulado
          // Restamos el monto de la cuota porque ya se pagó
          fund.accumulatedAmount = Math.max(0, fund.accumulatedAmount - installment.amount);
          await fund.save();
        }
      }
      
      return await expense.save();
    } catch (error) {
      console.error(`Error updating installment status for expense ${id}:`, error);
      throw error;
    }
  }

  // Método para actualizar la fecha de compra de un gasto
  static async updatePurchaseDate(id: string, purchaseDate: Date): Promise<ICreditCardExpense> {
    try {
      // Obtener el gasto
      const expense = await CreditCardExpense.findById(id);
      
      if (!expense) {
        throw new Error('Credit card expense not found');
      }
      
      // Regenerar las cuotas con la nueva fecha
      const installments = CreditCardService.generateInstallments(
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
  static async simulateExpense(userId: string, amount: number, totalInstallments: number, startDate?: Date): Promise<ISimulationResult> {
    try {
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
      
      // Calcular el monto por cuota del nuevo gasto simulado
      const installmentAmount = amount / totalInstallments;
      
      // Calcular el total de cuotas pendientes existentes
      let pendingAmount = 0;
      let pendingInstallments = 0;
      
      // Fecha para calcular los meses de las cuotas
      const baseDate = new Date();
      // Usar la fecha de inicio proporcionada o la fecha actual
      const simulationStartDate = startDate ? new Date(startDate) : new Date(baseDate);
      
      console.log(`Fecha de inicio de pago: ${simulationStartDate.toISOString().split('T')[0]}`);
      
      // Crear una lista de los meses para la simulación
      const simulationMonths = [];
      for (let i = 0; i < Math.max(12, totalInstallments + 3); i++) {
        const simulationDate = new Date(baseDate);
        simulationDate.setMonth(simulationDate.getMonth() + i);
        simulationMonths.push(`${simulationDate.getFullYear()}-${simulationDate.getMonth()}`);
      }
      
      // Calcular los fondos disponibles mes a mes
      const monthlyAvailableFunds: Record<string, number> = {};
      
      // Inicializar con el saldo acumulado actual
      monthlyAvailableFunds[`${baseDate.getFullYear()}-${baseDate.getMonth()}`] = fund.accumulatedAmount;
      
      // Propagar el efecto a los meses siguientes, añadiendo la contribución mensual
      for (let i = 1; i < simulationMonths.length; i++) {
        const currentMonth = simulationMonths[i];
        const previousMonth = simulationMonths[i - 1];
        
        // Obtener el saldo del mes anterior
        const previousBalance = monthlyAvailableFunds[previousMonth] || 0;
        
        // Añadir la contribución mensual
        monthlyAvailableFunds[currentMonth] = previousBalance + fund.monthlyContribution;
      }
      
      // Crear un mapa para los pagos existentes por mes
      const existingMonthlyPayments: Record<string, number> = {};
      
      // Agregar las cuotas pendientes existentes al mapa mensual
      expenses.forEach(expense => {
        expense.installments.forEach(installment => {
          if (installment.status === InstallmentStatus.PENDING) {
            // Contar para estadísticas
            pendingInstallments++;
            pendingAmount += installment.amount;
            
            // Obtener el mes y año de la fecha de vencimiento
            const dueDate = new Date(installment.dueDate);
            const monthKey = `${dueDate.getFullYear()}-${dueDate.getMonth()}`;
            
            // Sumar al mapa de pagos existentes
            existingMonthlyPayments[monthKey] = (existingMonthlyPayments[monthKey] || 0) + installment.amount;
          }
        });
      });
      
      // Crear un mapa para los pagos de la simulación
      const simulationMonthlyPayments: Record<string, number> = {};
      
      // Agregar las cuotas de la simulación al mapa mensual
      for (let i = 0; i < totalInstallments; i++) {
        // Calcular la fecha de vencimiento para esta cuota
        const installmentDueDate = new Date(simulationStartDate);
        installmentDueDate.setMonth(installmentDueDate.getMonth() + i);
        
        // Obtener el mes y año
        const monthKey = `${installmentDueDate.getFullYear()}-${installmentDueDate.getMonth()}`;
        
        // Guardar el pago de la simulación
        simulationMonthlyPayments[monthKey] = installmentAmount;
      }
      
      // Calcular los pagos totales por mes (existentes + simulación)
      const totalMonthlyPayments: Record<string, number> = {};
      
      // Combinar los pagos existentes y los de la simulación
      simulationMonths.forEach(monthKey => {
        const existingPayment = existingMonthlyPayments[monthKey] || 0;
        const simulationPayment = simulationMonthlyPayments[monthKey] || 0;
        totalMonthlyPayments[monthKey] = existingPayment + simulationPayment;
      });
      
      // Calcular el margen restante por mes
      const monthlyMargins: Record<string, number> = {};
      
      // Calcular el margen restante para cada mes
      simulationMonths.forEach(monthKey => {
        const availableFunds = monthlyAvailableFunds[monthKey] || 0;
        const totalPayments = totalMonthlyPayments[monthKey] || 0;
        monthlyMargins[monthKey] = availableFunds - totalPayments;
      });
      
      // Crear la proyección mensual detallada
      const monthlyProjections: IMonthlyProjection[] = [];
      
      // Función para formatear el mes
      const formatMonthLabel = (monthKey: string) => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(year, month, 1);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      };
      
      // Generar la proyección mensual para cada mes en la simulación
      for (const monthKey of simulationMonths) {
        const availableFunds = monthlyAvailableFunds[monthKey] || 0;
        const existingPayment = existingMonthlyPayments[monthKey] || 0;
        const simulationPayment = simulationMonthlyPayments[monthKey] || 0;
        const totalPayment = existingPayment + simulationPayment;
        const margin = availableFunds - totalPayment;
        
        monthlyProjections.push({
          month: monthKey,
          monthLabel: formatMonthLabel(monthKey),
          totalBefore: existingPayment,
          newPayment: simulationPayment,
          totalFinal: totalPayment,
          remainingMargin: margin,
          status: margin >= 0 ? 'Verde' : 'Rojo'
        });
      }
      
      // Determinar si puede pagar el total a largo plazo
      const canPayTotal = monthlyProjections.every(projection => projection.status === 'Verde');
      
      // Determinar si puede pagar el primer mes
      const firstMonthKey = `${simulationStartDate.getFullYear()}-${simulationStartDate.getMonth()}`;
      const firstMonthProjection = monthlyProjections.find(p => p.month === firstMonthKey);
      const canPayFirstMonth = firstMonthProjection ? firstMonthProjection.status === 'Verde' : false;
      
      // Determinar si puede pagar el gasto
      // Para gastos de una sola cuota, solo necesita poder pagar el primer mes
      // Para gastos de múltiples cuotas, necesita poder pagar a largo plazo
      const canAfford = totalInstallments === 1 ? canPayFirstMonth : canPayTotal;
      
      // Calcular el déficit si no puede pagar
      let deficit = 0;
      let suggestedMonthlyContribution = 0;
      let suggestedDurationMonths = 0;
      
      if (!canAfford) {
        // Calcular el déficit total sumando todos los márgenes negativos
        deficit = monthlyProjections
          .filter(p => p.status === 'Rojo')
          .reduce((total, p) => total + Math.abs(p.remainingMargin), 0);
        
        // Usar el aporte mensual máximo definido por el usuario
        // Si no está definido, calculamos uno razonable
        let maxReasonableContribution;
        
        if (fund.maxMonthlyContribution && fund.maxMonthlyContribution > fund.monthlyContribution) {
          // Usar el valor definido por el usuario
          maxReasonableContribution = fund.maxMonthlyContribution;
        } else {
          // Calcular un valor razonable basado en la cuota
          const installmentAmountReference = amount / totalInstallments;
          maxReasonableContribution = Math.max(
            fund.monthlyContribution * 1.5, // 50% más que el aporte actual
            installmentAmountReference * 1.5 // 50% más que el monto de la cuota
          );
        }
        
        // Calcular una contribución mensual razonable basada en el déficit y la duración
        // Primero, estimamos una duración razonable (entre 1 y 6 meses)
        const reasonableDuration = Math.min(6, Math.max(1, Math.ceil(deficit / (fund.monthlyContribution * 0.3))));
        
        // Luego, calculamos cuánto extra necesitamos por mes para cubrir el déficit en ese tiempo
        const extraNeededPerMonth = Math.ceil(deficit / reasonableDuration / 100) * 100;
        
        // La contribución sugerida es la actual más el extra necesario
        suggestedMonthlyContribution = Math.min(
          fund.monthlyContribution + extraNeededPerMonth,
          maxReasonableContribution // Pero limitado a un monto razonable
        );
        
        // Calcular cuánto extra se aportaría por mes comparado con la contribución actual
        const extraContributionPerMonth = suggestedMonthlyContribution - fund.monthlyContribution;
        
        if (extraContributionPerMonth > 0) {
          // Calcular cuántos meses se necesitan para cubrir el déficit con el aporte extra
          suggestedDurationMonths = Math.ceil(deficit / extraContributionPerMonth);
          
          // Asegurarnos de que la duración sea al menos 1 mes
          suggestedDurationMonths = Math.max(1, suggestedDurationMonths);
        }
      }
      
      // Calcular valores para la respuesta
      const availableFunds = fund.accumulatedAmount + fund.monthlyContribution;
      const startMonthKey = `${simulationStartDate.getFullYear()}-${simulationStartDate.getMonth()}`;
      const projectedAvailableFundsAtStart = monthlyAvailableFunds[startMonthKey] || 0;
      const fundsNeededForExisting = existingMonthlyPayments[startMonthKey] || 0;
      const monthlyRequiredFunds = fundsNeededForExisting + installmentAmount;
      const projectedBalance = projectedAvailableFundsAtStart - monthlyRequiredFunds;
      const projectedAvailableFunds = monthlyAvailableFunds[simulationMonths[simulationMonths.length - 1]] || 0;
      const totalRequiredFundsValue = pendingAmount + amount;
      const totalProjectedBalance = projectedAvailableFunds - totalRequiredFundsValue;
      
      // Estructura mejorada de la respuesta que se devuelve al usuario
      return {
        canAfford,
        canPayTotal,
        availableFunds,
        projectedAvailableFunds,
        projectedAvailableFundsAtStart,
        requiredFunds: monthlyRequiredFunds,
        monthlyRequiredFunds,
        totalRequiredFunds: totalRequiredFundsValue,
        projectedBalance,
        totalProjectedBalance,
        pendingInstallments,
        pendingAmount,
        installmentAmount,
        suggestedMonthlyContribution,
        suggestedDurationMonths,
        monthlyProjections
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
    
    for (let i = 0; i < totalInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      installments.push({
        number: i + 1,
        amount: installmentAmount,
        dueDate,
        status: InstallmentStatus.PENDING
      });
    }
    
    return installments;
  }
}
