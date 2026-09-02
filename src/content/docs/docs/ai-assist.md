---
title: "Local AI & Document RAG"
description: Private, air-gapped AI assistance using local Ollama models (bge-m3 & gemma2:9b), pgvector document embeddings, web crawler ingestion, automated reply drafts, and cited runbook retrieval.
---

Salamandr integrates with local **Ollama** instances and private LLM endpoints to provide intelligent agent-assist capabilities without leaking confidential customer data to third-party cloud APIs.

---

## 1. Air-Gapped Local Architecture

Salamandr's **AI Engine** (`internal/aiprovider` & `internal/kbdoc`) runs completely on-premises. Embeddings and generative completions execute on your own GPU/CPU infrastructure:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Ingestion Sources                               │
│        • Uploaded Documents (.pdf, .docx, .xlsx, .csv, .md, .txt)      │
│        • Web Crawler Ingestion (Internal wikis, docs portals)          │
│        • Published Knowledge Base Articles                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Text Parsing, Sanitization & Content Hashing                        │
│    (Skips re-indexing unchanged documents via content hash)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Semantic Chunking (512 tokens with 50-token sliding overlap)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Vector Embedding Generation (Local Ollama: bge-m3, 1024 dimensions) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Vector Storage: PostgreSQL pgvector (HNSW Index + FTS)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ Hybrid Semantic + Full-Text Search
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. Grounded Context + Runbook Citations                                │
│    [Source: Telemetry-Manual.pdf, Page 4]                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 6. Response Drafting (Local Ollama: gemma2:9b)                         │
│    Drafts proposed reply in ticket composer with 1-click insertion     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ingesting Documents & Manuals

Support teams can upload technical manuals, warranty specifications, and clinical playbooks in bulk:

- **Supported Formats:** `.pdf`, `.docx`, `.xlsx`, `.csv`, `.md`, `.txt`.
- **Multi-File Batch Upload:** Select multiple files simultaneously via the file picker (`<input type="file" multiple>`). Files are uploaded and processed sequentially with live progress feedback, with partial success handling if any individual file fails.
- **Content Hashing (`kb_document_content_hash`):** The ingestion pipeline computes a SHA-256 hash of file contents. Re-uploading an existing unchanged document is an instant no-op, preventing wasteful GPU re-vectorization.
- **Document Visibility:** Documents can be tagged as `internal` (only staff agents can access and retrieve citations) or `public`.

---

## 3. Web Sources Crawler (`kb_web_sources`)

Index external product documentation, internal engineering wikis, or partner portals automatically:

1. Navigate to **Knowledge Base &rarr; Documents (RAG) &rarr; Web Sources**.
2. Click **Add Web Source**.
3. Specify the base URL (e.g. `https://docs.hospital.org/clinical-runbooks/`).
4. Set the crawl depth (e.g. `2`) and maximum page limits.
5. Click **Start Crawl**. Salamandr crawls pages, strips navigation headers and boilerplate, chunks text, and vectorizes content.

---

## 4. How Agents Use AI-Assist in Tickets

When working on a ticket on the [Ticket Detail Page](../ticket-detail-page/):

1. **Context Rail AI Search:**
   Click the **AI Assist** tab in the Context Rail. Salamandr vectorizes the conversation context and retrieves the top most relevant passages from your indexed documents and runbooks.
2. **Grounded Drafts with Direct Citations:**
   The local LLM drafts a suggested response citing exact source files (e.g., `[Source: ECG-Service-Guide-v2.pdf, Page 12]`).
3. **One-Click Composer Injection:**
   The agent clicks **Insert Draft** to inject the text into the rich composer, reviews the wording, and dispatches the reply.
4. **Sentiment & Subject Suggestions:**
   Staff can click **Analyze Sentiment** to rate customer urgency and tone, or click **Suggest Subject** to replace auto-generated subject lines with descriptive summaries.

:::caution[Human in the Loop Principle]
Salamandr adheres to a strict *"Propose, don't act"* design: the AI assistant never transmits replies to customers autonomously. Every message draft must be reviewed, edited if necessary, and sent by an authorized support agent.
:::

---

## 5. Environment Configuration

Configure Ollama in your `.env` or Docker Compose deployment:

```bash
# Local Ollama Endpoint (Air-gapped)
OLLAMA_HOST=http://ollama:11434

# Chat generation model for response drafting (gemma2:9b recommended; gemma2:2b for low-VRAM CPU setups)
OLLAMA_MODEL=gemma2:9b

# Multilingual embedding model for pgvector (1024-dimensional vectors)
OLLAMA_EMBED_MODEL=bge-m3
```

Pull the recommended models inside your Ollama container:
```bash
docker compose exec ollama ollama pull bge-m3
docker compose exec ollama ollama pull gemma2:9b
```

---

## 6. REST API Reference

### 1. Ingest Document for RAG Indexing
```bash
curl -X POST https://helpdesk.yourcompany.com/api/v1/kb-documents \
  -H "Authorization: Bearer <API_TOKEN>" \
  -F "file=@protocol_runbook.pdf" \
  -F "visibility=internal"
```

### 2. Create Web Source Crawler Task
```http
POST /api/v1/kb-web-sources
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "url": "https://wiki.hospital.org/biomedical/telemetry",
  "max_depth": 2,
  "max_pages": 50
}
```

### 3. Query Semantic RAG & Draft Response
```http
POST /api/v1/kb-documents/ask
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "query": "What are the calibration steps for error E-14 on Holter model 4?",
  "ticket_id": "88c12345-6789-abcd-ef01-234567890abc",
  "top_k": 3
}
```

#### Response:
```json
{
  "draft_reply": "To calibrate Holter Model 4 following error E-14:\n1. Power off device and hold the sync button for 5 seconds.\n2. Verify the status LED shows steady blue.\n3. Run voltage check mode.",
  "citations": [
    {
      "source_name": "Holter-Model-4-Maintenance-Guide.pdf",
      "page_number": 14,
      "snippet": "Error code E-14 indicates voltage mismatch during initialization. Hold sync for 5s to enter diagnostic mode."
    }
  ]
}
```
