import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';

export class TransactionController {
  static async getTransactions(req: Request, res: Response) {
    try {
      const transactions = await TransactionService.getTransactions();
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
      const transaction = await TransactionService.createTransaction(req.body);
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
