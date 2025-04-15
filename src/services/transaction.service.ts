import { Transaction } from '../models/transaction.model';
import { ITransaction, ITransactionCreate, TransactionType } from '../interfaces/transaction.interface';

interface ICreateTransactionData extends ITransactionCreate {
  type: TransactionType;
  userId: string;
}

export class TransactionService {
  static async getTransactions(): Promise<ITransaction[]> {
    try {
      return await Transaction.find().sort({ date: -1 });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  static async getTransactionsByUserId(userId: string): Promise<ITransaction[]> {
    try {
      return await Transaction.find({ userId }).sort({ date: -1 });
    } catch (error) {
      console.error(`Error fetching transactions for user ${userId}:`, error);
      throw error;
    }
  }

  static async createTransaction(data: ICreateTransactionData): Promise<ITransaction> {
    try {
      const transaction = new Transaction(data);
      return await transaction.save();
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }
}
