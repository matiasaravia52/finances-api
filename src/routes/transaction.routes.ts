import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { body } from 'express-validator';
import { TransactionType } from '../interfaces/transaction.interface';
import { authMiddleware } from '../middlewares/auth.middleware';

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

// Proteger todas las rutas con el middleware de autenticación
router.use(authMiddleware);

router.get('/', TransactionController.getTransactions);
router.post('/', validateTransaction, TransactionController.createTransaction);
router.put('/:id', validateTransaction, TransactionController.updateTransaction);
router.delete('/:id', TransactionController.deleteTransaction);

export default router;
