import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUserDocument } from '../models/user.model';
import { IUserCreate, IUserLogin, IUserResponse } from '../interfaces/user.interface';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class UserService {
  static async createUser(userData: IUserCreate): Promise<IUserResponse> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate token
    const token = this.generateToken(user);

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      token
    };
  }

  static async loginUser(loginData: IUserLogin): Promise<IUserResponse> {
    // Find user by email
    const user = await User.findOne({ email: loginData.email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(loginData.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      token
    };
  }

  static async getUserById(userId: string): Promise<IUserResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name
    };
  }

  static generateToken(user: IUserDocument): string {
    const payload = { userId: user._id.toString(), email: user.email };
    // Usar el tipo correcto para expiresIn
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
    return jwt.sign(payload, JWT_SECRET, options);
  }

  static verifyToken(token: string): { userId: string; email: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
