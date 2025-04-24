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
        
        if ('maxMonthlyContribution' in data && data.maxMonthlyContribution !== undefined) {
          existingFund.maxMonthlyContribution = data.maxMonthlyContribution;
        } else if ('monthlyContribution' in data && data.monthlyContribution !== undefined) {
          // Si se actualiza la contribución mensual pero no la máxima, actualizamos la máxima por defecto
          existingFund.maxMonthlyContribution = Math.max(existingFund.maxMonthlyContribution, data.monthlyContribution * 1.5);
        }
        
        if ('accumulatedAmount' in data && data.accumulatedAmount !== undefined) {
          existingFund.accumulatedAmount = data.accumulatedAmount;
        }
        
        return await existingFund.save();
      } else {
        // Crear un nuevo fondo
        const monthlyContribution = 'monthlyContribution' in data && data.monthlyContribution !== undefined ? data.monthlyContribution : 0;
        
        const newFundData: ICreditCardFundCreate = {
          monthlyContribution,
          maxMonthlyContribution: 'maxMonthlyContribution' in data && data.maxMonthlyContribution !== undefined 
            ? data.maxMonthlyContribution 
            : monthlyContribution * 1.5, // Por defecto, 50% más que la contribución mensual
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
      
      // Calcular el monto por cuota del nuevo gasto simulado
      const installmentAmount = amount / totalInstallments;
      
      // Calcular el total de cuotas pendientes existentes
      let pendingAmount = 0;
      let pendingInstallments = 0;
      
      // Mapa para agrupar pagos por mes
      const monthlyPayments: { [key: string]: number } = {};
      
      // Fecha actual para calcular los meses
      const currentDate = new Date();
      
      // Agregar las cuotas pendientes existentes al mapa mensual
      expenses.forEach(expense => {
        expense.installments.forEach(installment => {
          if (installment.status === InstallmentStatus.PENDING) {
            // Contar para estadísticas
            pendingAmount += installment.amount;
            pendingInstallments++;
            
            // Agrupar por mes
            const dueDate = new Date(installment.dueDate);
            const monthKey = `${dueDate.getFullYear()}-${dueDate.getMonth()}`;
            
            if (!monthlyPayments[monthKey]) {
              monthlyPayments[monthKey] = 0;
            }
            
            monthlyPayments[monthKey] += installment.amount;
          }
        });
      });
      
      // Agregar las cuotas simuladas al mapa mensual
      for (let i = 0; i < totalInstallments; i++) {
        const simulatedMonth = new Date(currentDate);
        simulatedMonth.setMonth(currentDate.getMonth() + i);
        
        const monthKey = `${simulatedMonth.getFullYear()}-${simulatedMonth.getMonth()}`;
        
        if (!monthlyPayments[monthKey]) {
          monthlyPayments[monthKey] = 0;
        }
        
        monthlyPayments[monthKey] += installmentAmount;
      }
      
      console.log('Pagos mensuales (incluyendo simulación):', monthlyPayments);
      
      // Encontrar el mes con mayor carga financiera
      let maxMonthPayment = 0;
      let maxMonthKey = '';
      
      Object.entries(monthlyPayments).forEach(([key, value]) => {
        if (value > maxMonthPayment) {
          maxMonthPayment = value;
          maxMonthKey = key;
        }
      });
      
      console.log(`Mes con mayor carga: ${maxMonthKey}, Monto: ${maxMonthPayment}`);
      
      // El fondo requerido es el monto del mes con mayor carga
      const requiredFunds = maxMonthPayment;
      
      // Calcular el monto disponible actual (acumulado + contribución mensual)
      const availableFunds = fund.accumulatedAmount + fund.monthlyContribution;
      
      // Calcular los fondos disponibles SIN la nueva simulación
      // Encontrar el mes con mayor carga SIN incluir la simulación
      const monthlyPaymentsWithoutSimulation: { [key: string]: number } = {};
      
      // Copiar solo las cuotas existentes
      expenses.forEach(expense => {
        expense.installments.forEach(installment => {
          if (installment.status === InstallmentStatus.PENDING) {
            const dueDate = new Date(installment.dueDate);
            const monthKey = `${dueDate.getFullYear()}-${dueDate.getMonth()}`;
            
            if (!monthlyPaymentsWithoutSimulation[monthKey]) {
              monthlyPaymentsWithoutSimulation[monthKey] = 0;
            }
            
            monthlyPaymentsWithoutSimulation[monthKey] += installment.amount;
          }
        });
      });
      
      // Encontrar el mes con mayor carga sin la simulación
      let maxMonthPaymentWithoutSimulation = 0;
      
      Object.values(monthlyPaymentsWithoutSimulation).forEach(value => {
        if (value > maxMonthPaymentWithoutSimulation) {
          maxMonthPaymentWithoutSimulation = value;
        }
      });
      
      // Calcular cuánto de los fondos disponibles se necesita para cubrir las cuotas existentes
      const fundsNeededForExisting = maxMonthPaymentWithoutSimulation;
      
      // Fondos realmente disponibles para la simulación
      const fundsAvailableForSimulation = availableFunds - fundsNeededForExisting;
      
      // Calcular cuánto se necesita solo para la simulación
      const fundsNeededForSimulation = installmentAmount;
      
      // Preparar los valores correctos para devolver en la respuesta
      // El fondo requerido mensual debe incluir tanto las cuotas existentes como la simulación
      const monthlyRequiredFunds = fundsNeededForExisting + fundsNeededForSimulation;
      
      // Calcular el fondo total requerido para toda la duración de las cuotas
      // Esto incluye todas las cuotas pendientes existentes más todas las cuotas de la simulación
      const totalRequiredFundsValue = pendingAmount + amount;
      
      // Calcular los fondos disponibles proyectados (considerando contribuciones futuras)
      // Estimamos las contribuciones mensuales durante la duración de las cuotas
      // Usamos el máximo entre el número total de cuotas y las cuotas pendientes existentes
      const totalMonths = Math.max(totalInstallments, pendingInstallments > 0 ? pendingInstallments : 0);
      const projectedAvailableFunds = fund.accumulatedAmount + (fund.monthlyContribution * totalMonths);
      
      console.log(`Fondos requeridos totales: ${requiredFunds}`);
      console.log(`Fondos necesarios para cuotas existentes: ${fundsNeededForExisting}`);
      console.log(`Fondos disponibles totales: ${availableFunds}`);
      console.log(`Fondos disponibles para simulación: ${fundsAvailableForSimulation}`);
      console.log(`Fondos necesarios para simulación: ${fundsNeededForSimulation}`);
      
      // Determinar si se puede realizar el gasto
      // Verificamos si los fondos actuales son suficientes para el primer mes
      const canAffordMonthly = availableFunds >= monthlyRequiredFunds;
      
      // Y verificamos si los fondos proyectados son suficientes para el total
      const canAffordTotal = projectedAvailableFunds >= totalRequiredFundsValue;
      
      // Solo podemos permitirnos el gasto si podemos pagar el primer mes
      // Para el caso de la heladera, no importa si tenemos fondos proyectados suficientes
      // si no podemos pagar el primer mes
      const canAfford = canAffordMonthly;
      
      console.log(`canAffordMonthly: ${canAffordMonthly}, canAffordTotal: ${canAffordTotal}, canAfford: ${canAfford}`);
      
      // Balance proyectado (lo que quedaría después de pagar la simulación)
      const projectedBalance = fundsAvailableForSimulation - fundsNeededForSimulation;
      
      // Calcular sugerencia de contribución mensual si no se puede realizar el gasto
      let suggestedMonthlyContribution = 0;
      let suggestedDurationMonths = 0;
      
      if (!canAfford) {
        // Calcular el déficit total que hay que cubrir
        const deficit = fundsNeededForSimulation - fundsAvailableForSimulation;
        
        // Usar el aporte mensual máximo definido por el usuario
        // Si no está definido, calculamos uno razonable
        let maxReasonableContribution;
        
        if (fund.maxMonthlyContribution && fund.maxMonthlyContribution > fund.monthlyContribution) {
          // Usar el valor definido por el usuario
          maxReasonableContribution = fund.maxMonthlyContribution;
          console.log(`Usando aporte máximo definido por el usuario: ${maxReasonableContribution}`);
        } else {
          // Calcular un valor razonable basado en la cuota
          const installmentAmountReference = amount / totalInstallments;
          maxReasonableContribution = Math.max(
            fund.monthlyContribution * 1.5, // 50% más que el aporte actual
            installmentAmountReference * 1.5 // 50% más que el monto de la cuota
          );
          console.log(`Calculando aporte máximo razonable: ${maxReasonableContribution}`);
        }
        
        // Limitar el aporte sugerido al máximo razonable
        suggestedMonthlyContribution = Math.min(
          Math.ceil(fund.monthlyContribution + deficit), // Aporte que cubriría todo el déficit en un mes
          maxReasonableContribution // Pero limitado a un monto razonable
        );
        
        // Calcular cuánto extra se aportaría por mes comparado con la contribución actual
        const extraContributionPerMonth = suggestedMonthlyContribution - fund.monthlyContribution;
        
        if (extraContributionPerMonth > 0) {
          // Calcular cuántos meses se necesitan para cubrir el déficit con el aporte extra
          suggestedDurationMonths = Math.ceil(deficit / extraContributionPerMonth);
          
          // Asegurarnos de que la duración sea al menos 1 mes
          suggestedDurationMonths = Math.max(1, suggestedDurationMonths);
          
          // Agregar un margen de seguridad (10% más de tiempo)
          suggestedDurationMonths = Math.ceil(suggestedDurationMonths * 1.1);
          
          console.log(`Déficit: ${deficit}, Aporte extra: ${extraContributionPerMonth}, Duración: ${suggestedDurationMonths} meses`);
        }
      }
      
      // Los valores de monthlyRequiredFunds y totalRequiredFundsValue ya se calcularon arriba
      
      // El balance proyectado mensual debe ser lo que quedaría después de pagar el primer mes
      // Si no se puede realizar el gasto, el balance debe ser negativo
      let monthlyProjectedBalance;
      
      if (canAfford) {
        // Si se puede realizar el gasto, el balance es positivo
        monthlyProjectedBalance = availableFunds - monthlyRequiredFunds;
      } else {
        // Si no se puede realizar el gasto, el balance es negativo
        // Calculamos cuánto falta para poder realizar el gasto
        // Aseguramos que sea negativo usando el valor absoluto y multiplicando por -1
        monthlyProjectedBalance = -Math.abs(fundsNeededForSimulation - fundsAvailableForSimulation);
      }
      
      // El balance proyectado total debe ser lo que quedaría después de pagar todas las cuotas
      // Calculamos cuánto quedaría después de pagar todas las cuotas existentes y simuladas
      const totalProjectedBalance = availableFunds - totalRequiredFundsValue;
      
      console.log('Valores que se devuelven:');
      console.log(`canAfford: ${canAfford}`);
      console.log(`availableFunds: ${availableFunds}`);
      console.log(`projectedAvailableFunds: ${projectedAvailableFunds}`);
      console.log(`requiredFunds (mensual): ${monthlyRequiredFunds}`);
      console.log(`totalRequiredFunds (total): ${totalRequiredFundsValue}`);
      console.log(`projectedBalance (mensual): ${monthlyProjectedBalance}`);
      console.log(`totalProjectedBalance (total): ${totalProjectedBalance}`);
      console.log(`suggestedDurationMonths: ${suggestedDurationMonths}`);
      
      return {
        canAfford,
        availableFunds,
        projectedAvailableFunds,
        requiredFunds: monthlyRequiredFunds,
        totalRequiredFunds: totalRequiredFundsValue,
        projectedBalance: monthlyProjectedBalance,
        totalProjectedBalance,
        pendingInstallments,
        pendingAmount,
        suggestedMonthlyContribution,
        suggestedDurationMonths
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
