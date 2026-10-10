<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Games, categories and computers live in Lovable Cloud tables; public pages read them through server functions in src/lib/catalog.functions.ts so SSR works without a session.
- Admin area lives under src/routes/_authenticated/admin*; writes go through the browser client and are protected by admin-only RLS via has_role, because the UI check alone is not a security boundary.
- The first account to sign up becomes admin through a database trigger, so the owner can bootstrap without manual role edits.
- Seeded games without image_url fall back to bundled covers by slug in src/lib/catalog.ts.
