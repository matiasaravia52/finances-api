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
}
