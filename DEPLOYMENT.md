# Deploy TUGather to Vercel

This app uses Expo SDK 58 and Expo Router with `web.output: "single"`.
There are no Expo API/server routes. `vercel.json` exports the web app to
`dist` and rewrites navigation requests to `index.html`.

## Vercel project settings

- Root Directory: the directory containing this project's `package.json` and `vercel.json`.
- Framework Preset: Other.
- Build Command: `npx expo export --platform web`.
- Output Directory: `dist` (not `dist/client`).
- Install Command: default npm installation, or `npm ci`.
- Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  from the Supabase project's API settings to Production and Preview as needed.
  Use a publishable key only; never use `sb_secret_` or `service_role`.
  These variables are embedded in the browser bundle at build time, so redeploy
  after changing them. `.env.local` is ignored by Git and is not sent to Vercel.

## Validate and push

```sh
npx expo lint
npx tsc --noEmit
npx expo export --platform web
git status --short
git add app.json vercel.json .env.example DEPLOYMENT.md src/app
# Include the existing web dependency changes if they have not been committed:
git add package.json package-lock.json
git diff --cached --stat
git commit -m "Fix Expo web output and Vercel SPA deployment"
git push origin HEAD
```

Push to the branch connected to Vercel. Other branches normally create Preview
deployments; the configured Production Branch creates Production deployments.
If necessary, use Redeploy in Vercel after correcting project settings.

## Browser checks after deployment

- `/`: welcome page; open Login and guest browsing.
- `/login`: login form, required-field validation, and guest navigation.
- `/home`: Home tab, event list, and links to Explore/Tickets.
- `/explore`: search/filter controls and links to event details.
- `/tickets`, `/profile`, `/event/<existing-event-id>`: direct links and reload.
- Refresh `/login`, `/home`, and `/explore`; each must keep working.
- Check browser Network for JS/CSS assets returning their correct content types.
- Sign in with an existing test account to verify authenticated flows.

Home has an explicit `/home` URL so it does not compete with the welcome `/`
route. The existing UI and Supabase schema are preserved.

References: [Expo web deployment](https://docs.expo.dev/guides/publishing-websites/)
and [Expo environment variables](https://docs.expo.dev/guides/environment-variables/).
