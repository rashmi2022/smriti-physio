# Physiotherapy website

A static site: `index.html`, `styles.css`, `app.js`, `config.js`. It needs no build step and can be hosted anywhere (Netlify, Vercel, GitHub Pages, Hostinger).

## 1. Before going live (required)

Open **`config.js`** and change everything marked `← CHANGE`:

| Setting | What to put |
|---|---|
| `name`, `shortName`, `brand` | Your name as it should appear |
| `city`, `address` | Clinic location (used for the Google Maps link) |
| `phone`, `whatsapp` | `91` + 10-digit number, digits only, e.g. `919812345678` |
| `credentials` | e.g. `["BPT", "MPT (Ortho)"]`. Leave empty to hide |
| `hours` | Your working hours (also the slots offered to patients) |
| `visitModes` | Remove "Home visit" / "Online" if you don't offer them |
| `googleReviewsUrl` | Your Google Business review link (optional) |

Also:

- **Photo:** save a portrait as `assets/physio.jpg`. It replaces the illustration in the hero and the "S" in the About section automatically.
- **Reviews:** the eight reviews in `index.html` (search for `TEMPLATE REVIEWS`) are **samples**. Replace them with real patient reviews (with their permission) before launch. Under India's Consumer Protection Act, 2019, made-up reviews count as misleading advertising.
- **Bio:** edit the About text in `index.html` (search for `replace with your own bio`).

To preview locally, run `python3 -m http.server` in this folder and open http://localhost:8000.

## 2. Booking modes

**Mode A: WhatsApp request (default, no setup).** The patient picks a free slot from your working hours and fills the form. WhatsApp then opens with the booking already written out, addressed to your number, and the patient taps send. You confirm in the chat. This mode can't see your calendar, so it can offer a slot that's already taken.

**Mode B: Google Calendar + automatic WhatsApp alert (about 10 minutes of setup).**
- Slots are read live from your Google Calendar. Busy times and all-day "Leave" events are hidden.
- Each booking is written to your calendar as an event holding the patient's details and a WhatsApp link to them.
- You get a WhatsApp message and an email for every booking, and the patient doesn't have to do anything more.
- If the patient gave an email, they get a Google Calendar invite.

### Setting up Mode B

**Step 1: create the script**
1. Go to https://script.google.com and create a **New project**. Use the same Google account as your calendar.
2. Delete the sample code and paste in everything from `google-apps-script/Code.gs`.
3. Open ⚙️ **Project Settings** and tick *Show "appsscript.json" manifest file*. Go back to the Editor, open `appsscript.json`, and replace its contents with `google-apps-script/appsscript.json`.
4. If needed, edit `CONFIG` at the top of `Code.gs`. Keep `HOURS` the same as in `config.js`.

**Step 2: set up WhatsApp alerts through CallMeBot (free)**
1. Open https://www.callmebot.com/blog/free-api-whatsapp-messages/ and save the CallMeBot phone number listed there in your contacts.
2. From your WhatsApp, send that number: `I allow callmebot to send me messages`
3. It replies with an **API key**.
4. In Apps Script, open ⚙️ **Project Settings → Script Properties** and add:
   - `CALLMEBOT_PHONE` = `+919812345678` (your WhatsApp number)
   - `CALLMEBOT_APIKEY` = the key you received

CallMeBot is a free third-party service and can only message *your own* number. If it ever goes down you will still get the email alert and the calendar event. For a more robust option later, switch to the official WhatsApp Business Cloud API.

**Step 3: test**
In the editor, choose the `testSetup` function and click **Run**. Approve the permissions (Google shows an "unverified app" screen for your own script: *Advanced → Go to project*). You should receive a test WhatsApp and a test email.

**Step 4: deploy**
1. Click **Deploy → New deployment → Web app**.
2. Set *Execute as*: **Me**. Set *Who has access*: **Anyone**.
3. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
4. Paste it into `config.js` as `bookingEndpoint: "https://script.google.com/macros/s/…/exec"`.

The booking section now says "Slots are live". If the script can't be reached, the site automatically falls back to Mode A.

> Whenever you change `Code.gs`, go to **Deploy → Manage deployments → Edit → Version: New version** so that the same URL keeps working.

### Day-to-day
- **Block time off:** add an event to your Google Calendar. An all-day event blocks the whole day.
- **Cancel a booking:** delete the event and the slot opens again.
- Home-visit bookings are coloured orange in your calendar.

## Files

```
index.html                 page content and sections
styles.css                 design (colours are CSS variables at the top)
app.js                     booking logic, slot picker, WhatsApp links
config.js                  your details (edit this)
assets/physio.jpg          your photo (add it)
google-apps-script/        Google Calendar + WhatsApp backend
```
