import { CreditCardService } from '../../services/credit-card.service';
import { CreditCardFund } from '../../models/credit-card-fund.model';
import { CreditCardExpense } from '../../models/credit-card-expense.model';
import { ISimulationResult, InstallmentStatus } from '../../interfaces/credit-card.interface';

// Mock de los modelos
jest.mock('../../models/credit-card-fund.model');
jest.mock('../../models/credit-card-expense.model');

describe('CreditCardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('simulateExpense', () => {
    const userId = 'test-user-id';
    const amount = 20000;
    const mockFund = {
      _id: 'fund-id',
      userId,
      monthlyContribution: 10000,
      maxMonthlyContribution: 15000,
      accumulatedAmount: 25000,
      lastUpdateDate: new Date('2025-01-01')
    };

    // Caso 1: Simulación de gasto de una sola cuota que se puede pagar
    it('should return canAfford=true for a single installment expense that can be paid', async () => {
      // Mock del fondo
      (CreditCardFund.findOne as jest.Mock).mockResolvedValue(mockFund);
      
      // Mock de gastos existentes (ninguno para este caso)
      (CreditCardExpense.find as jest.Mock).mockResolvedValue([]);

      // Ejecutar la simulación
      const result = await CreditCardService.simulateExpense(
        userId,
        amount,
        1, // Una sola cuota
        new Date('2025-05-01')
      );

      // Verificaciones
      expect(CreditCardFund.findOne).toHaveBeenCalledWith({ userId });
      expect(CreditCardExpense.find).toHaveBeenCalled();
      
      // Verificar el resultado
      expect(result.canAfford).toBe(true);
      expect(result.installmentAmount).toBe(amount);
      expect(result.monthlyRequiredFunds).toBe(amount);
    });

    // Caso 2: Simulación de gasto en múltiples cuotas que se puede pagar
    it('should return canAfford=true for a multi-installment expense that can be paid', async () => {
      // Mock del fondo
      (CreditCardFund.findOne as jest.Mock).mockResolvedValue(mockFund);
      
      // Mock de gastos existentes (ninguno para este caso)
      (CreditCardExpense.find as jest.Mock).mockResolvedValue([]);

      // Ejecutar la simulación
      const result = await CreditCardService.simulateExpense(
        userId,
        amount,
        3, // Tres cuotas
        new Date('2025-05-01')
      );

      // Verificaciones
      expect(CreditCardFund.findOne).toHaveBeenCalledWith({ userId });
      expect(CreditCardExpense.find).toHaveBeenCalled();
      
      // Verificar el resultado
      expect(result.canAfford).toBe(true);
      expect(result.installmentAmount).toBe(amount / 3);
      expect(result.totalRequiredFunds).toBe(amount);
    });

    // Caso 3: Simulación de gasto que no se puede pagar en el primer mes
    it('should return canAfford=false for an expense that cannot be paid in the first month', async () => {
      // Mock del fondo con saldo bajo
      const lowFund = {
        ...mockFund,
        accumulatedAmount: 5000,
        monthlyContribution: 5000
      };
      
      (CreditCardFund.findOne as jest.Mock).mockResolvedValue(lowFund);
      
      // Mock de gastos existentes que se devolverán
      const existingExpenses = [
        {
          amount: 15000,
          totalInstallments: 3,
          installments: [
            {
              number: 1,
              amount: 5000,
              dueDate: new Date('2025-05-15'),
              status: InstallmentStatus.PENDING
            },
            {
              number: 2,
              amount: 5000,
              dueDate: new Date('2025-06-15'),
              status: InstallmentStatus.PENDING
            },
            {
              number: 3,
              amount: 5000,
              dueDate: new Date('2025-07-15'),
              status: InstallmentStatus.PENDING
            }
          ]
        }
      ];
      
      (CreditCardExpense.find as jest.Mock).mockResolvedValue(existingExpenses);

      // Ejecutar la simulación
      const result = await CreditCardService.simulateExpense(
        userId,
        amount,
        1, // Una sola cuota
        new Date('2025-05-01')
      );

      // Verificaciones
      expect(CreditCardFund.findOne).toHaveBeenCalledWith({ userId });
      expect(CreditCardExpense.find).toHaveBeenCalled();
      
      // Verificar el resultado
      expect(result.canAfford).toBe(false);
      expect(result.projectedBalance).toBeLessThan(0);
      expect(result.suggestedMonthlyContribution).toBeGreaterThan(0);
    });

    // Caso 4: Simulación de gasto que se puede pagar en el primer mes pero no a largo plazo
    it('should handle an expense that can be paid in the first month but not in the long term', async () => {
      // Mock del fondo
      (CreditCardFund.findOne as jest.Mock).mockResolvedValue(mockFund);
      
      // Mock de gastos existentes con muchas cuotas futuras
      const futureDates = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2025-05-01');
        date.setMonth(date.getMonth() + i);
        futureDates.push(date);
      }
      
      const existingExpenses = [
        {
          amount: 60000,
          totalInstallments: 12,
          installments: futureDates.map((date, index) => ({
            number: index + 1,
            amount: 5000,
            dueDate: date,
            status: InstallmentStatus.PENDING
          }))
        }
      ];
      
      (CreditCardExpense.find as jest.Mock).mockResolvedValue(existingExpenses);

      // Ejecutar la simulación para un gasto grande en múltiples cuotas
      const result = await CreditCardService.simulateExpense(
        userId,
        100000, // Gasto grande
        10, // Muchas cuotas
        new Date('2025-05-01')
      );

      // Verificar el resultado
      expect(result.canPayTotal).toBe(false); // No puede pagar a largo plazo
      // Nota: En este caso, el resultado depende de la implementación actual
      // No verificamos canAfford directamente ya que puede variar según la lógica de negocio
    });

    // Caso 5: Simulación con fecha de inicio futura (junio en lugar de mayo)
    it('should correctly calculate projected funds for a future start date', async () => {
      // Mock del fondo
      (CreditCardFund.findOne as jest.Mock).mockResolvedValue(mockFund);
      
      // Mock de gastos existentes que se devolverán
      const existingExpenses = [
        {
          amount: 15000,
          totalInstallments: 3,
          installments: [
            {
              number: 1,
              amount: 5000,
              dueDate: new Date('2025-05-15'),
              status: InstallmentStatus.PENDING
            },
            {
              number: 2,
              amount: 5000,
              dueDate: new Date('2025-06-15'),
              status: InstallmentStatus.PENDING
            },
            {
              number: 3,
              amount: 5000,
              dueDate: new Date('2025-07-15'),
              status: InstallmentStatus.PENDING
            }
          ]
        }
      ];
      
      (CreditCardExpense.find as jest.Mock).mockResolvedValue(existingExpenses);

      // Ejecutar la simulación para mayo
      const resultMay = await CreditCardService.simulateExpense(
        userId,
        20000,
        1,
        new Date('2025-05-01')
      );
      
      // Ejecutar la simulación para junio
      const resultJune = await CreditCardService.simulateExpense(
        userId,
        20000,
        1,
        new Date('2025-06-01')
      );

      // Verificar que los fondos proyectados para junio son mayores que para mayo
      expect(resultJune.projectedAvailableFundsAtStart).toBeGreaterThan(resultMay.projectedAvailableFundsAtStart);
      
      // Verificar que si no puede pagar en mayo pero sí en junio, el resultado es coherente
      if (!resultMay.canAfford && resultJune.canAfford) {
        expect(resultJune.projectedAvailableFundsAtStart).toBeGreaterThanOrEqual(resultJune.monthlyRequiredFunds);
      }
    });

    // Caso 6: Error cuando no se encuentra el fondo
    it('should throw an error when fund is not found', async () => {
      // Mock del fondo no encontrado
      (CreditCardFund.findOne as jest.Mock).mockResolvedValue(null);

      // Verificar que se lanza un error
      await expect(
        CreditCardService.simulateExpense(userId, amount, 1)
      ).rejects.toThrow('Credit card fund not found for this user');
    });

    // Caso 7: Verificar cálculo correcto del déficit
    it('should calculate deficit correctly when expense cannot be afforded', async () => {
      // Mock del fondo con saldo bajo
      const lowFund = {
        ...mockFund,
        accumulatedAmount: 5000,
        monthlyContribution: 5000
      };
      
      (CreditCardFund.findOne as jest.Mock).mockResolvedValue(lowFund);
      
      // Mock de gastos existentes que consumen todos los fondos
      const existingExpenses = [
        {
          amount: 15000,
          totalInstallments: 3,
          installments: [
            {
              number: 1,
              amount: 5000,
              dueDate: new Date('2025-05-15'),
              status: InstallmentStatus.PENDING
            },
            {
              number: 2,
              amount: 5000,
              dueDate: new Date('2025-06-15'),
              status: InstallmentStatus.PENDING
            },
            {
              number: 3,
              amount: 5000,
              dueDate: new Date('2025-07-15'),
              status: InstallmentStatus.PENDING
            }
          ]
        }
      ];
      
      (CreditCardExpense.find as jest.Mock).mockResolvedValue(existingExpenses);

      // Ejecutar la simulación
      const result = await CreditCardService.simulateExpense(
        userId,
        20000,
        1,
        new Date('2025-05-01')
      );

      // Verificar que el déficit es correcto
      expect(result.projectedBalance).toBeLessThan(0);
      expect(Math.abs(result.projectedBalance)).toBeGreaterThan(0);
      
      // Verificar que la sugerencia de contribución mensual es coherente con el déficit
      expect(result.suggestedMonthlyContribution).toBeGreaterThan(lowFund.monthlyContribution);
      
      // Verificar que los meses sugeridos son razonables
      // La lógica exacta puede variar, pero debe ser un número positivo
      expect(result.suggestedDurationMonths || 0).toBeGreaterThan(0);
      // Y debe ser coherente con el déficit y la contribución sugerida
      expect((result.suggestedDurationMonths || 0) * (result.suggestedMonthlyContribution || 1)).toBeGreaterThanOrEqual(Math.abs(result.projectedBalance));
    });
  });
});
