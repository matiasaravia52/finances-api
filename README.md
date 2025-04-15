# Finance App Backend

A robust and scalable RESTful API built with Node.js, Express, TypeScript, and MongoDB to manage personal finances.

## 🚀 Features

- **Transaction Management**: Create, retrieve, update, and delete financial transactions
- **Transaction Filtering**: Filter transactions by period, type, and category
- **Transaction Pagination**: Paginated transaction results for better performance
- **Category Management**: Get transaction categories with optional type filtering
- **Financial Summaries**: Get financial summaries for different time periods
- **Type Safety**: Built with TypeScript for better development experience
- **Clean Architecture**: Follows SOLID principles and clean code practices
- **Testing**: Comprehensive unit tests with Jest
- **Error Handling**: Centralized error handling middleware
- **Input Validation**: Request validation using express-validator
- **MongoDB Integration**: Mongoose ODM for MongoDB interaction
- **Environment Configuration**: Dotenv for environment variable management
- **Authentication**: JWT-based authentication system

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
│   ├── auth.controller.ts       # Authentication controller
│   ├── transaction.controller.ts # Transaction controller
│   └── user.controller.ts       # User controller
├── interfaces/     # TypeScript interfaces
│   ├── auth.interface.ts        # Authentication interfaces
│   ├── transaction.interface.ts  # Transaction interfaces
│   └── user.interface.ts        # User interfaces
├── middlewares/    # Express middlewares
│   ├── auth.middleware.ts       # Authentication middleware
│   ├── error.middleware.ts      # Error handling middleware
│   └── validation.middleware.ts # Input validation middleware
├── models/         # Mongoose models
│   ├── transaction.model.ts     # Transaction model
│   └── user.model.ts           # User model
├── routes/         # API routes
│   ├── auth.routes.ts          # Authentication routes
│   ├── transaction.routes.ts    # Transaction routes
│   └── user.routes.ts          # User routes
├── services/       # Business logic
│   ├── auth.service.ts         # Authentication service
│   ├── transaction.service.ts   # Transaction service
│   └── user.service.ts         # User service
├── utils/          # Utility functions
│   ├── jwt.utils.ts            # JWT utilities
│   └── password.utils.ts       # Password utilities
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

### Authentication

#### Register a new user
- **POST** `/api/auth/register`
- **Body**: `{ "email": "user@example.com", "password": "password123", "name": "John Doe" }`
- **Response**: `{ "success": true, "data": { "token": "jwt_token", "user": { "id": "user_id", "email": "user@example.com", "name": "John Doe" } } }`

#### Login
- **POST** `/api/auth/login`
- **Body**: `{ "email": "user@example.com", "password": "password123" }`
- **Response**: `{ "success": true, "data": { "token": "jwt_token", "user": { "id": "user_id", "email": "user@example.com", "name": "John Doe" } } }`

### Transactions

#### Get transactions (with pagination and filtering)
- **GET** `/api/transactions?period=current-month&type=income&category=Salary&page=1&limit=10`
- **Headers**: `{ "Authorization": "Bearer jwt_token" }`
- **Query Parameters**:
  - `period`: Filter by period (`all`, `current-month`, `last-month`, `current-year`)
  - `type`: Filter by transaction type (`income`, `expense`)
  - `category`: Filter by category
  - `page`: Page number for pagination
  - `limit`: Number of items per page
- **Response**: 
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "transaction_id",
        "type": "income",
        "amount": 1000,
        "category": "Salary",
        "description": "Monthly salary",
        "date": "2023-01-01T00:00:00.000Z",
        "userId": "user_id",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

#### Get transaction categories (with optional type filtering)
- **GET** `/api/transactions/categories?type=income`
- **Headers**: `{ "Authorization": "Bearer jwt_token" }`
- **Query Parameters**:
  - `type`: Filter categories by transaction type (`income`, `expense`)
- **Response**: `{ "success": true, "data": ["Salary", "Freelance", "Investments"] }`

#### Get transactions summary
- **GET** `/api/transactions/summary`
- **Headers**: `{ "Authorization": "Bearer jwt_token" }`
- **Response**: `{ "success": true, "data": { "total": 5000, "currentMonth": 1000, "currentYear": 3000 } }`

#### Create a transaction
- **POST** `/api/transactions`
- **Headers**: `{ "Authorization": "Bearer jwt_token" }`
- **Body**: `{ "type": "income", "amount": 1000, "category": "Salary", "description": "Monthly salary" }`
- **Response**: `{ "success": true, "data": { "_id": "transaction_id", "type": "income", "amount": 1000, "category": "Salary", "description": "Monthly salary", "date": "2023-01-01T00:00:00.000Z", "userId": "user_id", "createdAt": "2023-01-01T00:00:00.000Z", "updatedAt": "2023-01-01T00:00:00.000Z" } }`

#### Update a transaction
- **PUT** `/api/transactions/:id`
- **Headers**: `{ "Authorization": "Bearer jwt_token" }`
- **Body**: `{ "amount": 1500, "category": "Bonus", "description": "Quarterly bonus" }`
- **Response**: `{ "success": true, "data": { "_id": "transaction_id", "type": "income", "amount": 1500, "category": "Bonus", "description": "Quarterly bonus", "date": "2023-01-01T00:00:00.000Z", "userId": "user_id", "createdAt": "2023-01-01T00:00:00.000Z", "updatedAt": "2023-01-01T00:00:00.000Z" } }`

#### Delete a transaction
- **DELETE** `/api/transactions/:id`
- **Headers**: `{ "Authorization": "Bearer jwt_token" }`
- **Response**: `{ "success": true, "data": true }`

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
