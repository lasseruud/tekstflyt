# Deploy Checklist - TekstFlyt v2

## Server-oppsett (backend.lasseruud.com)

### 1. PostgreSQL

```bash
# Installer PostgreSQL
sudo apt install postgresql postgresql-contrib

# Opprett database og bruker
sudo -u postgres psql
CREATE USER tekstflyt WITH PASSWORD 'velg-et-sterkt-passord';
CREATE DATABASE tekstflyt OWNER tekstflyt;
\q
```

### 2. pgvector (for kunnskapsbase/RAG)

```bash
# Installer pgvector
sudo apt install postgresql-16-pgvector   # Sjekk PostgreSQL-versjon med: psql --version

# Aktiver extension
sudo -u postgres psql -d tekstflyt
CREATE EXTENSION vector;
\q
```

### 3. Kjør migrasjoner og seed

```bash
cd /opt/kvtas.tekstflyt.com/backend
.venv/bin/python migrate.py --seed
```

Dette oppretter alle tabeller og 2 testbrukere:
- `lasse` / `demo123` (admin)
- `trond` / `demo123` (user)

**Bytt passord etter første innlogging!**

### 4. LibreOffice (for PDF-generering)

```bash
sudo apt install libreoffice-core libreoffice-writer
```

### 5. pdftotext (for å lese PDF-vedlegg)

```bash
sudo apt install poppler-utils
```

### 6. Backend .env

Oppdater `/opt/kvtas.tekstflyt.com/backend/.env`:

```
DATABASE_URL=postgresql://tekstflyt:DITT-PASSORD@localhost:5432/tekstflyt
JWT_SECRET=generer-med-python-c-import-secrets-secrets.token_hex-32
JWT_EXPIRY_HOURS=24
CORS_ORIGIN=https://kvtas.tekstflyt.com
SECURE_COOKIES=1

# AI (allerede satt fra før)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# E-post (valgfritt - sett opp når SMTP er klar)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASS=...
# SMTP_FROM=noreply@kvtas.no
```

### 7. Deploy

```bash
# Backend
ssh lasse@backend.lasseruud.com "cd /opt/kvtas.tekstflyt.com && git pull && cd backend && .venv/bin/pip install -r requirements.txt -q"
ssh lasse@backend.lasseruud.com "sudo systemctl restart tekstflyt"

# Frontend
cd frontend && npm run build
scp -r dist/. lasse@frontend.lasseruud.com:/var/www/kvtas.tekstflyt.com/
```

### 8. Verifiser

1. Gå til https://kvtas.tekstflyt.com
2. Logg inn med `lasse` / `demo123`
3. Opprett et test-dokument (notat er enklest)
4. Generer tekst
5. Fullfør dokumentet
6. Last ned Word-fil
7. Sjekk admin-panelet

## Rekkefølge

1. PostgreSQL + pgvector
2. Oppdater .env med DB-passord og JWT_SECRET
3. `git pull` + `pip install`
4. Kjør migrasjoner: `python migrate.py --seed`
5. `sudo systemctl restart tekstflyt`
6. Bygg og deploy frontend
7. Test!
