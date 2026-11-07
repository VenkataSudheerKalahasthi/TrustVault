import { Router } from 'express';
import { AdminController } from './admin.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser, requireRole } from '../../middleware/rbac';
import { UserRole } from '@trustvault/database';

const router = Router();

router.use(requireAuthentication, requireActiveUser, requireRole(UserRole.ADMIN));

router.get('/dashboard', AdminController.getDashboardStats);
router.get('/activity', AdminController.getActivityMonitoring);
router.get('/documents', AdminController.getDocuments);
router.get('/permissions', AdminController.getPermissions);
router.get('/settings', AdminController.getSystemSettings);

export default router;
