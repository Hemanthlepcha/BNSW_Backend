// server.js
import dotenv from "dotenv";
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['NGROK_AUTH_TOKEN'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not set in environment variables`);
    process.exit(1);
  }
}

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import proofRoutes from "./route/proof.route.js";
import cfaRoutes from "./route/cfa.route.js";
import ownerRoutes from "./route/owner.route.js";
import ownerCFARoutes from "./route/ownerCFA.route.js";
import credentialRoutes from "./route/credential.route.js";
import cfaRequestRoutes from "./route/cfaRequest.route.js";
import { registerWebhook } from "./services/webhookRegistration.js";
import ngrok from "ngrok";
import { isValidThreadId } from "./utils/threadUtils.js";
import { db } from "./config/db.config.js";
import { User } from './models/user.model.js';
import CFA from './models/cfa.model.js';
import { cfaAgentRouter } from "./route/agentCFA.route.js";
import { loginOwner } from "./controller/ownerController.js";

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for proof and credential results and pending requests
export const proofResults = new Map();
export const credentialResults = new Map();
export const pendingRequests = new Map();
export const threadIdMapping = new Map(); // Map between our threadId and NDI's threadId
export const processedWebhooks = new Map(); // Track processed webhook notifications

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(bodyParser.json());

// Routes
app.use("/api", proofRoutes); // This will prefix all routes in proofRoutes with /api
app.use("/api/cfa", cfaRoutes); // CFA routes will be prefixed with /api/cfa
app.use("/api/owner", ownerRoutes); // Owner routes will be prefixed with /api/owner
app.use("/api/owner", ownerCFARoutes); // Owner-CFA relationship routes
app.use("/api/agent", cfaAgentRouter);
app.use("/api", cfaRequestRoutes); // CFA request routes
app.use("/api", credentialRoutes); // Credential issuance routes

// New endpoint to get proof results
app.get("/api/proof-results/:threadId", (req, res) => {
  const { threadId } = req.params;

  if (!isValidThreadId(threadId)) {
    return res.status(400).json({
      status: "error",
      error: "Invalid thread ID format"
    });
  }

  console.log(`\n==== CHECKING PROOF RESULTS ====`);
  console.log(`Frontend requesting threadId: ${threadId}`);
  console.log('Current pending requests:', Array.from(pendingRequests.keys()));
  console.log('Current thread mappings:', Array.from(threadIdMapping.entries()));
  console.log('Current proof results keys:', Array.from(proofResults.keys()));

  const result = proofResults.get(threadId);
  console.log(`Proof result for threadId ${threadId}:`, result ? 'FOUND' : 'NOT FOUND');

  if (!result) {
    const isPending = pendingRequests.has(threadId);
    if (!isPending) {
      console.log(`❌ No pending request found for threadId: ${threadId}`);
      return res.status(404).json({
        status: "error",
        error: "Proof result not found"
      });
    }
    console.log(`⏳ Request is pending for threadId: ${threadId}`);
    return res.status(202).json({
      status: "pending",
      message: "Proof verification in progress",
      threadId: threadId
    });
  }

  console.log(`✅ Found result for threadId: ${threadId}`);

  return res.json({
    status: result.status,
    message: result.message,
    threadId: threadId,
    verification_result: result.verification_result,
    verified: result.verified,
    userData: result.userData,
    cfaData: result.cfaData,
    ownerData: result.ownerData, // Add this line
    holderDID: result.holderDID,
    forRelationship: result.forRelationship,
    isExistingUser: result.isExistingUser,
    isRegisteredAgent: result.isRegisteredAgent,
    isRegisteredOwner: result.isRegisteredOwner, // Add this line
    timestamp: result.timestamp,
    error: result.error,
    type: result.type // Add this to distinguish between agent and owner
  });
});

// Updated webhook handler in server.js
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("\n==== Webhook received ====");
    console.log("Request body:", JSON.stringify(body, null, 2));

    if (!body || Object.keys(body).length === 0) {
      console.log("Empty request body received");
      return res.status(400).json({ error: "Empty request body" });
    }

    if (body.type === "present-proof/presentation-result") {
      if (processedWebhooks.has(body.thid)) {
        console.log(`\nSkipping duplicate webhook for thread ID: ${body.thid}`);
        return res.status(200).json({
          status: "success",
          message: "Webhook already processed"
        });
      }

      console.log("\n==== PROOF PRESENTATION RECEIVED ====");
      console.log(`Verification Result: ${body.verification_result}`);
      console.log(`Thread ID: ${body.thid}`);

      if (body.requested_presentation && body.requested_presentation.revealed_attrs) {
        const revealedAttrs = body.requested_presentation.revealed_attrs;

        // Check if this is a CFA agent verification
        if (revealedAttrs["License No."] && revealedAttrs["CFA Name"] && revealedAttrs["CFA Employee CID"]) {
          const cfaLicense = revealedAttrs["License No."][0].value;
          const cfaName = revealedAttrs["CFA Name"][0].value;
          const employeeCID = revealedAttrs["CFA Employee CID"][0].value;

          console.log('Processing CFA agent verification:', { cfaLicense, cfaName, employeeCID });

          // Find our threadId from the mapping
          let ourThreadId = null;
          for (const [key, value] of threadIdMapping.entries()) {
            if (value === body.thid) {
              ourThreadId = key;
              break;
            }
          }

          if (!ourThreadId) {
            console.error("No matching thread ID found for:", body.thid);
            return res.status(500).json({ error: "Thread ID mapping not found" });
          }

          try {
            // Check if the CFA exists using direct database query
            const cfaQuery = `
              SELECT 
                  c.*,
                  json_agg(
                    json_build_object(
                      'cid', e->>'cid',
                      'name', e->>'name',
                      'employee_id', e->>'employee_id'
                    )
                  ) AS employees
                FROM 
                  cfa c,
                  json_array_elements(c.employee_details::json) e  -- Cast JSONB to JSON
                WHERE 
                  c.cfa_license = $1 
                  AND c.cfa_name = $2
                GROUP BY 
                  c.id, c.cfa_license, c.cfa_name, c.employee_details;
            `;

            const cfaResult = await db.query(cfaQuery, [cfaLicense, cfaName]);
            const existingCFA = cfaResult.rows[0];
            console.log('CFA Query Result:', existingCFA);

            if (existingCFA) {
              // Check if the employee exists in the CFA's employee_details
              const employee = existingCFA.employees.find(emp => emp.cid === employeeCID);

              if (employee) {
                console.log('Found employee in CFA:', employee);
                const proofResult = {
                  status: "success",
                  message: "CFA agent verified successfully",
                  verification_result: body.verification_result,
                  type: "agent",
                  verified: true,
                  userData: {
                    Name: employee.name || '',
                    ID: employeeCID,
                    role: 'agent',
                    cfa: {
                      license: cfaLicense,
                      name: cfaName
                    }
                  },
                  cfaData: {
                    license: cfaLicense,
                    name: cfaName,
                    employeeId: employee.employee_id || employeeCID
                  },
                  holderDID: body.holder_did,
                  forRelationship: body.relationship_did,
                  timestamp: new Date().toISOString(),
                  isExistingUser: true,
                  isRegisteredAgent: true,


                };

                console.log('Storing proof result for CFA agent:', proofResult);
                proofResults.set(ourThreadId, proofResult);
                pendingRequests.delete(ourThreadId);
                processedWebhooks.set(body.thid, {
                  timestamp: new Date().toISOString(),
                  isExistingUser: true
                });

                return res.status(200).json({
                  status: "success",
                  message: "CFA agent verified",
                  threadId: ourThreadId,
                  proofResult: proofResult
                });
              }
            }

            // If we get here, either CFA or employee wasn't found
            const errorResult = {
              status: "error",
              message: "CFA agent verification failed",
              verification_result: body.verification_result,
              verified: true,
              error: "Not a registered CFA agent",
              userData: null,
              timestamp: new Date().toISOString(),
              isExistingUser: false,
              isRegisteredAgent: false
            };

            proofResults.set(ourThreadId, errorResult);
            pendingRequests.delete(ourThreadId);

            return res.status(200).json({
              status: "error",
              message: "Not a registered CFA agent",
              threadId: ourThreadId,
              proofResult: errorResult
            });
          } catch (error) {
            console.error("Error processing CFA agent:", error);
            return res.status(500).json({ error: "Failed to process CFA agent verification" });
          }
        }

        // Regular user verification
        const username = revealedAttrs["Full Name"]?.[0]?.value;
        const cid = revealedAttrs["ID Number"]?.[0]?.value;
        console.log('Processing regular user verification:', { username, cid });

        if (!username || !cid) {
          return res.status(400).json({ error: "Name or ID not found in revealed attributes" });
        }

        // Find our threadId from the mapping
        let ourThreadId = null;
        for (const [key, value] of threadIdMapping.entries()) {
          if (value === body.thid) {
            ourThreadId = key;
            break;
          }
        }

        if (!ourThreadId) {
          console.error("No matching thread ID found for:", body.thid);
          return res.status(500).json({ error: "Thread ID mapping not found" });
        }

        try {
          // Check both CFA employee and owner status
          const [existingCFA, existingOwner] = await Promise.all([
            CFA.findByEmployeeDetails(username, cid),
            loginOwner({ username, cid })
          ]);

          console.log('Existing CFA:', existingCFA);
          console.log('Existing owner:', existingOwner);

          // Determine user type and create appropriate response
          let proofResult;

          if (existingOwner) {
            // Handle owner login
            console.log(`Found owner: ${existingOwner.owner.username} (${existingOwner.owner.business_license})`);
            proofResult = {
              status: "success",
              message: "Owner login successful",
              verification_result: body.verification_result,
              type: "owner",
              verified: true,
              userData: {
                Name: existingOwner.owner.Name,
                ID: existingOwner.owner.ID,
                role: 'owner',
                username: existingOwner.owner.username,
                business_license: existingOwner.owner.business_license,
                token: existingOwner.owner.token
              },
              ownerData: {
                ID: existingOwner.owner.ID,
                Name: existingOwner.owner.Name,
                business_license: existingOwner.owner.business_license,
                username: existingOwner.owner.username,
                token: existingOwner.owner.token
              },
              holderDID: body.holder_did,
              forRelationship: body.relationship_did,
              timestamp: new Date().toISOString(),
              isExistingUser: true,
              isRegisteredOwner: true
            };
          } else if (existingCFA) {
            // Handle CFA employee login
            console.log(`Found CFA employee: ${username} (${existingCFA.cfa_license})`);
            proofResult = {
              status: "success",
              message: "CFA employee login successful",
              verification_result: body.verification_result,
              type: "cfa_employee",
              verified: true,
              cfaData: {
                Name: username,
                ID: cid,
                role: 'cfa_employee',
                cfa_license: existingCFA.cfa_license,
                cfa_name: existingCFA.cfa_name
              },
              cfaDetails: {
                cfa_license: existingCFA.cfa_license,
                cfa_name: existingCFA.cfa_name
              },
              holderDID: body.holder_did,
              forRelationship: body.relationship_did,
              timestamp: new Date().toISOString(),
              isExistingUser: true,
              isRegisteredAgent: true
            };
          } else {
            // Neither CFA employee nor owner
            console.log(`User ${username} (${cid}) is not a registered user`);
            proofResult = {
              status: "error",
              message: "Not a registered user",
              verification_result: body.verification_result,
              verified: true,
              error: "Not a registered user",
              userData: {
                Name: username,
                ID: cid,
                role: 'unregistered'
              },
              timestamp: new Date().toISOString(),
              isExistingUser: false,
              isRegisteredAgent: false,
              isRegisteredOwner: false
            };
          }

          console.log('Storing proof result:', proofResult);
          proofResults.set(ourThreadId, proofResult);
          pendingRequests.delete(ourThreadId);

          // Mark this webhook as processed
          processedWebhooks.set(body.thid, {
            timestamp: new Date().toISOString(),
            isExistingUser: !!(existingCFA || existingOwner),
            userType: existingOwner ? 'owner' : existingCFA ? 'cfa_employee' : 'unregistered',
            cfaDetails: existingCFA ? {
              cfa_license: existingCFA.cfa_license,
              cfa_name: existingCFA.cfa_name
            } : null
          });

          return res.status(200).json({
            status: proofResult.status,
            message: proofResult.message,
            threadId: ourThreadId,
            proofResult: proofResult
          });

        } catch (error) {
          console.error("Error processing user:", error);

          // Store error result
          const errorResult = {
            status: "error",
            message: "Failed to process user",
            verification_result: body.verification_result,
            verified: false,
            error: "Failed to process user verification",
            timestamp: new Date().toISOString()
          };

          proofResults.set(ourThreadId, errorResult);
          pendingRequests.delete(ourThreadId);

          return res.status(500).json({ error: "Failed to process user" });
        }
      }
    } else {
      console.log(`Received webhook message of type: ${body.type || "unknown"}`);
      return res.status(200).json({ message: "Webhook processed successfully" });
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Clean up old data periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const oneHour = 3600000;

  // Clean up pending requests
  for (const [threadId, timestamp] of pendingRequests.entries()) {
    if (now - timestamp > oneHour) {
      pendingRequests.delete(threadId);
    }
  }

  // Clean up processed webhooks
  for (const [threadId, data] of processedWebhooks.entries()) {
    if (now - new Date(data.timestamp).getTime() > oneHour) {
      processedWebhooks.delete(threadId);
    }
  }
}, 3600000); // Run every hour

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    // Step 1: Start ngrok and get the public URL
    await ngrok.disconnect();
    await ngrok.kill();
    const ngrokUrlGlobal = await ngrok.connect({
      authtoken: process.env.NGROK_AUTH_TOKEN,
      addr: PORT,
    });
    console.log(`ngrok tunnel established: ${ngrokUrlGlobal}`);

    await registerWebhook(ngrokUrlGlobal);
    console.log("Webhook registered successfully.");
  } catch (err) {
    console.error("Failed to register webhook:", err);
    // Don't exit here, let the server continue running
    // The webhook registration can be retried later
  }
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Kill ngrok tunnel
    await ngrok.kill();
    console.log('Ngrok tunnel closed');

    // Close server
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Export the maps for use in other files

