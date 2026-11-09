import { Router } from 'express';
import { UsersController } from './users.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser, requireRole } from '../../middleware/rbac';
import { UserRole } from '@trustvault/database';

const router = Router();

router.use(requireAuthentication, requireActiveUser);

// User search and listing: accessible to authenticated active users (for sharing and user directory)
router.get('/', UsersController.list);
router.get('/:id', UsersController.getById);

// Role modification: strictly ADMIN only
router.patch('/:id/role', UsersController.updateRole);

// Status modification (activate/deactivate): strictly ADMIN only
router.patch('/:id/status', requireRole(UserRole.ADMIN), UsersController.updateStatus);

export default router;

