import { authConfig } from "../config/auth.config.js";
import { getAccessToken } from "../services/authService.js";
import axios from "axios";

export const issueCredential = async (req, res) => {
  try {
    console.log('Starting credential issuance...', req.body);
    const token = await getAccessToken();
    if (!token) {
      console.error('Failed to get access token');
      return res.status(500).json({ error: 'Authentication failed' });
    }

    const {
      credentialData,
      schemaId,
      holderDID,
      forRelationship
    } = req.body;

    if (!credentialData || !schemaId || !holderDID || !forRelationship) {
      return res.status(400).json({
        error: 'Missing required fields',
        success: false
      });
    }

    const response = await axios.post(
      `${authConfig.NDI_BASE_URL}/issuer/v1/issue-credential`,
      {
        credentialData,
        schemaId,
        holderDID,
        forRelationship
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('Issuance response:', response.data);

    if (response.data && response.data.revocationId) {
      return res.json({
        success: true,
        revocationId: response.data.revocationId
      });
    }

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('Error issuing credential:', error?.response?.data || error);
    res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error.message || 'Failed to issue credential'
    });
  }
};

export const getCredentialStatus = (req, res) => {
  const { threadId } = req.params;
  
  if (!isValidThreadId(threadId)) {
    return res.status(400).json({ 
      status: "error",
      error: "Invalid thread ID format" 
    });
  }

  console.log(`\n==== CHECKING CREDENTIAL STATUS ====`);
  console.log(`Frontend requesting credential threadId: ${threadId}`);
  console.log('Current pending credential requests:', Array.from(pendingRequests.keys()));
  console.log('Current credential results keys:', Array.from(credentialResults.keys()));

  const result = credentialResults.get(threadId);
  console.log(`Credential result for threadId ${threadId}:`, result ? 'FOUND' : 'NOT FOUND');
  
  if (!result) {
    const isPending = pendingRequests.has(threadId);
    if (!isPending) {
      console.log(`❌ No pending credential request found for threadId: ${threadId}`);
      return res.status(404).json({ 
        status: "error",
        error: "Credential result not found" 
      });
    }
    console.log(`⏳ Credential request is pending for threadId: ${threadId}`);
    return res.status(202).json({ 
      status: "pending",
      message: "Credential issuance in progress",
      threadId: threadId
    });
  }
  
  console.log(`✅ Found credential result for threadId: ${threadId}`);

  return res.json({
    status: result.status,
    message: result.message,
    threadId: threadId,
    accepted: result.accepted,
    revocationId: result.revocationId,
    timestamp: result.timestamp,
    error: result.error
  });
};