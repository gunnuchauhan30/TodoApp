import nodemailer from 'nodemailer';
import { logger } from './logger';

interface SendEmailParams {
  email: string;
  subject: string;
  message: string;
}

export const sendEmail = async (options: SendEmailParams): Promise<void> => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@todoapp.com',
      to: options.email,
      subject: options.subject,
      text: options.message
    };

    // Send email
    await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully');
  } catch (error) {
    logger.error(`Error sending email: ${error}`);
    throw new Error('Email could not be sent');
  }
};
