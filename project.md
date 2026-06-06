# Memory Vault — Engineering Context

## Architecture
- Next.js 14 App Router + TypeScript strict mode
- Supabase: PostgreSQL + pgvector + RLS + Auth
- OpenAI text-embedding-3-small (1536 dimensions)
- Anthropic Claude claude-sonnet-4-6 (chat)
- Resend (transactional email)
- Vercel (hosting + cron jobs)

## Critical Rules
1. Personal vault data NEVER leaks to team/project queries
2. Every Supabase table has RLS enabled
3. Never expose service_role key to client
4. Always validate with Zod before DB operations
5. Embeddings generated server-side only

## Vault Model
- Personal vault: user_id scoped, collections
- Work vault: project scoped, invite-only members
- RAG: Personal = user's notes only
         Work = all project members' notes


Dependencies
# Supabase SSR (Server Side Rendering support)
npm install @supabase/supabase-js @supabase/ssr

# OpenAI (embeddings)
npm install openai

# Anthropic (chat)
npm install @anthropic-ai/sdk

# Email
npm install resend

# Icons
npm install lucide-react

# State management (lightweight)
npm install zustand

# Form validation
npm install zod