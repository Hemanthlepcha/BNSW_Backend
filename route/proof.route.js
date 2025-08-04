import express from "express";
import { createProofRequest, getProofStatus, handleWebhook } from "../controller/proofController.js";
import { issueCredential, getCredentialStatus } from "../controller/issueController.js";

const router = express.Router();

// These routes will be prefixed with /api since we use app.use("/api", proofRoutes) in index.js
router.post("/proof-request", createProofRequest);
router.get("/proof-status/:threadId", getProofStatus);
router.get("/credential-status/:threadId", getCredentialStatus);
router.post("/webhook", handleWebhook);
router.post("/issue-credential", issueCredential);

export default router;
