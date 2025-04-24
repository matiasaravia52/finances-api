import { Request, Response } from 'express';
import { CreditCardService } from '../services/credit-card.service';
import { InstallmentStatus } from '../interfaces/credit-card.interface';

export class CreditCardController {
  // Controladores para el fondo de tarjeta de crédito
  static async getFund(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      
      // Actualizar el monto acumulado antes de devolverlo
      const fund = await CreditCardService.updateAccumulatedAmount(userId);
      
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
      
      const fund = await CreditCardService.updateAccumulatedAmount(userId);
      
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
      
      const fund = await CreditCardService.createOrUpdateFund(userId, fundData);
      
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
      
      const expenses = await CreditCardService.getExpensesByUserId(userId, includeSimulations);
      
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
      
      const expense = await CreditCardService.getExpenseById(expenseId, userId);
      
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
      
      const expense = await CreditCardService.createExpense(expenseData);
      
      res.status(201).json({
        success: true,
        data: expense
      });
    } catch (error) {
      console.error('Controller error creating credit card expense:', error);
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
      
      const expense = await CreditCardService.updateExpenseStatus(expenseId, userId, false);
      
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
      
      const expense = await CreditCardService.updateInstallmentStatus(
        expenseId,
        installmentNumber,
        userId,
        status
      );
      
      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Credit card expense or installment not found'
        });
      }
      
      res.json({
        success: true,
        data: expense
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
      
      const success = await CreditCardService.deleteExpense(expenseId, userId);
      
      if (!success) {
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
      
      const expense = await CreditCardService.updatePurchaseDate(
        expenseId,
        userId,
        new Date(purchaseDate)
      );
      
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
      const { amount, totalInstallments } = req.body;
      
      if (!amount || !totalInstallments) {
        return res.status(400).json({
          success: false,
          error: 'Amount and totalInstallments are required'
        });
      }
      
      const simulationResult = await CreditCardService.simulateExpense(
        userId,
        amount,
        totalInstallments
      );
      
      res.json({
        success: true,
        data: simulationResult
      });
    } catch (error) {
      console.error('Controller error simulating expense:', error);
      res.status(500).json({
        success: false,
        error: 'Error simulating expense'
      });
    }
  }
}
