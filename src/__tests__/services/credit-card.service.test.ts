import { CreditCardService } from '../../services/credit-card.service';
import { CreditCardFund } from '../../models/credit-card-fund.model';
import { CreditCardExpense } from '../../models/credit-card-expense.model';
import { ISimulationResult, InstallmentStatus } from '../../interfaces/credit-card.interface';
import { ExpenseCalculator } from '../../services/calculators/expense-calculator';
import { ICreditCardFundRepository } from '../../interfaces/repositories/credit-card-fund.repository.interface';

// Mock de los modelos y servicios
jest.mock('../../models/credit-card-fund.model');
jest.mock('../../models/credit-card-expense.model');
jest.mock('../../services/calculators/expense-calculator');

describe('CreditCardService', () => {
  // Mock del repositorio de fondos
  const mockFundRepository: jest.Mocked<ICreditCardFundRepository> = {
    getFund: jest.fn(),
    createFund: jest.fn(),
    updateFund: jest.fn()
  };

  // Mock del calculador de gastos
  const mockExpenseCalculator = {
    simulateExpense: jest.fn(),
    calculateInstallments: jest.fn()
  };

  // Instancia del servicio con dependencias mockeadas
  let creditCardService: CreditCardService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Crear una nueva instancia del servicio para cada test
    creditCardService = new CreditCardService(
      mockFundRepository,
      mockExpenseCalculator as any
    );
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
      mockFundRepository.getFund.mockResolvedValue(mockFund);
      
      // Mock del resultado de simulación
      const simulationResult: ISimulationResult = {
        canAfford: true,
        canPayTotal: true,
        installmentAmount: amount,
        totalRequiredFunds: amount,
        monthlyRequiredFunds: amount,
        projectedBalance: 25000,
        availableFunds: 35000,
        projectedAvailableFunds: 35000,
        projectedAvailableFundsAtStart: 35000,
        requiredFunds: amount,
        totalProjectedBalance: 15000,
        pendingInstallments: 0,
        pendingAmount: 0,
        monthlyProjections: []
      };
      
      // Mock del calculador de gastos
      mockExpenseCalculator.simulateExpense.mockResolvedValue(simulationResult);

      // Ejecutar la simulación
      const result = await creditCardService.simulateExpense(
        userId,
        amount,
        1, // Una sola cuota
        new Date('2025-05-01')
      );

      // Verificaciones
      expect(mockFundRepository.getFund).toHaveBeenCalledWith(userId);
      expect(mockExpenseCalculator.simulateExpense).toHaveBeenCalled();
      
      // Verificar el resultado
      expect(result.canAfford).toBe(true);
      expect(result.installmentAmount).toBe(amount);
      expect(result.monthlyRequiredFunds).toBe(amount);
    });

    // Caso 2: Simulación de gasto en múltiples cuotas que se puede pagar
    it('should return canAfford=true for a multi-installment expense that can be paid', async () => {
      // Mock del fondo
      mockFundRepository.getFund.mockResolvedValue(mockFund);
      
      // Mock del resultado de simulación
      const simulationResult: ISimulationResult = {
        canAfford: true,
        canPayTotal: true,
        installmentAmount: amount / 3,
        totalRequiredFunds: amount,
        monthlyRequiredFunds: amount / 3,
        projectedBalance: 25000,
        availableFunds: 35000,
        projectedAvailableFunds: 35000,
        projectedAvailableFundsAtStart: 35000,
        requiredFunds: amount / 3,
        totalProjectedBalance: 15000,
        pendingInstallments: 3,
        pendingAmount: amount,
        monthlyProjections: []
      };
      
      // Mock del calculador de gastos
      mockExpenseCalculator.simulateExpense.mockResolvedValue(simulationResult);

      // Ejecutar la simulación
      const result = await creditCardService.simulateExpense(
        userId,
        amount,
        3, // Tres cuotas
        new Date('2025-05-01')
      );

      // Verificaciones
      expect(mockFundRepository.getFund).toHaveBeenCalledWith(userId);
      expect(mockExpenseCalculator.simulateExpense).toHaveBeenCalled();
      
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
      
      mockFundRepository.getFund.mockResolvedValue(lowFund);
      
      // Mock del resultado de simulación
      const simulationResult: ISimulationResult = {
        canAfford: false,
        canPayTotal: false,
        installmentAmount: amount,
        totalRequiredFunds: amount,
        monthlyRequiredFunds: amount,
        projectedBalance: -15000,
        availableFunds: 10000,
        projectedAvailableFunds: 10000,
        projectedAvailableFundsAtStart: 10000,
        requiredFunds: amount,
        totalProjectedBalance: -15000,
        pendingInstallments: 1,
        pendingAmount: amount,
        suggestedMonthlyContribution: 10000,
        suggestedDurationMonths: 3,
        monthlyProjections: []
      };
      
      // Mock del calculador de gastos
      mockExpenseCalculator.simulateExpense.mockResolvedValue(simulationResult);

      // Ejecutar la simulación
      const result = await creditCardService.simulateExpense(
        userId,
        amount,
        1, // Una sola cuota
        new Date('2025-05-01')
      );

      // Verificaciones
      expect(mockFundRepository.getFund).toHaveBeenCalledWith(userId);
      expect(mockExpenseCalculator.simulateExpense).toHaveBeenCalled();
      
      // Verificar el resultado
      expect(result.canAfford).toBe(false);
      expect(result.projectedBalance).toBeLessThan(0);
      expect(result.suggestedMonthlyContribution).toBeGreaterThan(0);
    });

    // Caso 4: Simulación de gasto que se puede pagar en el primer mes pero puede tener meses ajustados
    it('should handle an expense that can be paid but may have tight months', async () => {
      // Mock del fondo de tarjeta de crédito
      const highFund = {
        ...mockFund,
        monthlyContribution: 10000,
        accumulatedAmount: 50000,
        maxMonthlyContribution: 20000
      };
      
      mockFundRepository.getFund.mockResolvedValue(highFund);

      // Mock del resultado de simulación con proyecciones mensuales
      const monthlyProjections = Array.from({ length: 12 }, (_, i) => {
        const date = new Date('2025-05-01');
        date.setMonth(date.getMonth() + i);
        const month = `${date.getFullYear()}-${date.getMonth()}`;
        const monthLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        return {
          month,
          monthLabel,
          initialAmount: 50000 + (i * 10000),
          monthlyContribution: 10000,
          accumulatedFunds: 60000 + (i * 10000),
          totalBefore: 5000,
          newPayment: 10000,
          totalFinal: 15000,
          remainingMargin: -5000,
          balanceAfterPayments: 45000 + (i * 10000),
          status: 'Verde' as 'Verde' | 'Rojo'
        };
      });
      
      const simulationResult: ISimulationResult = {
        canAfford: true,
        canPayTotal: true,
        installmentAmount: 10000,
        totalRequiredFunds: 100000,
        monthlyRequiredFunds: 10000,
        projectedBalance: 45000,
        availableFunds: 60000,
        projectedAvailableFunds: 60000,
        projectedAvailableFundsAtStart: 60000,
        requiredFunds: 15000,
        totalProjectedBalance: 45000,
        pendingInstallments: 10,
        pendingAmount: 100000,
        monthlyProjections
      };
      
      // Mock del calculador de gastos
      mockExpenseCalculator.simulateExpense.mockResolvedValue(simulationResult);

      // Ejecutar la simulación para un gasto grande en múltiples cuotas
      const result = await creditCardService.simulateExpense(
        userId,
        100000, // Gasto grande
        10, // Muchas cuotas
        new Date('2025-05-01')
      );

      // Verificar el resultado
      expect(result.canPayTotal).toBe(true); // Con la nueva lógica, puede pagar a largo plazo
      
      // Verificar que exista la proyección mensual
      expect(result.monthlyProjections.length).toBeGreaterThan(0);
      
      // Verificar que el primer mes se pueda pagar
      expect(result.canAfford).toBe(true);
      
      // Verificar que cada mes tenga un estado (Verde o Rojo)
      result.monthlyProjections.forEach(projection => {
        expect(['Verde', 'Rojo']).toContain(projection.status);
      });
    });

    // Caso 5: Simulación con fecha de inicio futura (junio en lugar de mayo)
    it('should correctly calculate projected funds for a future start date', async () => {
      // Mock del fondo
      mockFundRepository.getFund.mockResolvedValue(mockFund);
      
      // Mock del resultado de simulación para mayo
      const simulationResultMay: ISimulationResult = {
        canAfford: true,
        canPayTotal: true,
        installmentAmount: 20000,
        totalRequiredFunds: 20000,
        monthlyRequiredFunds: 20000,
        projectedBalance: 15000,
        availableFunds: 35000,
        projectedAvailableFunds: 35000,
        projectedAvailableFundsAtStart: 35000,
        requiredFunds: 20000,
        totalProjectedBalance: 15000,
        pendingInstallments: 1,
        pendingAmount: 20000,
        monthlyProjections: []
      };
      
      // Mock del resultado de simulación para junio (con fondos proyectados mayores)
      const simulationResultJune: ISimulationResult = {
        canAfford: true,
        canPayTotal: true,
        installmentAmount: 20000,
        totalRequiredFunds: 20000,
        monthlyRequiredFunds: 20000,
        projectedBalance: 25000,
        availableFunds: 45000,
        projectedAvailableFunds: 45000,
        projectedAvailableFundsAtStart: 45000, // Mayor que mayo
        requiredFunds: 20000,
        totalProjectedBalance: 25000,
        pendingInstallments: 1,
        pendingAmount: 20000,
        monthlyProjections: []
      };
      
      // Mock del calculador de gastos para las dos llamadas consecutivas
      mockExpenseCalculator.simulateExpense
        .mockResolvedValueOnce(simulationResultMay)
        .mockResolvedValueOnce(simulationResultJune);

      // Ejecutar la simulación para mayo
      const resultMay = await creditCardService.simulateExpense(
        userId,
        20000,
        1,
        new Date('2025-05-01')
      );
      
      // Ejecutar la simulación para junio
      const resultJune = await creditCardService.simulateExpense(
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
      mockFundRepository.getFund.mockResolvedValue(null);

      // Verificar que se lanza un error
      await expect(
        creditCardService.simulateExpense(userId, amount, 1)
      ).rejects.toThrow('Credit card fund not found for this user');
      
      // Verificar que se buscó el fondo
      expect(mockFundRepository.getFund).toHaveBeenCalledWith(userId);
    });

    // Caso 7: Verificar cálculo correcto del déficit
    it('should calculate deficit correctly when expense cannot be afforded', async () => {
      // Mock del fondo con saldo bajo
      const lowFund = {
        ...mockFund,
        accumulatedAmount: 5000,
        monthlyContribution: 5000
      };
      
      mockFundRepository.getFund.mockResolvedValue(lowFund);
      
      // Mock del resultado de simulación con déficit
      const simulationResult: ISimulationResult = {
        canAfford: false,
        canPayTotal: false,
        installmentAmount: 10000, // 30000 / 3
        totalRequiredFunds: 30000,
        monthlyRequiredFunds: 10000,
        projectedBalance: -15000, // Déficit
        availableFunds: 10000,
        projectedAvailableFunds: 10000,
        projectedAvailableFundsAtStart: 10000,
        requiredFunds: 15000,
        totalProjectedBalance: -15000,
        pendingInstallments: 3,
        pendingAmount: 30000,
        suggestedMonthlyContribution: 10000, // El doble de la contribución actual
        suggestedDurationMonths: 3,
        monthlyProjections: []
      };
      
      // Mock del calculador de gastos
      mockExpenseCalculator.simulateExpense.mockResolvedValue(simulationResult);

      // Ejecutar la simulación
      const result = await creditCardService.simulateExpense(
        userId,
        30000, // Gasto grande
        3, // Tres cuotas
        new Date('2025-05-01')
      );

      // Verificaciones
      expect(result.canAfford).toBe(false);
      expect(result.projectedBalance).toBeLessThan(0);
      
      // Verificar que el déficit sea correcto
      expect(Math.abs(result.projectedBalance)).toBeGreaterThan(0);
      
      // Verificar que la sugerencia de contribución mensual sea razonable
      expect(result.suggestedMonthlyContribution).toBeGreaterThan(lowFund.monthlyContribution);
      expect((result.suggestedDurationMonths || 0) * (result.suggestedMonthlyContribution || 1)).toBeGreaterThanOrEqual(Math.abs(result.projectedBalance));
      
      // Verificar que se llamó al repositorio y al calculador
      expect(mockFundRepository.getFund).toHaveBeenCalledWith(userId);
      expect(mockExpenseCalculator.simulateExpense).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
