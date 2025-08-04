import express from 'express';
import { validateToken } from '../middleware/authMiddleware.js';
import { getAgentCFA } from '../controller/agentCFAController.js';

export const cfaAgentRouter = express.Router();

// Fixed: Use consistent parameter name
cfaAgentRouter.get('/:cfaLicense/cfa', getAgentCFA);