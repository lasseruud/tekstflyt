# PLAN.md - TekstFlyt v2 Implementeringsplan

## Bakgrunn

TekstFlyt v1 er en fungerende prototype bygget med Flask + vanilla JS som genererer profesjonelle dokumenter (tilbud, brev, notater) for Kulde- & Varmepumpeteknikk AS ved hjelp av OpenAI GPT-4o. Den er i produksjon, men har vesentlige mangler: ingen autentisering, ingen database, rotete frontend med 10 separate JS-filer, og er låst til OpenAI for alt.

Versjon 2 er en fullstendig nyskriving med moderne stack og nye funksjoner.

## Overordnet arkitektur

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│   Frontend (React/TS)   │     │     Backend (Flask/Python)    │
│   Vite + TanStack Query │────>│     REST API                 │
│   React Router (wizard) │<────│                              │
│   frontend.lasseruud.com│     │  ┌─────────────────────────┐ │
└─────────────────────────┘     │  │  PostgreSQL + pgvector   │ │
                                │  │  - Brukere               │ │
                                │  │  - Dokumenter (metadata)  │ │
                                │  │  - Kunder                 │ │
                                │  │  - Kunnskapsbase (chunks) │ │
                                │  └─────────────────────────┘ │
                                │                              │
                                │  ┌─────────────────────────┐ │
                                │  │  AI-lag                  │ │
                                │  │  - Claude (tekstgen.)    │ │
                                │  │  - GPT (fallback)        │ │
                                │  │  - Embeddings → pgvector │ │
                                │  └─────────────────────────┘ │
                                │                              │
                                │  ┌─────────────────────────┐ │
                                │  │  Dokumentgenerering      │ │
                                │  │  - python-docx (Word)    │ │
                                │  │  - LibreOffice (PDF)     │ │
                                │  │  - E-post (SMTP)         │ │
                                │  └─────────────────────────┘ │
                                │  backend.lasseruud.com       │
                                └──────────────────────────────┘
```

## Dokumenttyper

1. **Tilbud** - Salgstilbud med produktinfo fra pgvector, pris/MVA-logikk
2. **Brev** - Formelle brev med mottaker-info
3. **Notat** - Interne notater, minimal metadata
4. **Omprofilering** - Dokumenter fra leverandører (primært Svalinn, men også andre) reprofilert til KVTAS (1:1, ikke oppsummering). AI erstatter avsenderprofil dynamisk uansett originalavsender.
5. **Svar på brev** - Bruker laster opp mottatt brev/dokument, gir instruksjoner, og AI skriver et svarbrev med KVTAS-profil. Vedlegg påkrevd.

## Database-skjema (PostgreSQL)

```sql
-- Brukere
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

-- Kunder (gjenbrukbar kundeinfo med autocomplete i wizard)
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

-- Dokumenter (metadata, snapshot av kundeinfo ved opprettelse)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id),   -- Link til kunde (valgfritt)
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
    document_text TEXT,                        -- Markdown-innhold
    ai_prompt TEXT,                            -- Original brukerinstruksjon
    ai_model VARCHAR(50),                      -- Hvilken modell som genererte
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

-- Kunnskapsbase (for pgvector RAG)
CREATE TABLE knowledge_documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    original_path VARCHAR(500),
    category VARCHAR(100),                     -- 'daikin_luftluft', 'daikin_luftvann', 'firmadata', etc.
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),                    -- OpenAI text-embedding-3-small dimensjon
    metadata JSONB,                            -- Ekstra metadata (sidetall, seksjon, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (document_id, chunk_index)
);

-- Index for vektorsøk
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## API-endepunkter

### Auth
```
POST /api/auth/login          - Innlogging (setter httpOnly cookie med JWT)
POST /api/auth/logout         - Utlogging (sletter cookie)
GET  /api/auth/me             - Hent innlogget bruker
```

### Dokumenter
```
GET    /api/documents              - Liste dokumenter (med søk/filter)
GET    /api/documents/:id          - Hent enkeltdokument
POST   /api/documents              - Opprett nytt dokument (draft)
PUT    /api/documents/:id          - Oppdater draft
DELETE /api/documents/:id          - Soft-delete dokument (sletter også genererte filer)
POST   /api/documents/:id/generate - Generer/regenerer AI-tekst
POST   /api/documents/:id/finalize - Fullfør og lås dokument
GET    /api/documents/:id/download/:type - Last ned fil (word/word_signed/pdf/pdf_signed)
POST   /api/documents/:id/email    - Send dokumenter på e-post (zip)
POST   /api/documents/:id/clone    - Klon dokument som utgangspunkt for nytt
```

### Kunder
```
GET    /api/customers              - Liste/søk kunder (autocomplete)
GET    /api/customers/:id          - Hent enkeltkunde
POST   /api/customers              - Opprett ny kunde
PUT    /api/customers/:id          - Oppdater kunde
POST   /api/customers/import       - Importer kunder fra CSV (Drifti-eksport)
```

### Filopplasting
```
POST   /api/upload                 - Last opp vedlegg (returnerer fil-ID)
```

### Kunnskapsbase (Admin)
```
GET    /api/admin/knowledge              - Liste alle dokumenter i kunnskapsbasen
POST   /api/admin/knowledge              - Last opp nytt dokument (PDF → chunk → embed)
DELETE /api/admin/knowledge/:id          - Slett dokument fra kunnskapsbasen
GET    /api/admin/knowledge/:id/chunks   - Se chunks for et dokument
GET    /api/admin/knowledge/search       - Test-søk i kunnskapsbasen
```

### Brukere (Admin)
```
GET    /api/admin/users            - Liste brukere
POST   /api/admin/users            - Opprett ny bruker
PUT    /api/admin/users/:id        - Oppdater bruker
DELETE /api/admin/users/:id        - Slett bruker
```

## Frontend-struktur (React)

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router + QueryClientProvider + AuthProvider
├── api/
│   ├── client.ts               # Fetch wrapper (cookies sendes automatisk)
│   ├── documents.ts            # Dokument API-kall
│   ├── auth.ts                 # Auth API-kall
│   ├── customers.ts            # Kunde API-kall
│   ├── knowledge.ts            # Kunnskapsbase API-kall
│   └── upload.ts               # Filopplasting API-kall
├── hooks/
│   ├── useAuth.ts              # Auth context/hook
│   ├── useDocuments.ts         # TanStack Query hooks for dokumenter
│   ├── useCustomers.ts         # TanStack Query hooks for kunder
│   └── useKnowledge.ts         # TanStack Query hooks for kunnskapsbase
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx       # Dokumentliste med søk
│   ├── AdminPage.tsx           # Kunnskapsbase-admin + brukeradmin
│   └── wizard/
│       ├── WizardLayout.tsx    # Felles wizard-shell med stepper
│       ├── Step1Type.tsx       # Velg dokumenttype
│       ├── Step2Fields.tsx     # Fyll inn felt (dynamisk basert på type, kundesøk)
│       ├── Step3Prompt.tsx     # Instruksjon + vedlegg
│       ├── Step4Preview.tsx    # Forhåndsvisning + redigering
│       └── Step5Complete.tsx   # Fullfør + nedlasting + e-post
├── components/
│   ├── ProtectedRoute.tsx
│   ├── DocumentCard.tsx        # Kort i dashboard-listen
│   ├── SearchBar.tsx
│   ├── CustomerSearch.tsx      # Autocomplete for kundesøk i wizard
│   ├── MarkdownEditor.tsx      # Redigerbar markdown-preview
│   ├── FileUpload.tsx          # Drag-and-drop filopplasting
│   ├── LoadingOverlay.tsx      # Med one-liners
│   └── PriceSection.tsx        # Pris/MVA-visning
└── utils/
    ├── markdown.ts             # Markdown ↔ HTML konvertering
    └── format.ts               # Formatering (dato, pris, etc.)
```

## Backend-struktur (Flask)

```
backend/
├── app.py                      # Flask app factory
├── config.py                   # Konfigurasjon fra env
├── requirements.txt
├── .env
├── blueprints/
│   ├── auth.py                 # Login/logout/me
│   ├── documents.py            # CRUD + generate + finalize + delete
│   ├── customers.py            # Kunde CRUD + import
│   ├── upload.py               # Filopplasting (secure_filename, størrelses-/typegrenser)
│   ├── download.py             # Filnedlasting (autorisert, ikke direkte stier)
│   ├── email_service.py        # E-post med zip
│   └── admin.py                # Kunnskapsbase + brukeradmin (krever admin-rolle)
├── services/
│   ├── ai_service.py           # Claude/GPT-integrasjon
│   ├── embedding_service.py    # Embedding + pgvector-søk
│   ├── document_generator.py   # Word/PDF-generering
│   ├── word_handler.py         # python-docx template-logikk
│   ├── pdf_converter.py        # LibreOffice-konvertering
│   ├── knowledge_service.py    # PDF → chunk → embed pipeline
│   └── email_service.py        # SMTP-sending
├── middleware/
│   └── auth.py                 # JWT cookie-validering + rolle-guard decorator
├── models/
│   ├── user.py
│   ├── document.py
│   ├── customer.py
│   └── knowledge.py
├── templates/                  # Word-maler (gjenbrukt fra v1)
│   ├── offer_template.docx
│   ├── letter_template.docx
│   ├── note_template.docx
│   └── signature.png
├── prompts/
│   ├── base_system.txt         # Felles systemprompt
│   ├── tilbud.txt              # Tilbuds-spesifikk prompt
│   ├── brev.txt                # Brev-spesifikk prompt
│   ├── notat.txt               # Notat-spesifikk prompt
│   ├── omprofilering.txt       # Omprofilering-prompt (generisk, ikke bare Svalinn)
│   └── svar_paa_brev.txt       # Svar-på-brev-prompt
└── migrations/                 # Database-migrasjoner
```

## Implementeringsfaser

### Fase 1: Fundament
**Mål**: Grunnleggende prosjektoppsett som bygger og kjører.

- Oppsett av Vite/React/TS-prosjekt med TanStack Query og React Router
- Oppsett av Flask-backend med blueprint-struktur
- PostgreSQL-database med skjema (uten pgvector ennå)
- CORS-konfigurasjon mellom frontend/backend
- Grunnleggende mappestruktur på plass
- Verifiser at frontend og backend kommuniserer

**Leveranse**: Tom app som viser "Hello TekstFlyt" med fungerende API-kall.

---

### Fase 2: Autentisering
**Mål**: Innlogging fungerer ende-til-ende.

- Backend: Bruker-modell, passord-hashing (bcrypt), JWT i httpOnly cookies (SameSite=Strict)
- Backend: Login/logout/me-endepunkter
- Backend: Rolle-guard decorator for admin-endepunkter
- Frontend: LoginPage med skjema
- Frontend: AuthContext/useAuth hook
- Frontend: ProtectedRoute-komponent
- Opprett 1-2 testbrukere via seed-script
- Hele appen bak innlogging

**Leveranse**: Kun innloggede brukere ser appen. Redirect til login ved uautentisert tilgang.

---

### Fase 3: Dashboard + Kunderegister
**Mål**: Innlogget bruker ser sine dokumenter og kan administrere kunder.

- Backend: Documents CRUD (list med søk/filter, get, create, delete med filopprydding)
- Backend: Customers CRUD + CSV-import (Drifti-eksport)
- Frontend: DashboardPage med dokumentliste
- Frontend: Søkefunksjonalitet (tittel, mottaker, dato)
- Frontend: DocumentCard-komponent
- Frontend: "Lag nytt dokument"-knapp → wizard
- Frontend: "Bruk som utgangspunkt"-knapp → clone + wizard
- Frontend: Enkel kundeliste-visning (kan flyttes til admin senere)

**Leveranse**: Dashboard med dokumenter og søk. Kunderegister med import fra Drifti.

---

### Fase 4: Wizard steg 1-2 (type + felt)
**Mål**: Bruker kan velge dokumenttype og fylle inn metadata.

- Frontend: WizardLayout med stepper-visning
- Frontend: Step1Type - velg mellom Tilbud/Brev/Notat/Omprofilering/Svar på brev
- Frontend: Step2Fields - dynamiske felt basert på type:
  - Tilbud: Kundesøk (autocomplete), adresse, kontaktperson, tlf, e-post, privat/bedrift, pris
  - Brev: Kundesøk (autocomplete), adresse
  - Notat: Tittel (valgfritt)
  - Omprofilering: Ingen ekstra felt (vedlegg påkrevd i steg 3)
  - Svar på brev: Kundesøk (autocomplete), adresse (vedlegg påkrevd i steg 3)
- Frontend: CustomerSearch-komponent med autocomplete fra kunderegister
- Backend: POST /api/documents oppretter draft-dokument
- Wizard-state management (React state eller URL-params)

**Leveranse**: Bruker kan navigere steg 1-2 med kundesøk, og et draft-dokument opprettes i DB.

---

### Fase 5: Wizard steg 3 (prompt + vedlegg)
**Mål**: Bruker kan gi instruksjoner og laste opp filer.

- Frontend: Step3Prompt med instruksjonstekstarea
- Frontend: FileUpload-komponent med drag-and-drop
- Backend: POST /api/upload med sikkerhetstiltak:
  - secure_filename for filnavn
  - Maks filstørrelse (20 MB)
  - Hviteliste for filtyper (PDF, DOCX, DOC, XLSX, XLS, JPG, PNG)
  - Lagring utenfor webroot med randomiserte filnavn
  - Autorisert nedlasting via API (ingen direkte stier)
- For Omprofilering: Vedlegg påkrevd, instruksjonstekst valgfritt
- For Svar på brev: Vedlegg påkrevd, instruksjonstekst påkrevd
- For andre typer: Vedlegg valgfritt, instruksjonstekst påkrevd
- Lagre prompt og vedlegg-referanse på draft-dokumentet

**Leveranse**: Bruker kan skrive instruksjon og laste opp fil. Data lagres på draft.

---

### Fase 6: AI-integrasjon
**Mål**: Claude/GPT genererer dokumenttekst basert på input.

- Backend: ai_service.py med Claude som primær, GPT som fallback
- Backend: POST /api/documents/:id/generate
- Prompt-system med separate filer per dokumenttype (prompts/-mappen)
- For Tilbud: Inkluder produktinfo fra pgvector (fase 8) - foreløpig hardkodet kontekst
- For Omprofilering: Les vedlegg, erstatt avsenderprofil med KVTAS (generisk, ikke bare Svalinn)
- For Svar på brev: Les vedlegg, skriv svarbrev med KVTAS-profil basert på instruksjoner
- JSON-respons med alle felt (mottaker, tekst, pris etc.)
- Frontend: "Generer"-knapp i Step3 eller Step4 som kaller API

**Leveranse**: AI genererer dokumenttekst. Forhåndsvisning mulig.

---

### Fase 7: Wizard steg 4 (forhåndsvisning)
**Mål**: Bruker kan se, redigere og regenerere dokumentet.

- Frontend: Step4Preview med MarkdownEditor
- Markdown → HTML rendering i forhåndsvisning
- Redigerbar preview (contenteditable eller tekstarea med preview)
- NL-felt for endringsinstruksjoner ("legg til info om montering")
- "Oppdater tekst"-knapp for regenerering
- Alle metadata-felt synlige og redigerbare (pris, mottaker, etc.)
- PriceSection-komponent med live MVA-beregning
- LoadingOverlay med one-liners under generering

**Leveranse**: Full forhåndsvisning med redigering og regenerering.

---

### Fase 8: pgvector kunnskapsbase
**Mål**: Daikin-kataloger og firmadata søkbart via embeddings.

- Installer pgvector-extension i PostgreSQL
- Backend: knowledge_service.py - PDF → tekst → chunks → embeddings
- Backend: embedding_service.py - søk med cosine similarity
- Backend: Admin-endepunkter for å laste opp/slette/se dokumenter
- Frontend: AdminPage med kunnskapsbase-oversikt
- Last opp + fjern dokumenter i admin-UI
- Se chunks per dokument
- Test-søk-funksjon i admin
- Integrer med ai_service.py: Hent relevante chunks før AI-generering
- Migrer Daikin-kataloger fra OpenAI vector stores til pgvector

**Leveranse**: Admin kan laste opp PDF-er. AI-generering bruker pgvector for produktinfo.

---

### Fase 9: Wizard steg 5 (fullfør)
**Mål**: Dokument fullføres, filer genereres, alt lagres.

- Backend: POST /api/documents/:id/finalize
  - Generer Word fra template (signert + usignert)
  - Generer PDF via LibreOffice (signert + usignert) med timeout
  - Lagre vedlegg med dokumentet
  - Oppdater document.status → 'finalized'
  - Lagre filstier i DB
- Frontend: Step5Complete med:
  - Suksessmelding
  - Nedlastingsknapper for alle 4 varianter
  - "Send på e-post"-knapp
  - Link tilbake til dashboard
- Backend: Word-template system (videreført fra v1 med forbedringer)
- Backend: Signatur-innsetting
- Lås dokumentet i UI etter fullføring

**Leveranse**: Komplett flyt fra start til ferdig dokument med nedlasting.

---

### Fase 10: E-post
**Mål**: Bruker kan sende dokumentene på e-post.

- Backend: POST /api/documents/:id/email
  - Lag zip-fil med alle 4 dokumentvarianter
  - Send via SMTP til brukerens registrerte e-post
  - Pent formatert e-post med dokumentnavn og metadata
- Frontend: "Send på e-post"-knapp i Step5Complete
- Bekreftelsesmelding etter sending
- Fallback: Generer zip for manuell nedlasting hvis SMTP feiler

**Leveranse**: Et klikk sender zip med alle dokumenter til brukerens e-post.

---

### Fase 11: Admin - brukeradministrasjon
**Mål**: Admin kan opprette og administrere brukere.

- Backend: Admin-endepunkter for brukere (beskyttet av rolle-guard)
- Frontend: Bruker-seksjon i AdminPage
- Opprett/rediger/slett brukere
- Sett rolle (user/admin)
- Sett e-postadresse per bruker

**Leveranse**: Admin kan administrere brukere uten å røre databasen direkte.

---

### Fase 12: Polish og deploy
**Mål**: Produksjonsklar applikasjon.

- Responsivt design (mobil-støtte)
- Feilhåndtering og brukervenlige feilmeldinger
- Loading-states overalt (TanStack Query gjør dette enkelt)
- Deploy-oppsett for Debian-servere
- Nginx-konfigurasjon for frontend + backend
- SSL/HTTPS
- Nginx rate limiting på auth- og generate-endepunkter
- Sikkerhet-headers via Nginx (X-Frame-Options, CSP, etc.)
- Helse-endepunkt (GET /health)
- Miljøvariabler og secrets-håndtering
- Backup-strategi: Automatisert PostgreSQL-dump + rsync av genererte filer (cron)
- Fjerne console.log og debug-kode
- Testing av hele flyten ende-til-ende

**Leveranse**: TekstFlyt v2 i produksjon med backup.

---

## Sikkerhet

### Autentisering
- JWT lagres i httpOnly + Secure cookies med SameSite=Strict
- Frontend håndterer aldri tokenet direkte - nettleseren sender automatisk
- Kort-levde access tokens, refresh via cookie
- Passord-hashing med bcrypt

### Autorisasjon
- Rolle-guard decorator på alle admin-endepunkter (403 for non-admin)
- Dokumenter filtrert per bruker (kun egne dokumenter synlige)

### Filopplasting
- secure_filename på alle opplastede filer
- Maks filstørrelse: 20 MB
- Hviteliste filtyper: PDF, DOCX, DOC, XLSX, XLS, JPG, PNG
- Lagring utenfor webroot med randomiserte filnavn
- Nedlasting kun via autoriserte API-endepunkter

### Generelt
- Parameteriserte SQL-queries (ingen string-formatering)
- CORS med eksplisitt origin (frontend.lasseruud.com)
- Input-validering på alle endepunkter
- HTTPS i produksjon

## Risiko og avhengigheter

| Risiko | Mitigering |
|--------|-----------|
| LibreOffice PDF-generering er treg/ustabil | Kjør som subprocess med timeout. Vurder weasyprint eller docx2pdf som alternativ. |
| pgvector embedding-kvalitet | Test med ekte Daikin-kataloger tidlig (fase 8) |
| Claude API-kostnader | Implementer caching av lignende forespørsler |
| Word-template kompleksitet fra v1 | Grundig test med alle dokumenttyper |
| Omprofilering mister innhold | Dedikert prompt + manuell verifisering i preview |
| Filopplasting-angrep | Sikkerhetstiltak i Fase 5 (se Sikkerhet-seksjon) |

## Prinsipper

1. **Enkelhet over kompleksitet** - Minst mulig abstraksjon, lesbar kode
2. **Progressiv utvikling** - Hver fase gir noe brukbart
3. **AI-agnostisk** - Arkitekturen skal ikke være låst til én AI-leverandør
4. **Data eid av oss** - Alt i egen database, ingen avhengighet til tredjeparts lagring
5. **Sikkerhet fra start** - Auth, input-validering, parameteriserte queries
