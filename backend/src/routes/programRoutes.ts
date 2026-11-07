import { Router } from 'express';
import {
  getPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  toggleProgramStatus,
} from '../controllers/programController';
import { authenticateToken } from '../middleware/auth';
import { adminAndAbove } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// All authenticated roles can read programs for dropdowns/filters
router.get('/', getPrograms);
router.get('/:id', getProgramById);

// Admin / Super Admin can manage
router.post('/', adminAndAbove, createProgram);
router.put('/:id', adminAndAbove, updateProgram);
router.patch('/:id/status', adminAndAbove, toggleProgramStatus);

export default router;

