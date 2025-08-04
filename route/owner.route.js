import express from 'express';
import { loginOwner } from '../controller/ownerController.js';

const router = express.Router();

// Business Owner Login
router.post('/login', loginOwner);

export default router;
