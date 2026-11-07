import { Router } from 'express';
import { AdminController } from './admin.controller';
import { CategoriesController } from '../categories/categories.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser, requireRole } from '../../middleware/rbac';
import { UserRole } from '@trustvault/database';

const router = Router();

// Strict Admin-only middleware pipeline
router.use(requireAuthentication, requireActiveUser, requireRole(UserRole.ADMIN));

// 1. Dashboard & Activity Telemetry
router.get('/dashboard', AdminController.getDashboardStats);
router.get('/activity', AdminController.getActivityMonitoring);

// 2. Document & Permissions Global Monitoring
router.get('/documents', AdminController.getDocuments);
router.get('/permissions', AdminController.getPermissions);

// 3. Security Monitoring & Incidents
router.get('/security', AdminController.getSecurityMonitoring);

// 4. Category Governance & Management
router.get('/categories', CategoriesController.list);
router.post('/categories', CategoriesController.create);
router.patch('/categories/:id', CategoriesController.update);
router.delete('/categories/:id', CategoriesController.delete);

// 5. System Invariants & Environment Settings
router.get('/settings', AdminController.getSystemSettings);

// 6. Admin Profile
router.get('/profile', AdminController.getAdminProfile);
router.patch('/profile', AdminController.updateAdminProfile);

export default router;
