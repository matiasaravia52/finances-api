import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { IUserCreate, IUserLogin } from '../interfaces/user.interface';

export class UserController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userData: IUserCreate = req.body;
      const newUser = await UserService.createUser(userData);
      
      res.status(201).json({
        success: true,
        data: newUser
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const loginData: IUserLogin = req.body;
      const user = await UserService.loginUser(loginData);
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      // The userId is attached to the request by the auth middleware
      const userId = req.body.userId;
      const user = await UserService.getUserById(userId);
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}
