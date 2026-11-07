import { Router } from 'express';
import {
  getBanks,
  createBank,
  updateBank,
  toggleBankStatus,
} from '../controllers/bankController';
import { authenticateToken } from '../middleware/auth';
import { adminAndAbove } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// All authenticated roles can read banks for dropdowns/filters
router.get('/', getBanks);

// Admin / Super Admin can manage
router.post('/', adminAndAbove, createBank);
router.put('/:id', adminAndAbove, updateBank);
router.patch('/:id/status', adminAndAbove, toggleBankStatus);

export default router;

