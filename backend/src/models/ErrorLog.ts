import mongoose, { Schema } from 'mongoose';
import { IErrorLog } from '../types';

const errorLogSchema = new Schema<IErrorLog>(
  {
    errorMessage: {
      type: String,
      required: true
    },
    errorStack: {
      type: String
    },
    endpoint: {
      type: String,
      required: true
    },
    method: {
      type: String,
      required: true
    },
    userId: {
      type: String
    },
    statusCode: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Index for faster queries
errorLogSchema.index({ timestamp: -1 });

export const ErrorLog = mongoose.model<IErrorLog>('ErrorLog', errorLogSchema);
