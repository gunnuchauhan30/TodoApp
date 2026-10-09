import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type Priority = 'low' | 'medium' | 'high';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface ISubtask {
  _id?: Types.ObjectId;
  text: string;
  completed: boolean;
}

export interface IAttachment {
  _id?: Types.ObjectId;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(enteredPassword: string): Promise<boolean>;
}

export interface ITodo extends Document {
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  priorityRank: number;
  recurrence: Recurrence;
  recurrenceSpawned: boolean;
  tags: string[];
  dueDate?: Date | null;
  subtasks: ISubtask[];
  attachments: IAttachment[];
  order: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
  user: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IErrorLog extends Document {
  errorMessage: string;
  errorStack?: string;
  endpoint: string;
  method: string;
  userId?: string;
  statusCode: number;
  timestamp: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
}
