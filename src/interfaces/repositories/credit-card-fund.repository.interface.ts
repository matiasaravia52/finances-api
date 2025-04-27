import { 
  ICreditCardFund, 
  ICreditCardFundCreate, 
  ICreditCardFundUpdate 
} from '../credit-card.interface';

export interface ICreditCardFundRepository {
  getFund(userId: string): Promise<ICreditCardFund | null>;
  createFund(fundData: ICreditCardFundCreate): Promise<ICreditCardFund>;
  updateFund(userId: string, updateData: ICreditCardFundUpdate): Promise<ICreditCardFund | null>;
}
