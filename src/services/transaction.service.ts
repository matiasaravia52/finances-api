import { Transaction } from '../models/transaction.model';
import { ITransaction, ITransactionCreate, TransactionType } from '../interfaces/transaction.interface';

export type FilterPeriod = 'all' | 'current-month' | 'last-month' | 'current-year';

export interface TransactionFilters {
  period?: FilterPeriod;
  type?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTransactions {
  transactions: ITransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

  static async getTransactionsByUserId(userId: string, filters: TransactionFilters = {}): Promise<PaginatedTransactions> {
    try {
      const query: any = { userId };
      
      // Aplicar filtro por período
      if (filters.period && filters.period !== 'all') {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        switch (filters.period) {
          case 'current-month': {
            const startOfMonth = new Date(currentYear, currentMonth, 1);
            const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
            query.date = { $gte: startOfMonth, $lte: endOfMonth };
            break;
          }
          
          case 'last-month': {
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const startOfLastMonth = new Date(lastMonthYear, lastMonth, 1);
            const endOfLastMonth = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59, 999);
            query.date = { $gte: startOfLastMonth, $lte: endOfLastMonth };
            break;
          }
          
          case 'current-year': {
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
            query.date = { $gte: startOfYear, $lte: endOfYear };
            break;
          }
        }
      }
      
      // Aplicar filtro por tipo
      if (filters.type) {
        query.type = filters.type;
      }
      
      // Aplicar filtro por categoría
      if (filters.category) {
        query.category = filters.category;
      }
      
      console.log('Applying filters:', { userId, filters, query });
      
      // Configuración de paginación
      const page = filters.page && filters.page > 0 ? filters.page : 1;
      const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
      const skip = (page - 1) * limit;
      
      // Obtener el total de documentos para calcular el número total de páginas
      const total = await Transaction.countDocuments(query);
      const totalPages = Math.ceil(total / limit);
      
      // Obtener las transacciones paginadas
      const transactions = await Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);
      
      return {
        transactions,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error(`Error fetching transactions for user ${userId} with filters:`, filters, error);
      throw error;
    }
  }
  
  static async getTransactionCategories(userId: string, type?: string): Promise<string[]> {
    try {
      const query: any = { userId };
      
      // Si se proporciona un tipo, filtrar por ese tipo
      if (type) {
        query.type = type;
      }
      
      const categories = await Transaction.distinct('category', query);
      return categories;
    } catch (error) {
      console.error(`Error fetching transaction categories for user ${userId}:`, error);
      throw error;
    }
  }
  
  static async getTransactionsSummary(userId: string): Promise<{ total: number, currentMonth: number, currentYear: number }> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Fechas para los filtros
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      
      // Pipeline de agregación para calcular los balances
      const summary = await Transaction.aggregate([
        { $match: { userId } },
        {
          $facet: {
            total: [
              { $group: { _id: null, sum: { $sum: "$amount" } } }
            ],
            currentMonth: [
              { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
              { $group: { _id: null, sum: { $sum: "$amount" } } }
            ],
            currentYear: [
              { $match: { date: { $gte: startOfYear, $lte: endOfYear } } },
              { $group: { _id: null, sum: { $sum: "$amount" } } }
            ]
          }
        }
      ]);
      
      // Extraer los resultados o devolver 0 si no hay datos
      const result = summary[0];
      return {
        total: result.total[0]?.sum || 0,
        currentMonth: result.currentMonth[0]?.sum || 0,
        currentYear: result.currentYear[0]?.sum || 0
      };
    } catch (error) {
      console.error(`Error fetching transactions summary for user ${userId}:`, error);
      throw error;
    }
  }

  static async createTransaction(data: ICreateTransactionData): Promise<ITransaction> {
    try {
      // Asegurarse de que los montos de los gastos sean negativos
      const transactionData = { ...data };
      
      if (transactionData.type === 'expense') {
        // Si es un gasto, asegurarse de que el monto sea negativo
        if (transactionData.amount > 0) {
          transactionData.amount = -transactionData.amount;
          console.log(`Converted positive expense amount to negative: ${transactionData.amount}`);
        }
      } else if (transactionData.type === 'income') {
        // Si es un ingreso, asegurarse de que el monto sea positivo
        if (transactionData.amount < 0) {
          transactionData.amount = Math.abs(transactionData.amount);
          console.log(`Converted negative income amount to positive: ${transactionData.amount}`);
        }
      }
      
      const transaction = new Transaction(transactionData);
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
