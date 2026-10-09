import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { Todo } from '../models/Todo';
import { removeAttachmentFiles } from '../utils/files';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken } from '../utils/jwt';
import { sendEmail } from '../utils/email';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/HttpError';
import { AuthRequest, IUser } from '../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const publicUser = (user: IUser) => ({ id: user._id, name: user.name, email: user.email });

// Issues a short-lived access token + a rotating refresh token (stored hashed)
const issueTokens = async (user: IUser) => {
  const payload = { id: user._id.toString(), email: user.email };
  const token = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(refreshToken) });
  return { token, refreshToken };
};

// @route POST /api/v1/auth/signup
export const signup = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    throw new HttpError(400, 'Please provide all required fields (name, email, password)');
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) throw new HttpError(400, 'Please provide a valid email');
  if (typeof password !== 'string' || password.length < 6)
    throw new HttpError(400, 'Password must be at least 6 characters');

  if (await User.findOne({ email: email.toLowerCase() }))
    throw new HttpError(400, 'User already exists with this email');

  const user = await User.create({ name, email, password });
  const tokens = await issueTokens(user);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { ...tokens, user: publicUser(user) }
  });
};

// @route POST /api/v1/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Please provide email and password');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new HttpError(401, 'Invalid credentials');

  const tokens = await issueTokens(user);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { ...tokens, user: publicUser(user) }
  });
};

// @route POST /api/v1/auth/refresh  - exchanges a valid refresh token for a new pair (rotation)
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== 'string') throw new HttpError(400, 'Refresh token is required');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.id).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw new HttpError(401, 'Refresh token has been revoked');
  }

  const tokens = await issueTokens(user);
  res.status(200).json({ success: true, message: 'Token refreshed', data: { ...tokens, user: publicUser(user) } });
};

// @route POST /api/v1/auth/logout  - revokes the refresh token
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user) await User.updateOne({ _id: req.user.id }, { $unset: { refreshTokenHash: 1 } });
  res.status(200).json({ success: true, message: 'Logged out' });
};

// @route POST /api/v1/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') throw new HttpError(400, 'Please provide an email');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new HttpError(404, 'No user found with this email');

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  const isProd = process.env.NODE_ENV === 'production';
  const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

  // Dev convenience: with no SMTP configured, return the link instead of failing
  if (!emailConfigured && !isProd) {
    logger.warn(`Email not configured. Password reset link: ${resetUrl}`);
    res.status(200).json({
      success: true,
      message: 'Email is not configured (dev mode). Use the reset link below.',
      data: { resetToken, resetUrl }
    });
    return;
  }

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message: `You requested a password reset. Open this link:\n\n${resetUrl}\n\nIt expires in 10 minutes. If you did not request this, ignore this email.`
    });
  } catch {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    throw new HttpError(500, 'Email could not be sent');
  }

  res
    .status(200)
    .json({ success: true, message: 'Password reset email sent', data: isProd ? undefined : { resetToken, resetUrl } });
};

// @route POST /api/v1/auth/reset-password/:resetToken
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  const hashed = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');
  const user = await User.findOne({ resetPasswordToken: hashed, resetPasswordExpire: { $gt: new Date() } });
  if (!user) throw new HttpError(400, 'Invalid or expired reset token');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const tokens = await issueTokens(user);
  res
    .status(200)
    .json({ success: true, message: 'Password reset successful', data: { ...tokens, user: publicUser(user) } });
};

// @route GET /api/v1/auth/me
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user ? await User.findById(req.user.id) : null;
  if (!user) throw new HttpError(404, 'User not found');
  res.status(200).json({ success: true, data: { user: publicUser(user) } });
};

// @route PATCH /api/v1/auth/profile  body: { name }
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (name.length < 2 || name.length > 50) throw new HttpError(400, 'Name must be between 2 and 50 characters');

  const user = await User.findById(req.user?.id);
  if (!user) throw new HttpError(404, 'User not found');
  user.name = name;
  await user.save();
  res.status(200).json({ success: true, message: 'Profile updated', data: { user: publicUser(user) } });
};

// @route PATCH /api/v1/auth/password  body: { currentPassword, newPassword }
// Rotates the refresh token, so every other logged-in device is signed out.
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    throw new HttpError(400, 'Current and new password are required');
  }
  if (newPassword.length < 6) throw new HttpError(400, 'New password must be at least 6 characters');
  if (newPassword === currentPassword) throw new HttpError(400, 'New password must be different from the current one');

  const user = await User.findById(req.user?.id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword)))
    throw new HttpError(401, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();
  const tokens = await issueTokens(user);
  res.status(200).json({ success: true, message: 'Password changed', data: { ...tokens, user: publicUser(user) } });
};

// @route DELETE /api/v1/auth/account  body: { password }  - removes the user and ALL their data
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const { password } = req.body;
  if (typeof password !== 'string' || !password)
    throw new HttpError(400, 'Password is required to delete your account');

  const user = await User.findById(req.user?.id).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new HttpError(401, 'Password is incorrect');

  const todos = await Todo.find({ user: user._id.toString() }).select('attachments');
  removeAttachmentFiles(todos.flatMap((t) => t.attachments.map((a) => a.filename)));
  await Todo.deleteMany({ user: user._id.toString() });
  await user.deleteOne();
  res.status(200).json({ success: true, message: 'Account deleted' });
};
