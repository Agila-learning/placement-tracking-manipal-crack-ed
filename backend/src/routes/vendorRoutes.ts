import { Router } from 'express';
import {
  getVendors,
  createVendor,
  updateVendor,
  toggleVendorStatus,
} from '../controllers/vendorController';
import { authenticateToken } from '../middleware/auth';
import { adminAndAbove } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// All authenticated roles can read vendors for dropdowns/filters
router.get('/', getVendors);

// Admin / Super Admin can manage
router.post('/', adminAndAbove, createVendor);
router.put('/:id', adminAndAbove, updateVendor);
router.patch('/:id/status', adminAndAbove, toggleVendorStatus);

export default router;

