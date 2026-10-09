import fs from 'fs';
import path from 'path';
import { uploadDir } from '../middleware/upload';

// Best-effort removal of uploaded attachment files from disk
export const removeAttachmentFiles = (filenames: string[]): void => {
  for (const name of filenames) fs.unlink(path.join(uploadDir, path.basename(name)), () => undefined);
};
