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

  static async updateTransaction(id: string, userId: string, data: Partial<ITransaction>): Promise<ITransaction | null> {
    try {
      // Asegurar que solo el propietario pueda actualizar la transacción
      const transaction = await Transaction.findOneAndUpdate(
        { _id: id, userId },
        { ...data },
        { new: true } // Devuelve el documento actualizado
      );
      
      if (!transaction) {
        console.error(`Transaction with id ${id} not found or not owned by user ${userId}`);
        return null;
      }
      
      return transaction;
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      throw error;
    }
  }

  static async deleteTransaction(id: string, userId: string): Promise<boolean> {
    try {
      // Asegurar que solo el propietario pueda eliminar la transacción
      const result = await Transaction.deleteOne({ _id: id, userId });
      
      if (result.deletedCount === 0) {
        console.error(`Transaction with id ${id} not found or not owned by user ${userId}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error);
      throw error;
    }
  }
}
