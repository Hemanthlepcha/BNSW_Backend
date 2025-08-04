import { db } from '../config/db.config.js';
import { generateThreadId } from '../utils/threadUtils.js';
import { subscribeToWebhook } from '../services/webhookSubscription.js';
import { threadIdMapping, pendingRequests, proofResults } from '../index.js';
import { issueCredential as issueNDICredential } from '../services/credentialService.js';

// Add this to your credential route
export const issueCredential = async (req, res) => {
  const { credentialData, schemaId, holderDID, forRelationship } = req.body;
  
  try {
    const threadId = generateThreadId();
    console.log(`Creating credential issuance with threadId: ${threadId}`);
    
    // Prepare credential data for NDI
    const ndiCredentialData = {
      holderDID,
      forRelationship,
      schemaId,
      credentialAttributes: credentialData
    };
    
    // Issue credential through NDI
    const response = await issueNDICredential(ndiCredentialData);
    const { credentialThreadId, credentialURL, revocationId } = response.data;
    
    // Store thread ID mapping for credential issuance
    threadIdMapping.set(threadId, credentialThreadId);
    console.log(`Stored credential thread ID mapping: ${threadId} -> ${credentialThreadId}`);
    
    // Add to pending requests for credential issuance
    pendingRequests.set(threadId, Date.now());
    console.log(`Added credential to pending requests: ${threadId}`);
    
    // Subscribe to webhook for credential status updates
    try {
      await subscribeToWebhook(credentialThreadId);
      console.log(`Successfully subscribed to credential webhook for threadId: ${credentialThreadId}`);
    } catch (error) {
      console.error(`Failed to subscribe to credential webhook for threadId: ${credentialThreadId}`, error);
    }
    
    // Store the credential information in database
    const storeQuery = `
      INSERT INTO issued_credentials (
        holder_cid,
        holder_did,
        credential_type,
        revocation_id,
        credential_data,
        thread_id,
        ndi_thread_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    await db.query(storeQuery, [
      credentialData["CFA Employee CID"],
      holderDID,
      'CFA_EMPLOYEE',
      revocationId,
      JSON.stringify(credentialData),
      threadId,
      credentialThreadId
    ]);
    
    // Return the NEW thread ID for credential polling
    res.status(201).json({
      success: true,
      qrCode: credentialURL,
      threadId: threadId, // This is the NEW thread ID for credential polling
      ndiThreadId: credentialThreadId,
      revocationId: revocationId
    });
    
  } catch (error) {
    console.error("Error issuing credential:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to issue credential",
      details: error.response?.data || "No additional details available"
    });
  }
};
