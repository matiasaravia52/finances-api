# Finance App Backend

A robust and scalable RESTful API built with Node.js, Express, TypeScript, and MongoDB to manage personal finances.

## 🚀 Features

- **Transaction Management**: Create and retrieve financial transactions
- **Type Safety**: Built with TypeScript for better development experience
- **Clean Architecture**: Follows SOLID principles and clean code practices
- **Testing**: Comprehensive unit tests with Jest
- **Error Handling**: Centralized error handling middleware
- **Input Validation**: Request validation using express-validator
- **MongoDB Integration**: Mongoose ODM for MongoDB interaction
- **Environment Configuration**: Dotenv for environment variable management

## 🛠️ Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- Jest (Testing)
- Express Validator

## 📁 Project Structure

```
src/
├── config/         # Configuration files and environment setup
├── controllers/    # Request handlers
├── interfaces/     # TypeScript interfaces
├── middlewares/    # Express middlewares
├── models/         # Mongoose models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── __tests__/     # Test files
```

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/finances-api.git
cd finances-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_uri
NODE_ENV=development
```

4. Start the development server:
```bash
npm run dev
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📚 API Documentation

### Transactions

#### GET /api/transactions
Get all transactions.

**Response**
```json
{
  "success": true,
  "data": [
    {
      "_id": "transaction_id",
      "type": "income",
      "amount": 1000,
      "category": "Salary",
      "description": "Monthly salary",
      "date": "2025-04-14",
      "userId": "user_id",
      "createdAt": "2025-04-14T20:00:00.000Z",
      "updatedAt": "2025-04-14T20:00:00.000Z"
    }
  ]
}
```

#### POST /api/transactions
Create a new transaction.

**Request Body**
```json
{
  "type": "income",
  "amount": 1000,
  "category": "Salary",
  "description": "Monthly salary"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "_id": "transaction_id",
    "type": "income",
    "amount": 1000,
    "category": "Salary",
    "description": "Monthly salary",
    "date": "2025-04-14",
    "userId": "user_id",
    "createdAt": "2025-04-14T20:00:00.000Z",
    "updatedAt": "2025-04-14T20:00:00.000Z"
  }
}
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
