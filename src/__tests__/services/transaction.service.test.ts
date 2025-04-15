import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../models/transaction.model';
import { TransactionType } from '../../interfaces/transaction.interface';

// Mock Transaction model
jest.mock('../../models/transaction.model');

describe('TransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('should return all transactions sorted by date', async () => {
      const mockTransactions = [
        {
          amount: 1000,
          type: TransactionType.INCOME,
          category: 'Salary',
          date: new Date(),
        },
        {
          amount: 500,
          type: TransactionType.EXPENSE,
          category: 'Food',
          date: new Date(),
        }
      ];

      // Mock the find and sort methods
      const sortMock = jest.fn().mockResolvedValue(mockTransactions);
      (Transaction.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const result = await TransactionService.getTransactions();

      expect(Transaction.find).toHaveBeenCalled();
      expect(sortMock).toHaveBeenCalledWith({ date: -1 });
      expect(result).toEqual(mockTransactions);
    });

    it('should throw an error when database query fails', async () => {
      const error = new Error('Database error');
      const sortMock = jest.fn().mockRejectedValue(error);
      (Transaction.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await expect(TransactionService.getTransactions()).rejects.toThrow('Database error');
    });
  });

  describe('createTransaction', () => {
    const mockTransactionData = {
      amount: 1000,
      type: TransactionType.INCOME,
      category: 'Salary',
      description: 'Monthly salary',
      userId: 'test-user-id'
    };

    it('should create and return a new transaction', async () => {
      const mockSavedTransaction = {
        ...mockTransactionData,
        userId: 'temp-user',
        date: new Date(),
        _id: 'mock-id'
      };

      const saveMock = jest.fn().mockResolvedValue(mockSavedTransaction);
      (Transaction as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock
      }));

      const result = await TransactionService.createTransaction(mockTransactionData);

      expect(Transaction).toHaveBeenCalledWith(mockTransactionData);
      expect(result).toEqual(mockSavedTransaction);
    });

    it('should throw an error when saving fails', async () => {
      const error = new Error('Database error');
      const saveMock = jest.fn().mockRejectedValue(error);
      
      (Transaction as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock
      }));

      await expect(TransactionService.createTransaction(mockTransactionData)).rejects.toThrow('Database error');
    });
  });
});
