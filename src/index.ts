import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import transactionRoutes from './routes/transaction.routes';
import userRoutes from './routes/user.routes';
import creditCardRoutes from './routes/credit-card.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/credit-card', creditCardRoutes);

// Error Handler
app.use(errorHandler);

// Connect to Database
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
