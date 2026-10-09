const bearer = [{ bearerAuth: [] }];
const ok = { description: 'Success' };
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const body = (props: Record<string, unknown>, required: string[] = []) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', required, properties: props } } }
});

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Todo API',
    version: '2.0.0',
    description: 'Production-grade Todo REST API (JWT access + refresh tokens).'
  },
  servers: [{ url: '/api/v1' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register',
        requestBody: body({ name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } }, [
          'name',
          'email',
          'password'
        ]),
        responses: { 201: ok }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: body({ email: { type: 'string' }, password: { type: 'string' } }, ['email', 'password']),
        responses: { 200: ok }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and get a new access token',
        requestBody: body({ refreshToken: { type: 'string' } }, ['refreshToken']),
        responses: { 200: ok }
      }
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Revoke refresh token', security: bearer, responses: { 200: ok } }
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        requestBody: body({ email: { type: 'string' } }, ['email']),
        responses: { 200: ok }
      }
    },
    '/auth/reset-password/{resetToken}': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password',
        parameters: [{ name: 'resetToken', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: body({ password: { type: 'string' } }, ['password']),
        responses: { 200: ok }
      }
    },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: bearer, responses: { 200: ok } } },
    '/auth/profile': {
      patch: {
        tags: ['Auth'],
        summary: 'Update display name',
        security: bearer,
        requestBody: body({ name: { type: 'string' } }, ['name']),
        responses: { 200: ok }
      }
    },
    '/auth/password': {
      patch: {
        tags: ['Auth'],
        summary: 'Change password (rotates refresh token)',
        security: bearer,
        requestBody: body({ currentPassword: { type: 'string' }, newPassword: { type: 'string' } }, [
          'currentPassword',
          'newPassword'
        ]),
        responses: { 200: ok }
      }
    },
    '/auth/account': {
      delete: {
        tags: ['Auth'],
        summary: 'Delete account and all data',
        security: bearer,
        requestBody: body({ password: { type: 'string' } }, ['password']),
        responses: { 200: ok }
      }
    },
    '/todos/trash': {
      get: { tags: ['Todos'], summary: 'List soft-deleted todos', security: bearer, responses: { 200: ok } },
      delete: { tags: ['Todos'], summary: 'Permanently empty the trash', security: bearer, responses: { 200: ok } }
    },
    '/todos/bulk': {
      post: {
        tags: ['Todos'],
        summary: 'Bulk action on up to 100 todos',
        security: bearer,
        requestBody: body(
          {
            ids: { type: 'array', items: { type: 'string' } },
            action: { type: 'string', enum: ['complete', 'pending', 'delete', 'priority', 'addTag', 'removeTag'] },
            value: { type: 'string' }
          },
          ['ids', 'action']
        ),
        responses: { 200: ok }
      }
    },
    '/todos/export': {
      get: {
        tags: ['Todos'],
        summary: 'Download all todos',
        security: bearer,
        parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'] } }],
        responses: { 200: ok }
      }
    },
    '/todos/import': {
      post: {
        tags: ['Todos'],
        summary: 'Import up to 500 todos (invalid rows are skipped)',
        security: bearer,
        requestBody: body({ todos: { type: 'array', items: { type: 'object' } } }, ['todos']),
        responses: { 201: ok }
      }
    },
    '/todos/{id}/permanent': {
      delete: {
        tags: ['Todos'],
        summary: 'Permanently delete a trashed todo',
        security: bearer,
        parameters: [idParam],
        responses: { 200: ok }
      }
    },
    '/todos': {
      get: {
        tags: ['Todos'],
        summary: 'List todos (paginated, searchable, filterable, sortable)',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'pending', 'completed', 'overdue'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
          { name: 'tag', in: 'query', schema: { type: 'string' } },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', enum: ['order', 'createdAt', 'dueDate', 'priority', 'title'] }
          },
          { name: 'dir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
        ],
        responses: { 200: ok }
      },
      post: {
        tags: ['Todos'],
        summary: 'Create todo',
        security: bearer,
        requestBody: body(
          {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            tags: { type: 'array', items: { type: 'string' } },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            subtasks: { type: 'array', items: { type: 'object' } }
          },
          ['title']
        ),
        responses: { 201: ok }
      }
    },
    '/todos/tags': {
      get: { tags: ['Todos'], summary: 'List distinct tags', security: bearer, responses: { 200: ok } }
    },
    '/todos/reorder': {
      patch: {
        tags: ['Todos'],
        summary: 'Persist drag-and-drop order',
        security: bearer,
        requestBody: body({ ids: { type: 'array', items: { type: 'string' } } }, ['ids']),
        responses: { 200: ok }
      }
    },
    '/todos/{id}': {
      get: { tags: ['Todos'], summary: 'Get todo', security: bearer, parameters: [idParam], responses: { 200: ok } },
      put: {
        tags: ['Todos'],
        summary: 'Update todo',
        security: bearer,
        parameters: [idParam],
        requestBody: body({ title: { type: 'string' } }),
        responses: { 200: ok }
      },
      delete: {
        tags: ['Todos'],
        summary: 'Soft-delete todo',
        security: bearer,
        parameters: [idParam],
        responses: { 200: ok }
      }
    },
    '/todos/{id}/toggle': {
      patch: {
        tags: ['Todos'],
        summary: 'Toggle completion',
        security: bearer,
        parameters: [idParam],
        responses: { 200: ok }
      }
    },
    '/todos/{id}/restore': {
      patch: {
        tags: ['Todos'],
        summary: 'Restore a soft-deleted todo',
        security: bearer,
        parameters: [idParam],
        responses: { 200: ok }
      }
    },
    '/todos/{id}/attachments': {
      post: {
        tags: ['Todos'],
        summary: 'Upload attachment (multipart, field "file", max 5MB)',
        security: bearer,
        parameters: [idParam],
        responses: { 201: ok }
      }
    },
    '/todos/{id}/attachments/{attachmentId}': {
      delete: {
        tags: ['Todos'],
        summary: 'Remove attachment',
        security: bearer,
        parameters: [idParam, { name: 'attachmentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok }
      }
    }
  }
};
