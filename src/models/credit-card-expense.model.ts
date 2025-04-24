import mongoose, { Schema, Document } from 'mongoose';
import { ICreditCardExpense, InstallmentStatus } from '../interfaces/credit-card.interface';

export interface ICreditCardExpenseDocument extends ICreditCardExpense, Document {}

const installmentSchema = new Schema({
  number: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(InstallmentStatus),
    default: InstallmentStatus.PENDING
  }
});

const creditCardExpenseSchema = new Schema({
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  totalInstallments: {
    type: Number,
    required: true,
    min: 1
  },
  installments: [installmentSchema],
  userId: {
    type: String,
    required: true
  },
  isSimulation: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const CreditCardExpense = mongoose.model<ICreditCardExpenseDocument>('CreditCardExpense', creditCardExpenseSchema);
