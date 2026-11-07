import { Router } from 'express';
import { DocumentsController } from './documents.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser } from '../../middleware/rbac';
import { requireDocumentPermission } from '../../middleware/documentAuth';
import { uploadMiddleware } from './documents.upload';
import { strictRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(requireAuthentication, requireActiveUser);

router.post('/', strictRateLimiter, uploadMiddleware.single('file'), DocumentsController.upload);
router.get('/', DocumentsController.list);

router.get('/:id', requireDocumentPermission('READ'), DocumentsController.getById);
router.patch('/:id', requireDocumentPermission('EDIT'), DocumentsController.update);
router.post('/:id/versions', strictRateLimiter, requireDocumentPermission('EDIT'), uploadMiddleware.single('file'), DocumentsController.createVersion);
router.delete('/:id', requireDocumentPermission('OWNER'), DocumentsController.delete);

// Binary streaming routes (enforce instant revocation & zero signed URLs)
router.get('/:id/content', requireDocumentPermission('READ'), DocumentsController.streamContent);
router.get('/:id/download', requireDocumentPermission('DOWNLOAD'), DocumentsController.streamDownload);

export default router;

