import { Request, Response } from 'express';
import { TransactionController } from '../../controllers/transaction.controller';
import { TransactionService } from '../../services/transaction.service';
import { TransactionType } from '../../interfaces/transaction.interface';

// Mock TransactionService
jest.mock('../../services/transaction.service');

describe('TransactionController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    responseObject = {
      success: true,
      data: {}
    };

    mockRequest = {
      body: {
        userId: 'test-user'
      },
      query: {}
    };

    mockResponse = {
      json: jest.fn().mockReturnValue(responseObject),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getTransactions', () => {
    const mockTransactions = [
      {
        amount: 1000,
        type: TransactionType.INCOME,
        category: 'Salary',
        description: 'Monthly salary',
        date: new Date(),
        userId: 'test-user'
      }
    ];

    it('should return transactions successfully', async () => {
      // Mock the service method
      (TransactionService.getTransactionsByUserId as jest.Mock).mockResolvedValue(mockTransactions);

      await TransactionController.getTransactions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTransactions
      });
    });

    it('should handle errors when fetching transactions fails', async () => {
      const error = new Error('Database error');
      (TransactionService.getTransactionsByUserId as jest.Mock).mockRejectedValue(error);

      await TransactionController.getTransactions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error fetching transactions'
      });
    });
  });

  describe('createTransaction', () => {
    const mockTransaction = {
      amount: 1000,
      type: TransactionType.INCOME,
      category: 'Salary',
      description: 'Monthly salary'
    };

    it('should create a transaction successfully', async () => {
      mockRequest.body = mockTransaction;
      (TransactionService.createTransaction as jest.Mock).mockResolvedValue(mockTransaction);

      await TransactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTransaction
      });
    });

    it('should handle errors when creating transaction fails', async () => {
      mockRequest.body = mockTransaction;
      const error = new Error('Database error');
      (TransactionService.createTransaction as jest.Mock).mockRejectedValue(error);

      await TransactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error creating transaction'
      });
    });
  });
});
