import { ErrorLog } from '../models/ErrorLog';
import { logger } from './logger';

interface LogErrorParams {
  errorMessage: string;
  errorStack?: string;
  endpoint: string;
  method: string;
  userId?: string;
  statusCode: number;
}

export const logError = async (params: LogErrorParams): Promise<void> => {
  try {
    await ErrorLog.create({ ...params, timestamp: new Date() });
  } catch (error) {
    logger.error(`Failed to log error to database: ${error instanceof Error ? error.message : error}`);
  }
};
