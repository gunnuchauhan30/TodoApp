import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => `${ts} ${level}: ${stack || message}`)
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    silent: process.env.NODE_ENV === 'test',
    format: process.env.NODE_ENV === 'production' ? combine(timestamp(), errors({ stack: true }), json()) : devFormat
  })
];

// Optional file logging (LOG_TO_FILE=true) - off by default so containers stay stateless
if (process.env.LOG_TO_FILE === 'true') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports
});
