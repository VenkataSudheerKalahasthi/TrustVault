import { Router } from 'express';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import documentsRoutes from './modules/documents/documents.routes';
import permissionsRoutes from './modules/permissions/permissions.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import auditRoutes from './modules/audit/audit.routes';
import adminRoutes from './modules/admin/admin.routes';
import searchRoutes from './modules/search/search.routes';
import aiSuggestionsRoutes from './modules/ai-suggestions/aiSuggestions.routes';

const apiRouter = Router();

// Health routes
apiRouter.use('/', healthRoutes);

// Authentication
apiRouter.use('/auth', authRoutes);

// Users
apiRouter.use('/users', usersRoutes);

// Documents
apiRouter.use('/documents', documentsRoutes);

// Permissions (nested under documents)
apiRouter.use('/documents/:id/permissions', permissionsRoutes);

// Categories
apiRouter.use('/categories', categoriesRoutes);

// Audit Trail
apiRouter.use('/audit-logs', auditRoutes);

// Admin Monitoring & Management
apiRouter.use('/admin', adminRoutes);

// Search
apiRouter.use('/search', searchRoutes);

// AI-assisted access suggestions
apiRouter.use('/', aiSuggestionsRoutes);

export default apiRouter;

