import { CreditCardService } from '../services/credit-card.service';
import { CreditCardFundRepository } from '../repositories/credit-card-fund.repository';
import { ExpenseCalculator } from '../services/calculators/expense-calculator';

/**
 * Configuración de dependencias para la aplicación
 * Implementa un patrón Singleton para los servicios
 */
class DependencyContainer {
  private static instance: DependencyContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    // Inicializar repositorios
    const creditCardFundRepository = new CreditCardFundRepository();
    
    // Inicializar calculadoras
    const expenseCalculator = new ExpenseCalculator();
    
    // Inicializar servicios
    const creditCardService = new CreditCardService(
      creditCardFundRepository,
      expenseCalculator
    );
    
    // Registrar servicios
    this.services.set('creditCardService', creditCardService);
  }

  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  public getService<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in dependency container`);
    }
    return service as T;
  }
}

// Exportar funciones de ayuda
export const getCreditCardService = (): CreditCardService => {
  return DependencyContainer.getInstance().getService<CreditCardService>('creditCardService');
};
