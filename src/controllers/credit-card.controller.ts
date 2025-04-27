import { Request, Response } from 'express';
import { InstallmentStatus } from '../interfaces/credit-card.interface';
import { CreditCardExpense } from '../models/credit-card-expense.model';
import { getCreditCardService } from '../config/dependencies';

/**
 * Controlador para operaciones relacionadas con tarjetas de crédito
 * Implementa el patrón Singleton para mantener compatibilidad con código existente
 */
export class CreditCardController {
  // Obtener la instancia del servicio desde el contenedor de dependencias
  private static getService() {
    return getCreditCardService();
  }
  
  // Controladores para el fondo de tarjeta de crédito
  static async getFund(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      
      // Obtener el fondo de tarjeta de crédito
      const fund = await CreditCardController.getService().getFund(userId);
      
      if (!fund) {
        return res.status(404).json({
          success: false,
          error: 'Credit card fund not found for this user'
        });
      }
      
      res.json({
        success: true,
        data: fund
      });
    } catch (error) {
      console.error('Controller error fetching credit card fund:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching credit card fund'
      });
    }
  }

  static async updateAccumulatedAmount(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      
      // Obtener el fondo actual
      const fund = await CreditCardController.getService().getFund(userId);
      
      if (!fund) {
        return res.status(404).json({
          success: false,
          error: 'Credit card fund not found for this user'
        });
      }
      
      res.json({
        success: true,
        data: fund
      });
    } catch (error) {
      console.error('Controller error updating credit card accumulated amount:', error);
      res.status(500).json({
        success: false,
        error: 'Error updating credit card accumulated amount'
      });
    }
  }

  static async createOrUpdateFund(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const fundData = req.body;
      
      // Eliminar userId del objeto para evitar conflictos
      delete fundData.userId;
      
      // Si ya existe un fondo, actualizarlo; si no, crearlo
      let fund;
      const service = CreditCardController.getService();
      const existingFund = await service.getFund(userId);
      
      if (existingFund) {
        // Actualizar el fondo usando el userId, no el _id
        fund = await service.updateFund(userId, fundData);
      } else {
        fund = await service.createFund({
          ...fundData,
          userId
        });
      }
      
      res.json({
        success: true,
        data: fund
      });
    } catch (error) {
      console.error('Controller error creating/updating credit card fund:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating/updating credit card fund'
      });
    }
  }

  // Controladores para los gastos de tarjeta de crédito
  static async getExpenses(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const includeSimulations = req.query.includeSimulations === 'true';
      
      // Obtener gastos por userId
      const expenses = await CreditCardExpense.find({
        userId,
        ...(includeSimulations ? {} : { isSimulation: { $ne: true } })
      });
      
      res.json({
        success: true,
        data: expenses
      });
    } catch (error) {
      console.error('Controller error fetching credit card expenses:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching credit card expenses'
      });
    }
  }

  static async getExpenseById(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const expenseId = req.params.id;
      
      const expense = await CreditCardController.getService().getExpenseById(expenseId);
      
      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Credit card expense not found'
        });
      }
      
      res.json({
        success: true,
        data: expense
      });
    } catch (error) {
      console.error('Controller error fetching credit card expense:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching credit card expense'
      });
    }
  }

  static async createExpense(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const expenseData = { ...req.body, userId };
      
      // Verificar si existe un fondo de tarjeta de crédito
      const service = CreditCardController.getService();
      const fund = await service.getFund(userId);
      if (!fund) {
        return res.status(400).json({
          success: false,
          error: 'Credit card fund not configured. You must configure a fund before creating expenses.'
        });
      }
      
      const expense = await service.createExpense(expenseData);
      
      res.status(201).json({
        success: true,
        data: expense
      });
    } catch (error) {
      console.error('Controller error creating credit card expense:', error);
      
      // Manejar el error específico de fondo no encontrado
      if (error instanceof Error && error.message === 'Credit card fund not found for this user') {
        return res.status(400).json({
          success: false,
          error: 'Credit card fund not configured. You must configure a fund before creating expenses.'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error creating credit card expense'
      });
    }
  }

  static async executeExpense(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const expenseId = req.params.id;
      
      // Obtener el gasto
      const expense = await CreditCardController.getService().getExpenseById(expenseId);
      
      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Credit card expense not found'
        });
      }
      
      // Verificar que el gasto pertenezca al usuario
      if (expense.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this expense'
        });
      }
      
      // Actualizar el estado de la simulación
      const updatedExpense = await CreditCardController.getService().executeExpense(expenseId);
      
      if (!updatedExpense) {
        return res.status(404).json({
          success: false,
          error: 'Credit card expense not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedExpense
      });
    } catch (error) {
      console.error('Controller error executing credit card expense:', error);
      res.status(500).json({
        success: false,
        error: 'Error executing credit card expense'
      });
    }
  }

  static async updateInstallmentStatus(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const expenseId = req.params.id;
      const { installmentNumber, status } = req.body;
      
      if (!installmentNumber || !status || !Object.values(InstallmentStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid installment number or status'
        });
      }
      
      const updatedExpense = await CreditCardController.getService().updateInstallmentStatus(
        expenseId,
        installmentNumber,
        status
      );
      
      if (!updatedExpense) {
        return res.status(404).json({
          success: false,
          error: 'Credit card expense or installment not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedExpense
      });
    } catch (error) {
      console.error('Controller error updating installment status:', error);
      res.status(500).json({
        success: false,
        error: 'Error updating installment status'
      });
    }
  }

  static async deleteExpense(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const expenseId = req.params.id;
      
      const result = await CreditCardController.getService().deleteExpense(expenseId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Credit card expense not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Credit card expense deleted successfully'
      });
    } catch (error) {
      console.error('Controller error deleting credit card expense:', error);
      res.status(500).json({
        success: false,
        error: 'Error deleting credit card expense'
      });
    }
  }

  // Controlador para actualizar la fecha de compra de un gasto
  static async updatePurchaseDate(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const expenseId = req.params.id;
      const { purchaseDate } = req.body;
      
      if (!purchaseDate) {
        return res.status(400).json({
          success: false,
          error: 'Purchase date is required'
        });
      }
      
      const updatedExpense = await CreditCardController.getService().updatePurchaseDate(
        expenseId,
        new Date(purchaseDate)
      );
      
      if (!updatedExpense) {
        return res.status(404).json({
          success: false,
          error: 'Credit card expense not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedExpense
      });
    } catch (error) {
      console.error('Controller error updating purchase date:', error);
      res.status(500).json({
        success: false,
        error: 'Error updating purchase date'
      });
    }
  }

  // Controlador para simular un gasto
  static async simulateExpense(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const { amount, totalInstallments, startDate } = req.body;
      
      if (!amount || !totalInstallments) {
        return res.status(400).json({
          success: false,
          error: 'Amount and totalInstallments are required'
        });
      }
      
      // Verificar si existe un fondo de tarjeta de crédito
      const service = CreditCardController.getService();
      const fund = await service.getFund(userId);
      if (!fund) {
        return res.status(400).json({
          success: false,
          error: 'Credit card fund not configured. You must configure a fund before simulating expenses.'
        });
      }
      
      // Simular el gasto
      const simulation = await service.simulateExpense(
        userId,
        amount,
        totalInstallments,
        startDate ? new Date(startDate) : undefined
      );
      
      res.json({
        success: true,
        data: simulation
      });
    } catch (error) {
      console.error('Controller error simulating expense:', error);
      
      // Manejar el error específico de fondo no encontrado
      if (error instanceof Error && error.message === 'Credit card fund not found for this user') {
        return res.status(400).json({
          success: false,
          error: 'Credit card fund not configured. You must configure a fund before simulating expenses.'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error simulating expense'
      });
    }
  }
}
