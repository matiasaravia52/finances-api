export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export interface ITransaction {
  amount: number;
  type: TransactionType;
  category: string;
  description?: string;
  date: Date;
  userId: string; // For future authentication implementation
}

export interface ITransactionCreate {
  amount: number;
  type: TransactionType;
  category: string;
  description?: string;
}
