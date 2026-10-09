import os from 'os';
import path from 'path';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'todo-test-uploads');
