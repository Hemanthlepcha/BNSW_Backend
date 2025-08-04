-- Create table for tracking issued credentials
CREATE TABLE IF NOT EXISTS issued_credentials (
  id SERIAL PRIMARY KEY,
  holder_cid VARCHAR(255) NOT NULL,
  holder_did VARCHAR(255) NOT NULL,
  credential_type VARCHAR(50) NOT NULL,
  revocation_id VARCHAR(255) NOT NULL,
  credential_data JSONB NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);
