# Red Ribbon Week · Colorado Connections Academy

A student activity site for Red Ribbon Week (October 23–31), run by Mrs. Pernal, School Counselor.

Students enter their first name and last initial and their grade (K–8). They then complete seven activities: Spirit Day Check-In, Take the Pledge, Slogan Contest, What Would You Do?, Healthy Choices Bingo, My Bright Future, and Share a Photo. The site also links to the official Red Ribbon photo contest.

- **Website:** hosted on Vercel (this repo)
- **Data:** saved to Mrs. Pernal's Google Sheet.
- **Photos:** each photo shows as a thumbnail in the Sheet's **Photo** column. The full-size photo is saved to a private Google Drive folder and linked in the **Photo link** column.

## Spirit days

Each spirit day opens on its own date:

| Date | Theme |
|---|---|
| Fri, Oct 23 | Wear Red ❤️ |
| Mon, Oct 26 | My Future Is Bright 😎 |
| Tue, Oct 27 | Team Up 🏈 |
| Wed, Oct 28 | Sock It to Drugs 🧦 |
| Thu, Oct 29 | Hats Off 🎩 |
| Fri, Oct 30 | Say Boo to Drugs 🎃 |

- Future days are locked.
- Students can check in late for a day they missed, and the Sheet marks it "(late check-in)".
- Each check-in can include an optional photo.

**To preview a specific day**, add `?day=2026-10-26` to the end of the site's address. You can use any date. Don't share this version with students.

## Files

| File | What it is |
|---|---|
| `index.html` | The student website |
| `config.js` | **The one setting you edit:** the Google Apps Script link |
| `assets/logo.png` | School logo |
| `assets/flyer.jpg` | 2026 Red Ribbon Week flyer |
| `vercel.json` | Vercel settings |
| `.vercelignore` | Keeps the backend code and this README off the public site |
| `apps-script/Code.gs` | The Google backend. Paste it into Apps Script; it does not run on Vercel. |

## Setup

### 1. Google backend (on Mrs. Pernal's school Google account)

1. Create a new Google Sheet, for example "Red Ribbon Week Responses".
2. Click **Extensions → Apps Script**.
3. Replace everything in `Code.gs` with the contents of `apps-script/Code.gs` from this repo. Click **Save**.
4. Optional: choose `setup` in the function dropdown and click **Run**. This creates the tabs and the photo folder, and handles the permission prompt up front.
5. Click **Deploy → New deployment**, click the gear icon, and choose **Web app**. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**. Approve the permissions; if you see "Google hasn't verified this app", click **Advanced → Go to project**.
7. Copy the **Web app URL**. It ends in `/exec`.
8. Test it: open that URL in a browser. You should see `"status":"running"`.

> If "Anyone" isn't available because the school restricts it, ask school IT to allow it for this script. Choosing "Anyone within the school" would require students to sign in to Google, and the website can't do that from another domain.

### 2. Connect the website

Open `config.js` and paste the URL between the quotes:

```js
window.RRW_CONFIG = {
  SUBMIT_URL: "https://script.google.com/macros/s/AKfy.../exec"
};
```

Commit and push.

### 3. Deploy on Vercel

1. In Vercel, click **Add New → Project** and import this GitHub repo.
2. Framework preset: **Other**. Leave the build command and output directory empty.
3. Click **Deploy**. Every push to the main branch redeploys automatically.

### 4. Check it

Open the Vercel site. The dark "Preview mode" bar at the top should be **gone**. Submit a test slogan and confirm a new row appears in the Sheet. Then delete the test row.

## Changing the backend later

After editing `Code.gs`, click **Deploy → Manage deployments → ✏️ Edit**, set **Version** to **New version**, and click **Deploy**. This keeps the same URL, so `config.js` doesn't change. Choosing **New deployment** instead creates a new URL that you'd have to paste into `config.js` again.

## Editing content

All activity text lives near the top of the `<script>` in `index.html`:

- **Counselor's name:** `COUNSELOR`
- **Contest link:** `CONTEST_URL`
- **Theme:** `THEME`
- **Spirit days:** `SPIRIT_DAYS`
- **Scenarios:** `SCENARIOS`
- **Bingo squares:** `BINGO`

The site has no build step. Edit, push, and Vercel redeploys.

## Privacy

- The site collects only first name, last initial, and grade.
- Photos require a "grown-up said it's okay" checkbox.
- Photos are stored privately in Mrs. Pernal's Drive.
- The Sheet and photo folder stay private unless she shares them.
