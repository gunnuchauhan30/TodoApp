import express from 'express';
import {
  getTodos,
  getTags,
  getTodo,
  createTodo,
  updateTodo,
  deleteTodo,
  restoreTodo,
  toggleTodo,
  reorderTodos,
  addAttachment,
  deleteAttachment,
  getTrash,
  permanentDelete,
  emptyTrash,
  bulkUpdate,
  exportTodos,
  importTodos
} from '../controllers/todoController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

const router = express.Router();
const h = asyncHandler<AuthRequest>;

router.use(protect);

router.route('/').get(h(getTodos)).post(h(createTodo));
// Static paths must be declared before '/:id'
router.get('/tags', h(getTags));
router.get('/trash', h(getTrash));
router.delete('/trash', h(emptyTrash));
router.get('/export', h(exportTodos));
router.post('/import', h(importTodos));
router.post('/bulk', h(bulkUpdate));
router.patch('/reorder', h(reorderTodos));

router.route('/:id').get(h(getTodo)).put(h(updateTodo)).delete(h(deleteTodo));
router.patch('/:id/toggle', h(toggleTodo));
router.patch('/:id/restore', h(restoreTodo));
router.delete('/:id/permanent', h(permanentDelete));
router.post('/:id/attachments', upload.single('file'), h(addAttachment));
router.delete('/:id/attachments/:attachmentId', h(deleteAttachment));

export default router;
