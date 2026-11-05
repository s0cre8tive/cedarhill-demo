# Cedar Hill Church — EZEdit Mission demo

A working demo church website with a built-in staff dashboard, made for the **EZEdit Mission** case study.
Cedar Hill Church, Maple Grove, and everyone named here are fictional. Photos are free Unsplash photos.

- Website: `/`
- Staff dashboard: `/admin`
- Forms: `/visit`, `/member`, `/salvation`, `/prayer`

Built with Next.js + Payload CMS (same engine as the DICC site).

---

## Try it on your computer

You need [Node.js 20+](https://nodejs.org).

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run seed              # loads Cedar Hill's content, downloads the photos, creates demo logins
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin

**Demo logins** (password for all three: `CedarHill2026`)

| Who | Email | What they can do |
| --- | --- | --- |
| Pastor Renee Walker — Pastor / Admin | pastor@cedarhill.demo | Everything, including private prayer requests and adding staff |
| Tasha Bennett — Office / Website Editor | office@cedarhill.demo | Edit the site, approve ministry posts, work the inbox (not "Pastors only" prayers) |
| Marcus Reed — Ministry Leader (Cedar Youth) | youth@cedarhill.demo | Post Cedar Youth events (held for approval), update the Cedar Youth details, upload photos |

The seed also has Marcus post a **Youth Lock-In** so there's something waiting in the approval queue.

---

## What's in the dashboard

| Area | What it controls |
| --- | --- |
| Announcement Banner | Coral bar across the top of every page; can switch itself off on a date |
| Service Times & Contact | The dark schedule band, hero line, Visit section and every form |
| Events | "Coming up". Past events disappear. Ministry leaders' events wait for approval |
| Ministries | "Find your people" cards (photo, meeting time, leader) |
| Sermons | Newest is featured in "Messages" (YouTube thumbnail if there's a link) |
| Photos | Upload and pick a spot: homepage hero, photo strip, Visit section, sermon art |
| Leaders | "Our pastors" (monogram shows if there's no photo) |
| Inbox | Every form submission in plain sentences; New → Following up → Done |
| Recent Changes | One log of every change: who, what, live or waiting. Email updates will write here too |
| People (CRM) | Everyone the church is getting to know. Plan a Visit, New Member and Salvation forms add the person automatically (matched by email or phone, so no duplicates) with a follow-up due in 2 days. Prayer requests stay private in the Inbox |
| Stay connected pop-up | On the homepage, after 15 seconds or halfway down the page. Asks for a first name and email, and links to the prayer request form. Sign-ups go to the Inbox and to People with the **Email list** tag. Closing it hides it for 30 days; signing up hides it for good. Add `?connect` to the address to open it any time |
| Email list (Kit or Mailchimp) | Pop-up sign-ups are sent to the church's email service. In Vercel add `KIT_API_KEY` (and optionally `KIT_TAG_ID`), or `MAILCHIMP_API_KEY` + `MAILCHIMP_AUDIENCE_ID`. The dashboard shows whether it's connected, and Recent changes shows each sign-up (or a coral "Blocked" if the key is wrong). Without a key, sign-ups are still saved in People |
| Pipeline board | `/admin/pipeline`: drag people through New guest → Contacted → Second visit → Connected → Member. Filter by tag or "assigned to me" and download the list as a spreadsheet (CSV) |
| Follow-ups | Tasks like "Call Sarah by Friday", assigned to a staff member. Yours show on the dashboard home |
| Tags | Groups like Youth, Worship or Volunteer. All staff can see and update People; only the Pastor / Admin and Office can delete |
| Reset demo | Pastor / Admin only, at the bottom of the dashboard home. Puts all starter content back, clears the inbox and log, and resets the Tasha and Marcus logins to `CedarHill2026`. Accounts you added are kept. Set `DEMO_RESET=off` to hide it on a real church site |
| Nightly reset | Vercel runs `/cron/reset-demo` every night (see `vercel.json`). Needs a `CRON_SECRET` environment variable in Vercel |
| Demo help | The login screen lists the two demo logins, and Tasha and Marcus get a 3-step "Demo tour" on the dashboard home |

---

## How it maps to the case study

- **Mid-size church setup:** office admin runs the dashboard; ministry leaders post for their own ministry; the office approves.
- **One source of truth:** every edit lands in *Recent Changes* tagged by how it was made (`dashboard` today, `email` next).
- **Ready for the email path:** `src/lib/changeLog.ts` → `logChange(req, { source: 'email', status: 'pending', … })` is what the email updater will call after a sender confirms a preview.

---

## Photos

On first run the site downloads 12 free Unsplash photos into **Photos**, so staff can swap any of them.
If a download fails (no internet), the page loads that photo straight from Unsplash instead.
Credits are saved on each photo: Terren Hurst, Christian Harb, Priscilla Du Preez, Sara Cottle, Jon Tyson,
Edward Cisneros, Joel Muniz, Elianna Gill, Andrik Langfield, Hannah Busing and Aaron Burden on Unsplash.

The pastor portraits and the logo are in `public/demo` and `public/cedarhill-logo.png`.

---

## Putting it online (same steps as DICC)

1. Put the folder in a **private GitHub** repo.
2. **Vercel** → Add New Project → import it.
3. Vercel **Storage** → add **Neon** (Postgres) and **Blob**; both connect automatically.
4. **Environment variables:** `PAYLOAD_SECRET` (long random string), `NEXT_PUBLIC_SERVER_URL` (your Vercel address), `FIRST_ADMIN_EMAIL` (your email).
5. **Deploy.** Tables and the Cedar Hill demo content (with photos) load automatically on first start.
6. Go to `/admin` right away and create your account. Then add demo accounts under **Staff** if you want to show the roles.

Security built in: HTTPS headers, login lockout (5 tries / 15 min), strong passwords, first-admin email lock,
private inbox and staff list, spam protection on forms, GraphQL off, dashboard hidden from search engines.
