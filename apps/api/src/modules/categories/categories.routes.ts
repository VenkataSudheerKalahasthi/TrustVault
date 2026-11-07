import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser, requireRole } from '../../middleware/rbac';
import { UserRole } from '@trustvault/database';

const router = Router();

router.use(requireAuthentication, requireActiveUser);

router.get('/', CategoriesController.list);
router.post('/', requireRole(UserRole.ADMIN, UserRole.DOCUMENT_OWNER), CategoriesController.create);
router.patch('/:id', requireRole(UserRole.ADMIN, UserRole.DOCUMENT_OWNER), CategoriesController.update);
router.delete('/:id', requireRole(UserRole.ADMIN), CategoriesController.delete);

export default router;
