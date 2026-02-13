-- Add 'serviceavtale' document type and transient statuses

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
    CHECK (document_type IN ('tilbud', 'brev', 'notat', 'omprofilering', 'svar_paa_brev', 'serviceavtale'));

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check
    CHECK (status IN ('draft', 'generating', 'finalizing', 'finalized'));
