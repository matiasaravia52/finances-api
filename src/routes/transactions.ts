import { Router } from 'express';

const router = Router();

// Get all transactions
router.get('/', (req, res) => {
  // Logic to get all transactions
  res.send('All transactions');
});

// Add income transaction
router.post('/income', (req, res) => {
  const { amount, category } = req.body;
  // Logic to add income transaction
  res.send('Income transaction added');
});

// Add expense transaction
router.post('/expense', (req, res) => {
  const { amount, category } = req.body;
  // Logic to add expense transaction
  res.send('Expense transaction added');
});

export default router;
