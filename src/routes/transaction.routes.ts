import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { body } from 'express-validator';
import { TransactionType } from '../interfaces/transaction.interface';

const router = Router();

const validateTransaction = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('type')
    .isIn(Object.values(TransactionType))
    .withMessage('Type must be either income or expense'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('description')
    .optional()
    .trim()
    .isString()
    .withMessage('Description must be a string')
];

router.get('/', TransactionController.getTransactions);
router.post('/', validateTransaction, TransactionController.createTransaction);

export default router;
