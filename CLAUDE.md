# CLAUDE.md - TekstFlyt v2

## Prosjekt
TekstFlyt v2 er en AI-drevet dokumentgenerator for Kulde- & Varmepumpeteknikk AS (KVTAS). Versjon 2 er en fullstendig nyskriving av v1 (Flask + vanilla JS) til en moderne stack.

## Tech Stack
- **Frontend**: Vite + React + TypeScript
- **Backend**: Python / Flask
- **Database**: PostgreSQL + pgvector
- **AI**: Claude (primær tekstgenerering), GPT (fallback), pgvector for RAG
- **Dokumentgenerering**: python-docx (Word), LibreOffice headless (PDF)
- **Datahenting**: TanStack Query (React Query)
- **Hosting**: frontend.lasseruud.com + backend.lasseruud.com (Debian-servere)

## Arkitektur
```
Frontend (Vite/React/TS)        Backend (Flask/Python)
frontend.lasseruud.com          backend.lasseruud.com
        |                               |
   TanStack Query  <-- REST API -->  Flask Blueprints
        |                               |
   React Router                   PostgreSQL + pgvector
   (wizard-flyt)                        |
                                  AI-lag (Claude/GPT)
                                        |
                                  Dokumentgenerering
                                  (python-docx + LibreOffice)
```

## Dokumenttyper
1. **Tilbud** - Salgstilbud med produktinfo fra pgvector, pris/MVA-logikk
2. **Brev** - Formelle brev med mottaker-info
3. **Notat** - Interne notater, minimal metadata
4. **Omprofilering** - Dokumenter fra leverandører (primært Svalinn) reprofilert til KVTAS (1:1, generisk - ikke låst til én avsender)
5. **Svar på brev** - Bruker laster opp mottatt brev, gir instruksjoner, AI skriver svarbrev med KVTAS-profil

## Wizard-flyt
```
Innlogging → Dashboard → Velg type → Fyll inn felt → Prompt + vedlegg → Forhåndsvisning → Fullfør
```

## Viktige forretningsregler
- Omprofilering erstatter avsenderprofil dynamisk (vanligste: Svalinn AS → KVTAS, Hilde Nordli → Trond Ilbråten)
- Privat = inkl. mva, Bedrift = eks. mva
- Ferdige dokumenter er LÅST - kan ikke redigeres, men kan brukes som utgangspunkt for nye
- Word-dokumenter genereres i 4 varianter: Word, signert Word, PDF, signert PDF
- Produktkataloger (Daikin) lagres i pgvector for RAG-søk
- Kunderegister med autocomplete i wizard (importert fra Drifti CRM via CSV)

## Sikkerhet
- Auth: JWT i httpOnly cookies (SameSite=Strict), aldri i localStorage
- Admin-endepunkter beskyttet med rolle-guard decorator
- Filopplasting: secure_filename, 20MB maks, hviteliste filtyper, lagring utenfor webroot
- SQL: Parameteriserte queries, ingen string-formatering
- CORS: Eksplisitt origin (frontend.lasseruud.com)

## Kodekonvensjoner
- Frontend: React funksjonelle komponenter, TypeScript strict
- Backend: Flask blueprints, type hints, logging
- API: REST med JSON, konsistente feilmeldinger
- Ingen useEffect for datahenting - bruk TanStack Query
- Norske brukergrensesnitt, engelsk kode/kommentarer

## Bruker-preferanser (Lasse)
- Liker å diskutere før planlegging, planlegge før koding
- Bruker Gemini og Codex som reviewers (ikke kodere)
- Deployer på egne Debian-servere med separate frontend/backend-domener
- Foretrekker enkel, lesbar kode over prematur abstraksjon
- Kommuniserer på norsk

## Samarbeidsmodell
- Claude: Planlegger og koder
- Gemini: Reviewer planer og kode, gir innspill
- Codex: Reviewer planer og kode, gir innspill
- Gemini og Codex gjør IKKE endringer - kun rapporter og anbefalinger
