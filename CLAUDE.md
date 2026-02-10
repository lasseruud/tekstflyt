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
4. **Omprofilering** - Svalinn-dokumenter reprofilert til KVTAS (1:1, ikke oppsummering)

## Wizard-flyt
```
Innlogging → Dashboard → Velg type → Fyll inn felt → Prompt + vedlegg → Forhåndsvisning → Fullfør
```

## Viktige forretningsregler
- Svalinn AS → Kulde- & Varmepumpeteknikk AS (ved omprofilering)
- Hilde Nordli → Trond Ilbråten (ved omprofilering)
- Privat = inkl. mva, Bedrift = eks. mva
- Ferdige dokumenter er LÅST - kan ikke redigeres, men kan brukes som utgangspunkt for nye
- Word-dokumenter genereres i 4 varianter: Word, signert Word, PDF, signert PDF
- Produktkataloger (Daikin) lagres i pgvector for RAG-søk

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
