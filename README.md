# SONVIX AI Music — MVP

A deployable Vercel/Vite/React prototype for an AI music creation platform. **This version does not generate audio**. It creates local browser drafts, and the `/api/generate` endpoint deliberately returns HTTP 503 until a licensed AI music provider is integrated.

## Deploy on Vercel (free tier)
1. Create a new GitHub repository and upload the contents of this folder (not the parent folder).
2. In Vercel select **Add New → Project**, import the repository.
3. Framework preset: **Vite**; build command: `npm run build`; output directory: `dist`.
4. Deploy. Vercel will automatically deploy the `api/generate.js` serverless function.

## Run locally
```bash
npm install
npm run dev
```
The local Vite development server does not serve Vercel functions; use `vercel dev` to test `/api/generate` locally, or just save drafts while using Vite.

## Current functionality
- Responsive studio with genre, mood, language, instrumental mode, prompt and title
- Local draft library saved in `localStorage` on the current browser only
- Explicit demo-mode labels and accurate non-generation responses
- Vercel function stub with basic input validation

## Production checklist
- Select and verify a music-generation API provider: licensing, voice generation, commercial rights, pricing, moderation, asynchronous job status, and permitted use cases.
- Implement secure server-side provider API requests, job polling/webhooks, authentication, usage quotas, abuse prevention, and billing before enabling public generation.
- Add Supabase Auth + database + storage for multi-device accounts; configure row-level security and private buckets.
- Add legal notices, privacy policy, terms, rights policy, and clear audio ownership/licensing rules.
- Never expose provider secrets in Vite variables prefixed `VITE_` or in frontend code.
- On free Vercel hosting, provider generation costs and storage/bandwidth are not automatically free.
