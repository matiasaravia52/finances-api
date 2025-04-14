import mongoose, { Schema, Document } from 'mongoose';
import { ITransaction, TransactionType } from '../interfaces/transaction.interface';

export interface ITransactionDocument extends ITransaction, Document {}

const transactionSchema = new Schema({
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(TransactionType),
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Transaction = mongoose.model<ITransactionDocument>('Transaction', transactionSchema);
