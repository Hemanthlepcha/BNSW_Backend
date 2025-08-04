import { authConfig } from "../config/auth.config.js";
import { getAccessToken } from "../services/authService.js";
import { subscribeToWebhook } from "../services/webhookSubscription.js";
import { db } from "../db/index.js";
import axios from "axios";
import { generateThreadId } from "../utils/threadUtils.js";
import { threadIdMapping, pendingRequests, proofResults } from "../index.js";

export const getProofStatus = async (req, res) => {
  const { threadId } = req.params;
  
  try {
    console.log(`Checking proof status for threadId: ${threadId}`);
    
    // Check if we have a result for this thread
    const proofResult = proofResults.get(threadId);
    if (proofResult) {
      console.log(`Found proof result for threadId ${threadId}:`, proofResult);
      return res.json({
        verified: true,
        userData: proofResult.userData,
        cfaData: proofResult.cfaData,
        isExistingUser: proofResult.isExistingUser,
        holderDID: proofResult.holderDID,
        forRelationship: proofResult.forRelationship,
      });
    }

    // Check if the request is still pending
    const pendingRequest = pendingRequests.get(threadId);
    if (!pendingRequest) {
      console.log(`No pending request found for threadId: ${threadId}`);
      return res.status(404).json({ error: 'Proof request not found' });
    }

    // If the request is still pending, return the current status
    console.log(`Request is still pending for threadId: ${threadId}`);
    res.json({
      verified: false,
      status: 'pending'
    });
  } catch (error) {
    console.error("Error checking proof status:", error);
    res.status(500).json({ error: "Failed to check proof status" });
  }
};

export const createProofRequest = async (req, res) => {
  try {
    console.log('Starting createProofRequest...');
    const token = await getAccessToken();
    if (!token) {
      console.error('Failed to get access token');
      return res.status(500).json({ error: 'Authentication failed' });
    }
    console.log('Successfully got access token');
    
    const threadId = generateThreadId();
    console.log(`Creating proof request with threadId: ${threadId}`);

    console.log('Making request to NDI verifier URL:', authConfig.NDI_VERIFIER_URL);
    const { type = 'normal' } = req.body;
    
    const proofRequest = type === 'agent' ? {
      proofName: "CFA Credential",
      proofAttributes: [
        {
          name: "License No.",
          restrictions: [
            {
              schema_name: "https://dev-schema.ngotag.com/schemas/f9727fba-14eb-4653-98e2-f7d81fe5aab5"
            }
          ]
        },
        {
          name: "CFA Name",
          restrictions: [
            {
              schema_name: "https://dev-schema.ngotag.com/schemas/f9727fba-14eb-4653-98e2-f7d81fe5aab5"
            }
          ]
        },
        {
          name: "CFA Employee CID",
          restrictions: [
            {
              schema_name: "https://dev-schema.ngotag.com/schemas/f9727fba-14eb-4653-98e2-f7d81fe5aab5"
            }
          ]
        }
      ]
    } : {
      proofName: "Verify Foundational ID",
      proofAttributes: [
        {
          name: "ID Number",
          restrictions: [
            {
              schema_name: "https://dev-schema.ngotag.com/schemas/c7952a0a-e9b5-4a4b-a714-1e5d0a1ae076",
            },
          ],
        },
        {
          name: "Full Name",
          restrictions: [
            {
              schema_name: "https://dev-schema.ngotag.com/schemas/c7952a0a-e9b5-4a4b-a714-1e5d0a1ae076",
            },
          ],
        },
      ],
    };

    const response = await axios.post(
      `${authConfig.NDI_VERIFIER_URL}`,
      proofRequest,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { proofRequestThreadId, proofRequestURL } = response.data.data;
    console.log(`Received NDI threadId: ${proofRequestThreadId}`);

    threadIdMapping.set(threadId, proofRequestThreadId);
    console.log(`Stored thread ID mapping: ${threadId} -> ${proofRequestThreadId}`);
    
    pendingRequests.set(threadId, Date.now());
    console.log(`Added to pending requests: ${threadId}`);

    try {
      await subscribeToWebhook(proofRequestThreadId);
      console.log(`Successfully subscribed to webhook for threadId: ${proofRequestThreadId}`);
    } catch (webhookError) {
      console.error(`Failed to subscribe to webhook for threadId: ${proofRequestThreadId}`, webhookError);
      // Don't throw here, let the request continue
    }

    // Return success response
    res.status(201).json({
      qrCode: proofRequestURL,
      threadId: threadId,
      ndiThreadId: proofRequestThreadId
    });
  } catch (error) {
    console.error("Error creating proof request:", error?.response?.data || error?.message || error);
    res.status(500).json({ 
      error: "Failed to create proof request",
      details: error?.response?.data || error?.message || 'Unknown error'
    });
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const { data } = req.body;
    console.log('Received webhook data:', data);

    if (!data || !data.verification_result || !data.thid) {
      throw new Error('Invalid webhook data');
    }

    const { verification_result, thid: ndiThreadId, relationship_did, holder_did } = data;
    const { revealed_attrs } = data.requested_presentation;

    // Find our internal threadId from NDI's threadId
    let internalThreadId = null;
    console.log('Looking for NDI thread ID:', ndiThreadId);
    console.log('Current thread mappings:', Object.fromEntries(threadIdMapping));
    
    for (const [key, value] of threadIdMapping.entries()) {
      if (value === ndiThreadId) {
        internalThreadId = key;
        break;
      }
    }

    if (!internalThreadId) {
      console.error('Thread ID mapping not found for NDI thread ID:', ndiThreadId);
      throw new Error('Thread ID not found');
    }
    
    console.log('Found internal thread ID:', internalThreadId);

    // Check if this is an agent login (has CFA attributes)
    if (revealed_attrs['License No.'] && revealed_attrs['CFA Name'] && revealed_attrs['CFA Employee CID']) {
      const cfaLicense = revealed_attrs['License No.'][0].value;
      const cfaName = revealed_attrs['CFA Name'][0].value;
      const employeeCID = revealed_attrs['CFA Employee CID'][0].value;

      // First, verify CFA and employee details
      const cfaQuery = `
        SELECT 
          c.*,
          jsonb_array_elements(c.employee_details) ->> 'cid' as emp_cid,
          jsonb_array_elements(c.employee_details) ->> 'employee_id' as emp_id,
          jsonb_array_elements(c.employee_details) ->> 'name' as emp_name
        FROM cfa c
        WHERE c.cfa_license = $1 AND c.cfa_name = $2
      `;
      const cfaResult = await db.query(cfaQuery, [cfaLicense, cfaName]);

      if (cfaResult.rows.length === 0) {
        proofResults.set(internalThreadId, {
          verified: false,
          error: 'CFA not found',
          status: 'error'
        });
        return;
      }

      // Find matching employee
      const employee = cfaResult.rows.find(row => row.emp_cid === employeeCID);
      if (!employee) {
        proofResults.set(internalThreadId, {
          verified: false,
          error: 'Employee not found in CFA records',
          status: 'error'
        });
        return;
      }

      // Get all business owner relationships for this CFA and employee
      const relationQuery = `
        SELECT 
          r.*,
          bo.name as business_name,
          bo.business_license,
          bo.username as business_username
        FROM business_owner_cfa_relation r
        JOIN business_owner bo ON bo.business_license = r.bo_license
        WHERE r.cfa_license = $1 AND r.employee_id = $2
      `;
      const relationResult = await db.query(relationQuery, [cfaLicense, employee.emp_id]);

      proofResults.set(internalThreadId, {
        verified: true,
        status: 'success',
        userData: {
          Name: employee.emp_name,
          ID: employeeCID
        },
        cfaData: {
          license: cfaLicense,
          name: cfaName,
          employeeId: employee.emp_id
        },
        relationships: relationResult.rows,
        holderDID: holder_did,
        forRelationship: relationship_did,
        isRegisteredAgent: true
      });
    } else {
      // Regular user verification
      const userData = {
        Name: revealed_attrs['Full Name']?.[0]?.value,
        ID: revealed_attrs['ID Number']?.[0]?.value
      };

      // Regular user verification
      proofResults.set(internalThreadId, {
        verified: true,
        userData,
        holderDID: holder_did,
        forRelationship: relationship_did,
        isExistingUser: false,
        status: 'success'
      });
    }

    pendingRequests.delete(internalThreadId);
    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
};
