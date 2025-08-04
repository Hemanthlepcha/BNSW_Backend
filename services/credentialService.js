import axios from 'axios';
import { authConfig } from '../config/auth.config.js';
import { getAccessToken } from './authService.js';

export const issueCredential = async (credentialData) => {
  try {
    const token = await getAccessToken();
    
    console.log('Making request to NDI issuer URL:', authConfig.NDI_ISSUER_URL);
    const response = await axios.post(
      `${authConfig.NDI_ISSUER_URL}/credentials/issue`,
      credentialData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error issuing credential:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || "Failed to issue credential");
  }
};

export const getCredentialStatus = async (threadId) => {
  try {
    const token = await getAccessToken();
    
    const response = await axios.get(
      `${authConfig.NDI_ISSUER_URL}/credentials/${threadId}/status`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error getting credential status:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || "Failed to get credential status");
  }
};

export const verifyCredential = async (verificationData) => {
  try {
    const token = await getAccessToken();
    
    const response = await axios.post(
      `${authConfig.NDI_VERIFIER_URL}/credentials/verify`,
      verificationData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error verifying credential:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || "Failed to verify credential");
  }
};
