Summary of edits made in this session

- UI: Updated login left-panel gradient to match loading screen
  - File: public/index.html (left panel `.lp-left` gradient)

- Frontend: Use unified dashboard stats in counselor view
  - File: src/pages/userDashboard.js
  - Change: Removed separate `fetchCounselors()`; now uses `fetchDashboardStats()` and `stats.counselorStats`.

- Backend: Ensure deterministic .env loading and add debug logging
  - File: server/supabase.js
  - Change: `dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true })` added; debug `console.log('SUPABASE_GET_LEADS', ...)` added to `getLeads()`.

- Misc: Seed/demo support and small infrastructure edits
  - Files: scripts/seed-real-users.mjs, .env.example, SUPABASE_SETUP.md

- Tests/Dev: Added temporary logs and seeded demo users to reproduce issue locally
  - Files: server/index.js (server start logs), server/data.json (local fallback)

Notes
- I committed and pushed these changes to the `main` branch with commit message: "chore: sync local changes" and then added this `CHANGES.md` documenting the edits.
- If you want a more detailed change-by-change diff or to split into smaller commits, I can rewrite history or make follow-up commits.
