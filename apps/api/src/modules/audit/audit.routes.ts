import { Router } from 'express';
import { AuditController } from './audit.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser, requireRole } from '../../middleware/rbac';
import { UserRole } from '@trustvault/database';

const router = Router();

router.use(requireAuthentication, requireActiveUser);

// List audit logs: accessible to Admin and Document Owner
router.get('/', requireRole(UserRole.ADMIN, UserRole.DOCUMENT_OWNER), AuditController.list);

// Verify audit chain: accessible to Admin
router.get('/verify', requireRole(UserRole.ADMIN), AuditController.verifyChain);

// Get audit log detail
router.get('/:id', requireRole(UserRole.ADMIN, UserRole.DOCUMENT_OWNER), AuditController.getById);

// Mandatory Adversarial Scenario 7: Explicitly reject any update or delete attempts on audit logs
router.put('/:id', AuditController.rejectTamperAttempt);
router.patch('/:id', AuditController.rejectTamperAttempt);
router.delete('/:id', AuditController.rejectTamperAttempt);

export default router;
