import { Router } from 'express';
import { CreditCardController } from '../controllers/credit-card.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para el fondo de tarjeta de crédito
router.get('/fund', CreditCardController.getFund);
router.post('/fund', CreditCardController.createOrUpdateFund);
router.post('/fund/update-accumulated', CreditCardController.updateAccumulatedAmount);

// Rutas para los gastos de tarjeta de crédito
router.get('/expenses', CreditCardController.getExpenses);
router.get('/expenses/:id', CreditCardController.getExpenseById);
router.post('/expenses', CreditCardController.createExpense);
router.put('/expenses/:id/execute', CreditCardController.executeExpense);
router.put('/expenses/:id/installment', CreditCardController.updateInstallmentStatus);
router.put('/expenses/:id/purchase-date', CreditCardController.updatePurchaseDate);
router.delete('/expenses/:id', CreditCardController.deleteExpense);

// Ruta para simular un gasto
router.post('/simulate', CreditCardController.simulateExpense);

export default router;
