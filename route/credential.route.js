import express from 'express';
import { issueCredential } from '../controller/credentialController.js';

const router = express.Router();

router.post('/issue-credential', issueCredential);

export default router;
