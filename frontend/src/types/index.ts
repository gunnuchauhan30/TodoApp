import { z } from 'zod';

// ---------- Auth ----------
export const UserSchema = z.object({ id: z.string(), name: z.string(), email: z.string().email() });

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({ token: z.string(), refreshToken: z.string(), user: UserSchema })
});

export const SignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const ForgotPasswordSchema = z.object({ email: z.string().email('Invalid email address') });

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string()
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

// ---------- Todos ----------
export const PrioritySchema = z.enum(['low', 'medium', 'high']);

export const RecurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);

export const SubtaskSchema = z.object({ _id: z.string().optional(), text: z.string(), completed: z.boolean() });

export const AttachmentSchema = z.object({
  _id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  url: z.string(),
  size: z.number(),
  mimeType: z.string()
});

export const TodoSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  priority: PrioritySchema.default('medium'),
  recurrence: RecurrenceSchema.default('none'),
  tags: z.array(z.string()).default([]),
  dueDate: z.string().nullable().optional(),
  subtasks: z.array(SubtaskSchema).default([]),
  attachments: z.array(AttachmentSchema).default([]),
  order: z.number().optional(),
  deletedAt: z.string().nullable().optional(),
  user: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const TodosResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
  data: z.array(TodoSchema)
});

export const TodoResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: TodoSchema,
  nextTodo: TodoSchema.nullable().optional()
});

export const TrashResponseSchema = z.object({ success: z.boolean(), count: z.number(), data: z.array(TodoSchema) });

export const ProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long')
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string()
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

export const TagsResponseSchema = z.object({ success: z.boolean(), data: z.array(z.string()) });

// ---------- Types ----------
export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Recurrence = z.infer<typeof RecurrenceSchema>;
export type ProfileInput = z.infer<typeof ProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type BulkAction = 'complete' | 'pending' | 'delete' | 'priority' | 'addTag' | 'removeTag';
export type Subtask = z.infer<typeof SubtaskSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Todo = z.infer<typeof TodoSchema>;
export type TodosResponse = z.infer<typeof TodosResponseSchema>;
export type TodoResponse = z.infer<typeof TodoResponseSchema>;

export interface TodoInput {
  title: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  recurrence?: Recurrence;
  tags?: string[];
  dueDate?: string | null;
  subtasks?: Subtask[];
}

export type StatusFilter = 'all' | 'pending' | 'completed' | 'overdue';
export type SortBy = 'order' | 'createdAt' | 'dueDate' | 'priority' | 'title';

export interface TodoQuery {
  page: number;
  limit: number;
  search: string;
  status: StatusFilter;
  priority: Priority | '';
  tag: string;
  sortBy: SortBy;
  dir: 'asc' | 'desc' | '';
}
