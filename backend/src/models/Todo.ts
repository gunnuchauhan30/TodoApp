import mongoose, { Schema } from 'mongoose';
import { ITodo } from '../types';

const subtaskSchema = new Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    completed: { type: Boolean, default: false }
  },
  { _id: true }
);

const attachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true }
  },
  { _id: true }
);

const todoSchema = new Schema<ITodo>(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    completed: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    priorityRank: { type: Number, default: 2 },
    recurrence: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    recurrenceSpawned: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    dueDate: { type: Date, default: null },
    subtasks: { type: [subtaskSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    order: { type: Number, default: () => Date.now() },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    user: { type: String, required: true, ref: 'User' }
  },
  { timestamps: true }
);

todoSchema.index({ user: 1, isDeleted: 1, order: -1 });
todoSchema.index({ user: 1, isDeleted: 1, tags: 1 });
todoSchema.index({ user: 1, isDeleted: 1, deletedAt: -1 });

export const Todo = mongoose.model<ITodo>('Todo', todoSchema);
