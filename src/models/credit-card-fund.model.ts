import mongoose, { Schema, Document } from 'mongoose';
import { ICreditCardFund } from '../interfaces/credit-card.interface';

export interface ICreditCardFundDocument extends ICreditCardFund, Document {}

const creditCardFundSchema = new Schema({
  monthlyContribution: {
    type: Number,
    required: true,
    min: 0
  },
  accumulatedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  lastUpdateDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Asegurar que solo haya un fondo por usuario
creditCardFundSchema.index({ userId: 1 }, { unique: true });

export const CreditCardFund = mongoose.model<ICreditCardFundDocument>('CreditCardFund', creditCardFundSchema);
