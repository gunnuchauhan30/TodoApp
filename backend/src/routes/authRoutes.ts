import express from 'express';
import {
  signup,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.post('/signup', authLimiter, asyncHandler(signup));
router.post('/login', authLimiter, asyncHandler(login));
router.post('/refresh', authLimiter, asyncHandler(refresh));
router.post('/logout', protect, asyncHandler(logout));
router.post('/forgot-password', authLimiter, asyncHandler(forgotPassword));
router.post('/reset-password/:resetToken', authLimiter, asyncHandler(resetPassword));
router.get('/me', protect, asyncHandler(getMe));
router.patch('/profile', protect, asyncHandler(updateProfile));
router.patch('/password', protect, authLimiter, asyncHandler(changePassword));
router.delete('/account', protect, authLimiter, asyncHandler(deleteAccount));

export default router;
