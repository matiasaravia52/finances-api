import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';

export class TransactionController {
  static async getTransactions(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const transactions = await TransactionService.getTransactionsByUserId(userId);
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
