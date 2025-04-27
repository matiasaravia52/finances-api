import { CreditCardFund } from '../models/credit-card-fund.model';
import { 
  ICreditCardFund, 
  ICreditCardFundCreate, 
  ICreditCardFundUpdate 
} from '../interfaces/credit-card.interface';
import { ICreditCardFundRepository } from '../interfaces/repositories/credit-card-fund.repository.interface';

export class CreditCardFundRepository implements ICreditCardFundRepository {
  async getFund(userId: string): Promise<ICreditCardFund | null> {
    try {
      return await CreditCardFund.findOne({ userId });
    } catch (error) {
      console.error(`Error fetching credit card fund for user ${userId}:`, error);
      throw error;
    }
  }

  async createFund(fundData: ICreditCardFundCreate): Promise<ICreditCardFund> {
    try {
      const existingFund = await CreditCardFund.findOne({ userId: fundData.userId });
      
      if (existingFund) {
        throw new Error('Credit card fund already exists for this user');
      }
      
      // Si no se proporciona un valor para maxMonthlyContribution, usar el doble de la contribución mensual
      if (!fundData.maxMonthlyContribution) {
        fundData.maxMonthlyContribution = fundData.monthlyContribution * 2;
      }
      
      // Si no se proporciona un valor para accumulatedAmount, usar 0
      if (fundData.accumulatedAmount === undefined) {
        fundData.accumulatedAmount = 0;
      }
      
      const fund = new CreditCardFund(fundData);
      return await fund.save();
    } catch (error) {
      console.error('Error creating credit card fund:', error);
      throw error;
    }
  }

  async updateFund(userId: string, updateData: ICreditCardFundUpdate): Promise<ICreditCardFund | null> {
    try {
      const fund = await CreditCardFund.findOne({ userId });
      
      if (!fund) {
        return null;
      }
      
      // Actualizar los campos proporcionados
      if (updateData.monthlyContribution !== undefined) {
        fund.monthlyContribution = updateData.monthlyContribution;
      }
      
      if (updateData.maxMonthlyContribution !== undefined) {
        fund.maxMonthlyContribution = updateData.maxMonthlyContribution;
      }
      
      if (updateData.accumulatedAmount !== undefined) {
        fund.accumulatedAmount = updateData.accumulatedAmount;
      }
      
      // Si se actualiza la contribución mensual pero no el máximo, actualizar el máximo automáticamente
      if (updateData.monthlyContribution !== undefined && updateData.maxMonthlyContribution === undefined) {
        fund.maxMonthlyContribution = fund.monthlyContribution * 2;
      }
      
      return await fund.save();
    } catch (error) {
      console.error(`Error updating credit card fund for user ${userId}:`, error);
      throw error;
    }
  }
}
