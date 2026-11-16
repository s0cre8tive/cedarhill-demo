# Cedar Hill Church — Kingdom Kit demo

A working demo church website with a built-in staff dashboard, made for the **Kingdom Kit** case study.
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

**Demo logins** (password for all of them: `CedarHill2026`)

| Who | Email | What they can do |
| --- | --- | --- |
| Pastor Renee Walker — Pastor / Admin | pastor@cedarhill.demo | Everything, including private prayer requests and adding staff |
| Tasha Bennett — Office / Website Editor | office@cedarhill.demo | Edit the site, approve ministry posts, work the inbox (not "Pastors only" prayers) |
| Marcus Reed — Ministry Leader (Cedar Youth) | youth@cedarhill.demo | Post Cedar Youth events (held for approval), update the Cedar Youth details, upload photos |

| Priya Nair — Volunteer (Kids team) · Cathedral only | volunteer@cedarhill.demo | Team Communication only: her team's space and team announcements. Nothing else in the dashboard |

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
| Demo help | The login screen lists the demo logins, and Tasha and Marcus get a 3-step "Demo tour" on the dashboard home |

---

## Team Communication (Cathedral package)

*"Your whole team on the same page, in the same place you already run the church."*

A staff and volunteer area inside the dashboard, so the team stops running ministry out of group texts.
It is part of the **Cathedral** package. The package is one setting in Vercel:

| `KIT_PACKAGE` | What you get |
| --- | --- |
| `cathedral` (or left empty) | Everything, including Team Communication |
| `sanctuary` or `chapel` | The dashboard exactly as it was. Team Communication doesn't show and can't be reached |

| Area | What it does |
| --- | --- |
| Team announcements | The notice board at the top of the dashboard (not the public Announcement Banner). Title, short note, optional link or attachment, optional "pin until" date. Send to everyone, one or more teams, or one campus. The author sees "Seen by 9 of 14", can open who hasn't read it, and can send **one** reminder. "Read by all" turns green |
| Teams | `/admin/teams`: one space per team with posts and replies, newest first. A calm message board, not live chat. Staff manage who's on each team under **Manage teams** |
| Team notes on records | A notes panel on the right of every Event, Person (guest) and Sermon. Type `@` to tag a teammate: they get a notification that links straight back to the record |
| My notifications | The bell in the header shows the unread count (it checks when a page loads, when you come back to the tab, and once a minute). `/admin/notifications` lists mentions, replies, announcements and reminders |
| Emails | Mentions, announcements and reminders are emailed through Resend. Each person chooses **Right away**, **Once a day** or **Off** under their account (`/admin/account`), and every email links there. The once-a-day summary goes out weekday mornings with `/cron/daily` |
| Weekly rundown | Thursday afternoon (Eastern) with `/cron/weekly`: this Sunday's events, announcements they haven't read, and anything waiting on them, with one button back to the dashboard |
| Campus filter | Add campuses under **Campuses**. The filter on the board and on Teams only appears once there are two or more |
| Volunteer access level | A fourth access level. Volunteers see the teams they belong to and team announcements, can reply and mark as read, and get nothing else in the dashboard |

**Who can do what:** volunteers and ministry leaders read and post only in their own teams. Pastor / Admin and Office see every team.
Only Pastor / Admin and Office can post an announcement to everyone; a ministry leader can post one to the teams they lead.
People edit and remove only their own posts; a Pastor / Admin can remove any.

**In the demo:** six teams (Church Office, Youth, Worship, Kids, Guest Care, Facilities), three announcements (one pinned, one read by all,
one read by 5 of 12), a Youth thread about the winter retreat, a note on a guest that tags Marcus, and a note on Sunday's event.
Marcus signs in to 2 unread; Tasha sees the read counts. It all comes back with the nightly reset.
Demo logins use made-up addresses (`…@cedarhill.demo`), so the site never sends them real email.

**Later, not in this version:** live chat and typing indicators, text messages (SMS), a phone app, video or voice,
a file library, volunteer scheduling, and messages to the whole congregation (that's Guest Care and the public site).

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
