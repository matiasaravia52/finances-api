import { CreditCardExpense } from '../../models/credit-card-expense.model';
import {
  ICreditCardFund,
  ICreditCardExpense,
  ICreditCardExpenseCreate,
  IInstallment,
  InstallmentStatus,
  ISimulationResult,
  IMonthlyProjection
} from '../../interfaces/credit-card.interface';
import { IExpenseCalculator } from '../../interfaces/services/expense-calculator.interface';

export class ExpenseCalculator implements IExpenseCalculator {
  async simulateExpense(fund: ICreditCardFund, expense: ICreditCardExpenseCreate): Promise<ISimulationResult> {
    try {
      // Obtener todos los gastos activos (no simulaciones)
      const expenses = await CreditCardExpense.find({
        userId: fund.userId,
        isSimulation: { $ne: true }
      });

      // Calcular el monto por cuota del nuevo gasto simulado
      const installmentAmount = expense.amount / expense.totalInstallments;

      // Calcular el total de cuotas pendientes existentes
      let pendingAmount = 0;
      let pendingInstallments = 0;

      // Fecha para calcular los meses de las cuotas
      const baseDate = new Date();
      // Usar la fecha de inicio proporcionada o la fecha actual
      const simulationStartDate = new Date(expense.purchaseDate || baseDate);

      console.log(`Fecha de inicio de pago: ${simulationStartDate.toISOString().split('T')[0]}`);

      // Crear una lista de los meses para la simulación
      const simulationMonths: string[] = [];
      for (let i = 0; i < Math.max(12, expense.totalInstallments + 3); i++) {
        const simulationDate = new Date(baseDate);
        simulationDate.setMonth(baseDate.getMonth() + i);
        simulationMonths.push(`${simulationDate.getFullYear()}-${simulationDate.getMonth()}`);
      }

      // Mapear los gastos existentes por mes
      const monthlyPayments: Record<string, number> = {};

      // Inicializar el mapa mensual con 0 para cada mes
      simulationMonths.forEach(month => {
        monthlyPayments[month] = 0;
      });

      // Agregar las cuotas existentes al mapa mensual
      expenses.forEach(expense => {
        expense.installments.forEach(installment => {
          if (installment.status === InstallmentStatus.PENDING) {
            const dueDate = new Date(installment.dueDate);
            const month = `${dueDate.getFullYear()}-${dueDate.getMonth()}`;

            if (simulationMonths.includes(month)) {
              monthlyPayments[month] += installment.amount;
              pendingAmount += installment.amount;
              pendingInstallments++;
            }
          }
        });
      });

      // Crear un mapa mensual para la simulación
      const simulationMonthlyPayments: Record<string, number> = {};

      // Agregar las cuotas de la simulación al mapa mensual
      for (let i = 0; i < expense.totalInstallments; i++) {
        // Calcular la fecha de vencimiento para esta cuota
        const installmentDueDate = new Date(simulationStartDate);
        installmentDueDate.setMonth(installmentDueDate.getMonth() + i);

        const month = `${installmentDueDate.getFullYear()}-${installmentDueDate.getMonth()}`;

        if (simulationMonths.includes(month)) {
          simulationMonthlyPayments[month] = installmentAmount;
        }
      }

      // Calcular el total mensual (existente + simulación)
      const totalMonthlyPayments: Record<string, number> = {};

      simulationMonths.forEach(month => {
        totalMonthlyPayments[month] = (monthlyPayments[month] || 0) + (simulationMonthlyPayments[month] || 0);
      });

      // Calcular el balance mensual (contribución - pagos)
      const monthlyBalance: Record<string, number> = {};

      let availableFunds = fund.accumulatedAmount; // Saldo inicial

      const currentDate = new Date(baseDate);
      const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

      simulationMonths.forEach(month => {
        const monthlyPayment = totalMonthlyPayments[month] || 0;

        // Aquí se ajusta el saldo de acuerdo con el mes de inicio de la simulación
        if (month === currentMonthKey) {
          // Estamos en el mes actual
          // Solo sumamos la contribución si hay pago en este mes
          if (monthlyPayment > 0) {
            availableFunds += fund.monthlyContribution;
          }
          // Si no hay pagos en el mes actual, no sumamos el aporte
        } else {
          // Para meses futuros siempre sumamos el aporte mensual
          availableFunds += fund.monthlyContribution;
        }

        // Restar los pagos del mes
        availableFunds -= monthlyPayment;

        // Guardar el balance para este mes
        monthlyBalance[month] = availableFunds;
      });

      // Verificar si puede pagar el primer mes
      const firstMonth = simulationMonths[0];
      const firstMonthPayment = totalMonthlyPayments[firstMonth] || 0;
      const firstMonthBalance = monthlyBalance[firstMonth];

      const canPayFirstMonth = firstMonthBalance >= 0;

      // Verificar si puede pagar todos los meses
      const canPayTotal = Object.values(monthlyBalance).every(balance => balance >= 0);

      // Calcular los fondos necesarios para los gastos existentes
      const fundsNeededForExisting = pendingAmount;

      // Calcular los fondos disponibles al inicio
      const availableFundsAtStart = fund.accumulatedAmount;

      // Calcular los fondos proyectados al inicio
      const projectedAvailableFundsAtStart = availableFundsAtStart + fund.monthlyContribution;

      // Calcular los fondos mensuales requeridos
      const monthlyRequiredFunds = firstMonthPayment;

      // Determinar si puede pagar el gasto
      const canAfford = expense.totalInstallments === 1 ? canPayFirstMonth : canPayTotal;

      // Calcular el déficit si no puede pagar
      let deficit = 0;
      let requiredMonthlyContribution = 0;

      if (!canAfford) {
        const lowestBalance = Math.min(...Object.values(monthlyBalance));

        if (lowestBalance < 0) {
          deficit = Math.abs(lowestBalance);

          const maxReasonableContribution = calculateMaxReasonableContribution(fund, expense);
          requiredMonthlyContribution = Math.min(
            maxReasonableContribution,
            fund.monthlyContribution + (deficit / expense.totalInstallments)
          );
        }
      }

      // Inicializar con el monto actual
      let currentInitialAmount = fund.accumulatedAmount;

      const monthlyProjections: IMonthlyProjection[] = simulationMonths.map(month => {
        const year = parseInt(month.split('-')[0]);
        let monthNum = parseInt(month.split('-')[1]);

        // Lógica para obtener el mes previo considerando el cambio de año
        let previousYear = year;
        let previousMonthNum = monthNum - 1;

        if (previousMonthNum < 0) {
          // Si estamos en enero, el mes previo es diciembre del año anterior
          previousMonthNum = 11; // diciembre
          previousYear -= 1; // año anterior
        }
        const previousMonth = `${previousYear}-${previousMonthNum}`;
        const date = new Date(year, monthNum);
        const monthLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        const existingPayment = monthlyPayments[month] || 0;
        const newPayment = simulationMonthlyPayments[month] || 0;
        const totalPayment = totalMonthlyPayments[month] || 0;
        const balance = monthlyBalance[month] || 0;
        const balanceMonthlyPrevious = monthlyBalance[previousMonth] || 0;

        const projection: IMonthlyProjection = {
          month,
          monthLabel,
          initialAmount: balanceMonthlyPrevious,
          monthlyContribution: fund.monthlyContribution,
          accumulatedFunds: balanceMonthlyPrevious + fund.monthlyContribution,
          totalBefore: existingPayment,
          newPayment,
          totalFinal: totalPayment,
          remainingMargin: fund.monthlyContribution - totalPayment,
          balanceAfterPayments: balance,
          status: balance >= 0 ? 'Verde' : 'Rojo'
        };

        // Actualizar el initialAmount para el próximo mes
        currentInitialAmount += fund.monthlyContribution;
        currentInitialAmount -= totalPayment;

        return projection;
      });

      // Devolver el resultado de la simulación
      return {
        canAfford,
        canPayTotal,
        availableFunds: availableFundsAtStart,
        projectedAvailableFunds: projectedAvailableFundsAtStart,
        projectedAvailableFundsAtStart,
        requiredFunds: fundsNeededForExisting + (installmentAmount * expense.totalInstallments),
        monthlyRequiredFunds,
        totalRequiredFunds: expense.amount,
        projectedBalance: projectedAvailableFundsAtStart - monthlyRequiredFunds,
        totalProjectedBalance: projectedAvailableFundsAtStart - expense.amount,
        pendingAmount,
        pendingInstallments,
        installmentAmount,
        suggestedMonthlyContribution: !canAfford ? requiredMonthlyContribution : undefined,
        suggestedDurationMonths: !canAfford ? expense.totalInstallments : undefined,
        monthlyProjections
      };
    } catch (error) {
      console.error('Error simulating expense:', error);
      throw error;
    }
  }

  calculateInstallments(amount: number, installments: number, startDate: Date): IInstallment[] {
    const installmentAmount = amount / installments;

    const installmentsArray: IInstallment[] = [];
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      installmentsArray.push({
        number: i + 1,
        amount: installmentAmount,
        dueDate,
        status: InstallmentStatus.PENDING
      });
    }

    return installmentsArray;
  }
}

// Función auxiliar para calcular la contribución mensual máxima razonable
function calculateMaxReasonableContribution(fund: ICreditCardFund, expense: ICreditCardExpenseCreate): number {
  if (fund.maxMonthlyContribution) {
    return fund.maxMonthlyContribution;
  } else {
    // Calcular un valor razonable basado en la cuota
    const installmentAmountReference = expense.amount / expense.totalInstallments;
    return Math.max(
      fund.monthlyContribution * 1.5, // 50% más que el aporte actual
      installmentAmountReference * 1.5 // 50% más que el monto de la cuota
    );
  }
}
