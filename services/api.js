import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!BASE_URL) {
  throw new Error('BASE_URL is not defined in environment variables');
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('CLIENT_ID and CLIENT_SECRET must be defined in environment variables');
}

console.log('Initializing NDI API Service with URL:', BASE_URL);

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: `${BASE_URL}/api/v1`,
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Credential issuance
  async issueCredential(data) {
    try {
      const response = await this.client.post('/issue-credential/send', {
        ...data,
        auto_remove: false,
        trace: false
      });
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get credential status
  async getCredentialStatus(credentialId) {
    try {
      const response = await this.client.get(`/credentials/${credentialId}/status`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get proof status directly from NDI
  async getProofStatus(threadId) {
    if (!threadId) {
      throw new Error('Thread ID is required');
    }
    
    try {
      console.log(`Fetching proof status from NDI API for thread: ${threadId}`);
      const response = await this.client.get(`/present-proof/records/${threadId}`);
      console.log('NDI API Response:', response.data);
      
      // Transform the response to match expected format
      const state = response.data.state || 'pending';
      return {
        status: state === 'verified' ? 'verified' : state === 'request_sent' ? 'pending' : 'failed',
        verified: state === 'verified',
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching proof status from NDI:', error);
      throw this.handleError(error);
    }
  }

  // Verify credential
  async verifyCredential(credentialData) {
    try {
      const response = await this.client.post('/credentials/verify', credentialData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Helper method to handle errors
  handleError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      return new Error(`API Error ${status}: ${data.message || JSON.stringify(data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      return new Error('No response received from NDI API');
    } else {
      // Something happened in setting up the request that triggered an Error
      return new Error(`Error setting up request: ${error.message}`);
    }
  }
}

const apiService = new ApiService();
export { apiService };
