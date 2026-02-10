-- TekstFlyt v2 - Initial schema
-- Run: python migrate.py

CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'admin')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('business', 'private')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id),
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('tilbud', 'brev', 'notat', 'omprofilering', 'svar_paa_brev')),
    document_name VARCHAR(500) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_address VARCHAR(255),
    recipient_postal_code VARCHAR(10),
    recipient_city VARCHAR(100),
    recipient_person VARCHAR(255),
    recipient_phone VARCHAR(50),
    recipient_email VARCHAR(255),
    customer_type VARCHAR(20) CHECK (customer_type IN ('business', 'private')),
    price_product DECIMAL(12,2),
    price_installation DECIMAL(12,2),
    document_text TEXT,
    ai_prompt TEXT,
    ai_model VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    file_path_word VARCHAR(500),
    file_path_word_signed VARCHAR(500),
    file_path_pdf VARCHAR(500),
    file_path_pdf_signed VARCHAR(500),
    file_path_attachment VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    finalized_at TIMESTAMP
);

CREATE TABLE knowledge_documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    original_path VARCHAR(500),
    category VARCHAR(100),
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
