-- Drop tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS business_owner_cfa_relation;
DROP TABLE IF EXISTS cfa;
DROP TABLE IF EXISTS business_owner;
DROP TABLE IF EXISTS users;

-- Keep the existing users table for NDI integration
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    id_number VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Business Owner table
CREATE TABLE business_owner (
    id SERIAL,
    business_license VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    cid VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username),
    UNIQUE(cid)
);

-- Create CFA table
CREATE TABLE cfa (
    id SERIAL,
    cfa_license VARCHAR(50) PRIMARY KEY,
    cfa_name VARCHAR(100) NOT NULL,
    employee_details JSONB DEFAULT '[]'::jsonb,  -- Store basic employee details for NDI validation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Business Owner and CFA Relation table
CREATE TABLE business_owner_cfa_relation (
    id SERIAL PRIMARY KEY,
    bo_license VARCHAR(50) REFERENCES business_owner(business_license),
    cfa_license VARCHAR(50) REFERENCES cfa(cfa_license),
    employee_id VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_business_owner_timestamp
    BEFORE UPDATE ON business_owner
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_cfa_timestamp
    BEFORE UPDATE ON cfa
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();



CREATE TRIGGER update_bo_cfa_relation_timestamp
    BEFORE UPDATE ON business_owner_cfa_relation
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Seed data for Business Owners
INSERT INTO business_owner (business_license, username, name, cid) VALUES
('BL001', 'tenzin_store', 'Tenzin Store', 'CID001'),
('BL002', 'dorji_shop', 'Dorji General Shop', 'CID002'),
('BL003', 'karma_enterprise', 'Karma Enterprise', 'CID003'),
('BL004', 'pema_traders', 'Pema Traders', 'CID004'),
('BL005', 'yangki_business', 'Yangki Business', 'CID005');

-- Seed data for CFAs with basic employee details
INSERT INTO cfa (cfa_license, cfa_name, employee_details) VALUES
('CFA001', 'Bhutan Clearing Services', 
 '[
    
    {
      "employee_id": "EMP002",
      "cid": "11803003645",
      "name": "Hemanth Lepcha"
    }
  ]'::jsonb
),
('CFA002', 'Dragon Customs Agency',
 '[
    {
      "employee_id": "EMP003",
      "cid": "ECID003",
      "name": "Karma Tenzin"
    }
  ]'::jsonb
),
('CFA003', 'Thunder Clearing House',
 '[
    {
      "employee_id": "EMP005",
      "cid": "ECID005",
      "name": "Kinley Dorji"
    }
  ]'::jsonb
),
('CFA004', 'Royal Clearing Services',
 '[
    {
      "employee_id": "EMP007",
      "cid": "ECID007",
      "name": "Ugyen Tshering"
    }
  ]'::jsonb
);



-- Seed some initial relationships
INSERT INTO business_owner_cfa_relation (bo_license, cfa_license, employee_id, status) VALUES
('BL001', 'CFA001', 'EMP001', 'APPROVED'),
('BL002', 'CFA002', 'EMP003', 'APPROVED'),
('BL003', 'CFA001', 'EMP002', 'PENDING'),
('BL004', 'CFA003', 'EMP005', 'PENDING');