import { Request, Response } from 'express';
import { TransactionService, FilterPeriod } from '../services/transaction.service';

export class TransactionController {
  static async getTransactions(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const period = req.query.period as FilterPeriod || 'all';
      
      console.log(`Fetching transactions for user ${userId} with period ${period}`);
      
      const transactions = await TransactionService.getTransactionsByUserId(userId, period);
      
      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Controller error fetching transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching transactions'
      });
    }
  }
  
  static async getTransactionsSummary(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      
      console.log(`Fetching transactions summary for user ${userId}`);
      
      const summary = await TransactionService.getTransactionsSummary(userId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Controller error fetching transactions summary:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching transactions summary'
      });
    }
  }

  static async createTransaction(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const transactionData = { ...req.body, userId };
      const transaction = await TransactionService.createTransaction(transactionData);
      res.status(201).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Controller error creating transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating transaction'
      });
    }
  }

  static async updateTransaction(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const transactionId = req.params.id;
      const updateData = req.body;
      
      // Eliminar userId del objeto de actualización para evitar cambiar el propietario
      delete updateData.userId;
      
      const transaction = await TransactionService.updateTransaction(transactionId, userId, updateData);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found or not owned by user'
        });
      }
      
      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Controller error updating transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Error updating transaction'
      });
    }
  }

  static async deleteTransaction(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const transactionId = req.params.id;
      
      const success = await TransactionService.deleteTransaction(transactionId, userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found or not owned by user'
        });
      }
      
      res.json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    } catch (error) {
      console.error('Controller error deleting transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Error deleting transaction'
      });
    }
  }
}
