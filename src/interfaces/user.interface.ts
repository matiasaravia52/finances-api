export interface IUser {
  email: string;
  password: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserCreate {
  email: string;
  password: string;
  name: string;
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IUserResponse {
  _id: string;
  email: string;
  name: string;
  token?: string;
}
