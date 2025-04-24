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
      
      // Mapa para agrupar pagos por mes
      const monthlyPayments: { [key: string]: number } = {};
      
      // Fecha para calcular los meses de las cuotas
      const baseDate = new Date();
      // Usar la fecha de inicio proporcionada o la fecha actual
      const simulationStartDate = startDate ? new Date(startDate) : new Date(baseDate);
      
      console.log(`Fecha de inicio de pago: ${simulationStartDate.toISOString().split('T')[0]}`);
      
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
        const simulatedMonth = new Date(simulationStartDate);
        simulatedMonth.setMonth(simulationStartDate.getMonth() + i);
        
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
      // en el mes específico en que comenzará el pago de la simulación
      const startMonthKey = `${simulationStartDate.getFullYear()}-${simulationStartDate.getMonth()}`;
      const fundsNeededForExisting = monthlyPaymentsWithoutSimulation[startMonthKey] || 0;
      
      console.log(`Pagos existentes para el mes de inicio (${startMonthKey}): $${fundsNeededForExisting.toFixed(2)}`);
      
      // Fondos realmente disponibles para la simulación
      const fundsAvailableForSimulation = availableFunds - fundsNeededForExisting;
      
      // Calcular cuánto se necesita solo para la simulación
      const fundsNeededForSimulation = installmentAmount;
      
      // Preparar los valores correctos para devolver en la respuesta
      // El fondo requerido mensual debe incluir tanto las cuotas existentes del mes de inicio como la simulación
      const monthlyRequiredFunds = fundsNeededForExisting + fundsNeededForSimulation;
      
      // Calcular el fondo total requerido para toda la duración de las cuotas
      // Esto incluye todas las cuotas pendientes existentes más todas las cuotas de la simulación
      const totalRequiredFundsValue = pendingAmount + amount;
      
      // Calcular los meses de diferencia entre la fecha actual y la fecha de inicio de pago
      // Usamos las variables ya definidas (baseDate y simulationStartDate)
      
      // Calcular la diferencia en meses
      const monthsDifference = (
        (simulationStartDate.getFullYear() - baseDate.getFullYear()) * 12 + 
        (simulationStartDate.getMonth() - baseDate.getMonth())
      );
      
      console.log(`Diferencia en meses hasta el inicio de pago: ${monthsDifference}`);
      
      // Calcular el flujo de fondos mes a mes hasta la fecha de inicio del pago y más allá
      // Esto nos permitirá saber cuánto dinero realmente tendremos disponible en cada mes
      
      // Comenzamos con el monto acumulado actual (que podría ser 0 si no hay fondos acumulados)
      let accumulatedFunds = fund.accumulatedAmount;
      
      // Obtener el mes y año actual
      const currentMonth = baseDate.getMonth();
      const currentYear = baseDate.getFullYear();
      const currentMonthKey = `${currentYear}-${currentMonth}`;
      
      // Crear un mapa para rastrear el saldo disponible mes a mes
      const monthlyBalances: { [key: string]: number } = {};
      
      // Inicializar el saldo del mes actual con el monto acumulado
      // Nota: En el mes actual NO agregamos la contribución mensual porque asumimos que
      // ya está incluida en el monto acumulado o que se hará a partir del próximo mes
      monthlyBalances[currentMonthKey] = accumulatedFunds;
      
      console.log(`\nPROYECCIÓN DE FLUJO DE FONDOS MES A MES:`);
      console.log(`Mes actual (${currentMonthKey}): Saldo inicial: $${accumulatedFunds.toFixed(2)}`);
      
      // Proyectar el flujo de fondos mes a mes, comenzando desde el próximo mes
      for (let i = 1; i <= monthsDifference + totalInstallments; i++) {
        // Calcular el año y mes para este paso
        const projectionMonth = new Date(baseDate);
        projectionMonth.setMonth(projectionMonth.getMonth() + i);
        const monthKey = `${projectionMonth.getFullYear()}-${projectionMonth.getMonth()}`;
        
        // Obtener el saldo del mes anterior
        const previousMonth = new Date(projectionMonth);
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        const previousMonthKey = `${previousMonth.getFullYear()}-${previousMonth.getMonth()}`;
        const previousBalance = monthlyBalances[previousMonthKey] || 0;
        
        // Comenzamos con el saldo del mes anterior
        let monthBalance = previousBalance;
        
        // Agregar la contribución mensual para este mes
        monthBalance += fund.monthlyContribution;
        
        // Restar los pagos de este mes
        const paymentsThisMonth = monthlyPaymentsWithoutSimulation[monthKey] || 0;
        monthBalance -= paymentsThisMonth;
        
        // Guardar el saldo de este mes
        monthlyBalances[monthKey] = monthBalance;
        
        console.log(`Mes ${monthKey}: Saldo anterior: $${previousBalance.toFixed(2)}, Contribución: +$${fund.monthlyContribution.toFixed(2)}, Pagos: -$${paymentsThisMonth.toFixed(2)}, Saldo final: $${monthBalance.toFixed(2)}`);
        
        // Si este es el mes de inicio, destacarlo
        if (i === monthsDifference) {
          console.log(`^ Este es el mes de inicio del pago (${simulationStartDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })})`);
        }
      }
      
      // El saldo proyectado para la fecha de inicio es el saldo del mes correspondiente
      // Usamos el startMonthKey que ya definimos anteriormente
      const projectedAvailableFundsAtStart = monthlyBalances[startMonthKey] || 0;
      
      // Calcular los fondos disponibles totales proyectados para toda la duración
      const totalMonths = Math.max(totalInstallments, pendingInstallments > 0 ? pendingInstallments : 0);
      const projectedAvailableFunds = monthlyBalances[Object.keys(monthlyBalances)[Object.keys(monthlyBalances).length - 1]] || 0;
      
      // Información de diagnóstico más clara
      console.log('=== ANÁLISIS DE VIABILIDAD DEL GASTO ===');
      console.log(`Monto total del gasto: $${amount} en ${totalInstallments} cuotas de $${installmentAmount.toFixed(2)}`);
      console.log(`Fecha de inicio de pago: ${simulationStartDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}`);
      
      console.log(`\nSITUACIÓN ACTUAL:`);
      console.log(`- Fondos disponibles actuales: $${availableFunds.toFixed(2)} (acumulado: $${fund.accumulatedAmount.toFixed(2)} + mensual: $${fund.monthlyContribution.toFixed(2)})`);
      
      console.log(`\nSITUACIÓN PROYECTADA PARA EL INICIO DE PAGO:`);
      console.log(`- Fondos proyectados para el inicio: $${projectedAvailableFundsAtStart.toFixed(2)}`);
      console.log(`- Pagos mensuales existentes: $${fundsNeededForExisting.toFixed(2)}`);
      console.log(`- Fondos disponibles para nuevo gasto: $${(projectedAvailableFundsAtStart - fundsNeededForExisting).toFixed(2)}`);
      
      console.log(`\nREQUERIMIENTOS DEL GASTO:`);
      console.log(`- Pago mensual del nuevo gasto: $${fundsNeededForSimulation.toFixed(2)}`);
      console.log(`- Pago mensual total (existente + nuevo): $${monthlyRequiredFunds.toFixed(2)}`);
      
      // Simular el flujo de fondos con la nueva cuota incluida
      // Esto nos permitirá determinar si realmente podemos pagar el gasto a lo largo del tiempo
      console.log(`\nSIMULACIÓN CON EL NUEVO GASTO INCLUIDO:`);
      
      // Obtener el saldo disponible en el mes de inicio
      const availableBalanceAtStart = monthlyBalances[startMonthKey] || 0;
      
      // Verificar si podemos pagar el gasto en el mes de inicio
      // Comparamos el saldo disponible con el monto de la cuota
      const canPayFirstMonth = availableBalanceAtStart >= fundsNeededForSimulation;
      
      console.log(`Mes de inicio (${startMonthKey}): Saldo disponible: $${availableBalanceAtStart.toFixed(2)}, Cuota nueva: $${fundsNeededForSimulation.toFixed(2)}, ¿Suficiente? ${canPayFirstMonth ? 'SÍ' : 'NO'}`);
      
      // Simular los pagos futuros para ver si podemos mantener el gasto
      let canMaintainPayments = canPayFirstMonth; // Solo continuamos si podemos pagar el primer mes
      
      if (canPayFirstMonth) {
        // Hacer una copia de los saldos mensuales para no afectar los originales
        const simulatedBalances = { ...monthlyBalances };
        
        // Crear una lista de los meses para la simulación, comenzando con el mes de inicio
        const simulationMonths = [];
        for (let i = 0; i < totalInstallments; i++) {
          const simulationDate = new Date(simulationStartDate);
          simulationDate.setMonth(simulationDate.getMonth() + i);
          simulationMonths.push(`${simulationDate.getFullYear()}-${simulationDate.getMonth()}`);
        }
        
        // Simular cada mes
        for (const monthKey of simulationMonths) {
          // Obtener el saldo actual para este mes
          let currentBalance = simulatedBalances[monthKey] || 0;
          
          // Restar el pago de la nueva cuota
          currentBalance -= fundsNeededForSimulation;
          
          // Actualizar el saldo simulado
          simulatedBalances[monthKey] = currentBalance;
          
          console.log(`Mes ${monthKey}: Saldo original: $${monthlyBalances[monthKey]?.toFixed(2) || '0.00'}, Después de la cuota: $${currentBalance.toFixed(2)}, ¿Suficiente? ${currentBalance >= 0 ? 'SÍ' : 'NO'}`);
          
          // Si en algún mes no tenemos suficientes fondos, no podemos mantener los pagos
          if (currentBalance < 0) {
            canMaintainPayments = false;
            console.log(`^ No hay suficientes fondos para mantener los pagos en este mes`);
            break;
          }
          
          // Propagar el efecto a los meses siguientes
          // Encontrar el siguiente mes en la simulación
          const nextMonthIndex = simulationMonths.indexOf(monthKey) + 1;
          if (nextMonthIndex < simulationMonths.length) {
            const nextMonthKey = simulationMonths[nextMonthIndex];
            if (simulatedBalances[nextMonthKey] !== undefined) {
              // Ajustar el saldo del siguiente mes basado en el cambio en este mes
              const originalBalance = monthlyBalances[monthKey] || 0;
              const balanceChange = currentBalance - originalBalance;
              simulatedBalances[nextMonthKey] = (simulatedBalances[nextMonthKey] || 0) + balanceChange;
            }
          }
        }
      } else {
        console.log(`No se puede pagar la primera cuota, no se simularán los meses siguientes.`);
      }
      
      // Verificamos si los fondos proyectados son suficientes para el total
      const canPayTotal = projectedAvailableFunds >= totalRequiredFundsValue;
      
      // Podemos permitirnos el gasto si podemos pagar el primer mes
      // Para gastos de una sola cuota, esto es suficiente
      // Para gastos de múltiples cuotas, también debemos poder mantener los pagos
      const canAfford = totalInstallments === 1 ? canPayFirstMonth : (canPayFirstMonth && canMaintainPayments);
      
      console.log(`\nRESULTADO:`);
      console.log(`- ¿Puede pagar el primer mes cuando llegue la fecha? ${canPayFirstMonth ? 'SÍ' : 'NO'} (${projectedAvailableFundsAtStart.toFixed(2)} vs ${monthlyRequiredFunds.toFixed(2)})`);
      console.log(`- ¿Puede pagar el total a largo plazo? ${canPayTotal ? 'SÍ' : 'NO'} (${projectedAvailableFunds.toFixed(2)} vs ${totalRequiredFundsValue.toFixed(2)})`);
      console.log(`- CONCLUSIÓN: ${canAfford ? 'PUEDE' : 'NO PUEDE'} REALIZAR EL GASTO`);
      
      // Balance proyectado (lo que quedaría después de pagar la simulación)
      // Usamos los fondos proyectados para la fecha de inicio en lugar de los fondos actuales
      const projectedBalance = (projectedAvailableFundsAtStart - fundsNeededForExisting) - fundsNeededForSimulation;
      
      // Calcular sugerencia de contribución mensual si no se puede realizar el gasto
      let suggestedMonthlyContribution = 0;
      let suggestedDurationMonths = 0;
      
      if (!canAfford) {
        // Calcular el déficit real basado en la simulación de flujo de fondos
        // Encontrar el primer mes con saldo negativo o el déficit del primer mes
        let deficit = 0;
        
        if (!canPayFirstMonth) {
          // Si no podemos pagar el primer mes, calculamos el déficit real teniendo en cuenta los aportes mensuales
          // El déficit es la diferencia entre lo que necesitamos y lo que tenemos disponible
          const rawDeficit = fundsNeededForSimulation - availableBalanceAtStart;
          
          // Calculamos cuántos meses de aporte se necesitarían para cubrir este déficit
          // Esto nos da una idea más precisa del esfuerzo necesario para hacer viable el gasto
          const monthsNeeded = Math.ceil(rawDeficit / fund.monthlyContribution);
          
          // El déficit total a mostrar es el monto que necesitaríamos acumular
          deficit = rawDeficit;
          
          console.log(`Déficit en el primer mes: $${rawDeficit.toFixed(2)}`);
          console.log(`Meses de aporte necesarios para cubrir el déficit: ${monthsNeeded}`);
        } else if (!canMaintainPayments) {
          // Si no podemos mantener los pagos, calculamos el déficit acumulado a lo largo del tiempo
          // Recreamos la simulación para encontrar el déficit total
          let totalDeficit = 0;
          let worstNegativeBalance = 0;
          
          // Hacer una copia de los saldos mensuales para la simulación
          const deficitSimulatedBalances = { ...monthlyBalances };
          
          // Crear una lista de los meses para la simulación
          const simulationMonthsForDeficit = [];
          for (let i = 0; i < totalInstallments; i++) {
            const simulationDate = new Date(simulationStartDate);
            simulationDate.setMonth(simulationDate.getMonth() + i);
            simulationMonthsForDeficit.push(`${simulationDate.getFullYear()}-${simulationDate.getMonth()}`);
          }
          
          // Simular cada mes para calcular el déficit acumulado
          for (const monthKey of simulationMonthsForDeficit) {
            // Obtener el saldo actual para este mes
            let currentBalance = deficitSimulatedBalances[monthKey] || 0;
            
            // Restar el pago de la nueva cuota
            currentBalance -= fundsNeededForSimulation;
            
            // Si el saldo es negativo, sumarlo al déficit total
            if (currentBalance < 0) {
              totalDeficit += Math.abs(currentBalance);
            }
            
            // Actualizar el saldo simulado
            deficitSimulatedBalances[monthKey] = currentBalance;
            
            // Registrar el peor saldo negativo para referencia
            if (currentBalance < worstNegativeBalance) {
              worstNegativeBalance = currentBalance;
            }
            
            // Propagar el efecto a los meses siguientes
            const nextMonthIndex = simulationMonthsForDeficit.indexOf(monthKey) + 1;
            if (nextMonthIndex < simulationMonthsForDeficit.length) {
              const nextMonthKey = simulationMonthsForDeficit[nextMonthIndex];
              if (deficitSimulatedBalances[nextMonthKey] !== undefined) {
                const originalBalance = monthlyBalances[monthKey] || 0;
                const balanceChange = currentBalance - originalBalance;
                deficitSimulatedBalances[nextMonthKey] = (deficitSimulatedBalances[nextMonthKey] || 0) + balanceChange;
              }
            }
          }
          
          // El déficit a mostrar es el déficit total acumulado
          deficit = totalDeficit;
          
          // Calculamos cuántos meses de aporte se necesitarían para cubrir este déficit
          const monthsNeeded = Math.ceil(deficit / fund.monthlyContribution);
          
          console.log(`Déficit acumulado en meses futuros: $${deficit.toFixed(2)}`);
          console.log(`Peor saldo negativo: $${Math.abs(worstNegativeBalance).toFixed(2)}`);
          console.log(`Meses de aporte necesarios para cubrir el déficit: ${monthsNeeded}`);
        }
        
        // Usar el aporte mensual máximo definido por el usuario
        // Si no está definido, calculamos uno razonable
        let maxReasonableContribution;
        
        if (fund.maxMonthlyContribution && fund.maxMonthlyContribution > fund.monthlyContribution) {
          // Usar el valor definido por el usuario
          maxReasonableContribution = fund.maxMonthlyContribution;
          console.log(`\nSUGERENCIA DE MEJORA:`);
          console.log(`- Usando aporte máximo definido por el usuario: $${maxReasonableContribution.toFixed(2)}`);
        } else {
          // Calcular un valor razonable basado en la cuota
          const installmentAmountReference = amount / totalInstallments;
          maxReasonableContribution = Math.max(
            fund.monthlyContribution * 1.5, // 50% más que el aporte actual
            installmentAmountReference * 1.5 // 50% más que el monto de la cuota
          );
          console.log(`\nSUGERENCIA DE MEJORA:`);
          console.log(`- Aporte máximo razonable calculado: $${maxReasonableContribution.toFixed(2)}`);
        }
        
        // Calcular una contribución mensual razonable basada en el déficit y la duración
        // Primero, estimamos una duración razonable (entre 1 y 6 meses)
        const reasonableDuration = Math.min(6, Math.max(1, Math.ceil(deficit / (fund.monthlyContribution * 0.3))));
        
        // Luego, calculamos cuánto extra necesitamos por mes para cubrir el déficit en ese tiempo
        // Usamos Math.ceil para asegurar que cubrimos todo el déficit, pero redondeamos a la centena más cercana
        // para que sea un número más amigable para el usuario
        const extraNeededPerMonth = Math.ceil(deficit / reasonableDuration / 100) * 100;
        
        console.log(`- Déficit exacto: $${deficit.toFixed(2)}`);
        console.log(`- Duración estimada: ${reasonableDuration} meses`);
        console.log(`- Extra necesario por mes: $${extraNeededPerMonth.toFixed(2)}`);
        
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
          
          console.log(`- Déficit a cubrir: $${deficit.toFixed(2)}`);
          console.log(`- Aporte mensual sugerido: $${suggestedMonthlyContribution.toFixed(2)} (un aumento de $${extraContributionPerMonth.toFixed(2)})`);
          console.log(`- Duración recomendada: ${suggestedDurationMonths} meses`);
          console.log(`- Después de este período, podrá realizar este gasto`);
        }
      }
      
      // El balance proyectado mensual debe ser lo que quedaría después de pagar el primer mes
      // Si no se puede realizar el gasto, el balance debe ser negativo
      let monthlyProjectedBalance;
      
      if (canAfford) {
        // Si se puede realizar el gasto, el balance es positivo
        // Usamos los fondos proyectados para la fecha de inicio
        monthlyProjectedBalance = projectedAvailableFundsAtStart - monthlyRequiredFunds;
      } else {
        // Si no se puede realizar el gasto, el balance es negativo
        // Calculamos cuánto falta para poder realizar el gasto
        monthlyProjectedBalance = -Math.abs(fundsNeededForSimulation - (projectedAvailableFundsAtStart - fundsNeededForExisting));
      }
      
      // El balance proyectado total debe ser lo que quedaría después de pagar todas las cuotas
      // Usamos los fondos proyectados totales que ya tienen en cuenta el mes de inicio
      const totalProjectedBalance = projectedAvailableFunds - totalRequiredFundsValue;
      
      console.log('\nRESUMEN FINAL:');
      console.log(`- Puede realizar el gasto: ${canAfford ? 'SÍ' : 'NO'}`);
      console.log(`- Fondos disponibles actuales: $${availableFunds.toFixed(2)}`);
      console.log(`- Fondos proyectados para el inicio de pago: $${projectedAvailableFundsAtStart.toFixed(2)}`);
      console.log(`- Fondos requeridos mensuales: $${monthlyRequiredFunds.toFixed(2)}`);
      console.log(`- Balance mensual proyectado: $${monthlyProjectedBalance.toFixed(2)}`);
      console.log(`- Meses hasta el inicio de pago: ${monthsDifference}`);
      
      if (!canAfford && suggestedMonthlyContribution > 0) {
        console.log(`- Contribución mensual sugerida: $${suggestedMonthlyContribution.toFixed(2)} durante ${suggestedDurationMonths} meses`);
      }
      
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
        projectedBalance: monthlyProjectedBalance,
        totalProjectedBalance,
        pendingInstallments,
        pendingAmount,
        installmentAmount,
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
