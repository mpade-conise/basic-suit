# Basic Suit

A mobile-first, video-first social discovery experience built with **React, Vite, and Supabase**.

## Included in this foundation

- Responsive dark interface inspired by short-form video platforms.
- Video feed with sample content, captions, playback controls, mute, like interactions, follow toggles, bookmarks, and share links.
- Search across demo captions, creators, and topics.
- Stories strip, trending topics, creator suggestions, and mobile bottom navigation.
- Sign-in/sign-up UI using Supabase Auth when configured.
- Video upload flow using Supabase Storage and the `videos` table.
- Initial SQL schema for profiles, videos, likes, comments, follows, bookmarks, notifications, row-level security, profile provisioning, and a 50 MB video bucket.
- Environment secrets excluded from Git.

Some surfaces (LIVE, direct messages, notifications, and persistent comment submission) are currently interface placeholders; they need their service logic before production use. Demo feed interactions are local until connected to their corresponding backend operations.

## Run locally

1. Install Node.js 20 or newer.
2. Clone this repository and run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your Supabase project URL and **publishable/anon key** to `.env`.
5. Run `npm run dev`; run `npm run build` to verify a production build.

Never put a Supabase service-role key or other server secret in a `VITE_*` variable. Vite variables are included in browser code.

## Supabase setup

1. Open your Supabase project's SQL Editor and run `supabase/schema.sql` once.
2. Confirm email authentication is configured in Supabase Auth.
3. The SQL creates the public `videos` Storage bucket with a 50 MB file-size limit and folder-scoped authenticated upload/delete policies.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your local `.env` and your hosting provider's environment settings.
5. Configure allowed redirect URLs in Supabase Auth for localhost and your deployed domain.

The frontend uses a public bucket for playback URLs. Do not store private media in this bucket; use signed URLs and a separate private bucket for private content.

## Deploy

Import this GitHub repository into Vercel or another Vite-compatible static host. Build command: `npm run build`. Output directory: `dist`. Add the same two public Supabase environment variables in the host settings.

## Security notes

Row-level security is enabled for application tables. The SQL is an initial baseline, not a substitute for a production security review, moderation controls, rate limits, video transcoding, or abuse prevention.
