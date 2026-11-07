import { Router } from 'express';
import { AdminController } from './admin.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser, requireRole } from '../../middleware/rbac';
import { UserRole } from '@trustvault/database';

const router = Router();

router.use(requireAuthentication, requireActiveUser, requireRole(UserRole.ADMIN));

router.get('/dashboard', AdminController.getDashboardStats);
router.get('/activity', AdminController.getActivityMonitoring);

export default router;
