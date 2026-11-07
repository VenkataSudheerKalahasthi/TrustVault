import { Router } from 'express';
import { PermissionsController } from './permissions.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser } from '../../middleware/rbac';
import { requireDocumentPermission } from '../../middleware/documentAuth';
import { strictRateLimiter } from '../../middleware/rateLimiter';

const router = Router({ mergeParams: true });

router.use(requireAuthentication, requireActiveUser);

// Grant permission requires OWNER role on the document
router.post('/', strictRateLimiter, requireDocumentPermission('OWNER'), PermissionsController.grant);

// List permissions requires READ on metadata (or OWNER)
router.get('/', requireDocumentPermission('READ'), PermissionsController.list);

// Revoke permission requires OWNER role on the document
router.delete('/:permissionId', requireDocumentPermission('OWNER'), PermissionsController.revoke);
router.patch('/:permissionId/revoke', requireDocumentPermission('OWNER'), PermissionsController.revoke);

export default router;

