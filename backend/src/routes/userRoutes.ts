import { Router } from 'express';
import {
  getUsers,
  getHRExecutives,
  createUser,
  updateUser,
  toggleUserStatus,
} from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { adminAndAbove } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// Accessible by HR and above to populate HR reference dropdown
router.get('/hr-references', getHRExecutives);

// Admin-only user management
router.get('/', adminAndAbove, getUsers);
router.post('/', adminAndAbove, createUser);
router.put('/:id', adminAndAbove, updateUser);
router.patch('/:id/status', adminAndAbove, toggleUserStatus);

export default router;

