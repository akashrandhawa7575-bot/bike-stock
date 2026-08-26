# Bike Stock Website

A static motorcycle listing site with a self-service admin panel, built to run free on GitHub Pages.

## Files
- `index.html`, `style.css`, `script.js` — the public site
- `admin.html`, `admin.css`, `admin.js` — the admin panel (edit stock, commits straight to GitHub)
- `data/bikes.json` — your bike listings (sample data included)
- `data/config.json` — your business name, phone, WhatsApp, address, hours, about text
- `images/` — where photos you upload from the admin panel land

## 1. Put this on GitHub
1. Create a new **public** repository on GitHub (e.g. `bike-stock`).
2. Upload all these files/folders into it (drag-and-drop on the GitHub website works, or `git push` if you're comfortable with git).
3. Go to the repo's **Settings → Pages**, set Source to your default branch (`main`) and root folder, then save.
4. Your site goes live at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

## 2. Edit your business info once, directly
Open `data/config.json` in GitHub (or the admin panel — see below) and fill in:
- `businessName`, `tagline`, `city`, `address`, `phone`
- `whatsapp` — digits only, with country code, no `+` or spaces (e.g. `919876543210`)
- `hours`, `aboutText`

## 3. Set up the admin panel
The admin panel edits your listings by committing directly to this GitHub repo — no separate server needed.

1. On GitHub, go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Give it a name, set **Repository access** to "Only select repositories" and pick this repo.
3. Under **Permissions → Repository permissions**, set **Contents** to **Read and write**. Leave everything else as No access.
4. Generate the token and copy it (GitHub only shows it once).
5. Open `https://<your-username>.github.io/<repo-name>/admin.html`, paste the token, your GitHub username, the repo name, and branch (`main`), then click **Connect**.

From there you can add bikes (with photo upload or an image URL), edit or delete listings, mark a bike as sold, and update your business info — every save commits straight to your repo and the live site updates shortly after.

## Important notes on the admin panel
- **`admin.html` is not password-protected against the public** — it's a plain webpage. Its only real protection is that people don't know the URL, and that your token is scoped to *only* this one repo's contents (never generate a token with broader access for this).
- The token is stored in your browser's local storage, on whichever device you connect from. Use **Disconnect** in the admin panel on shared/public computers, and revoke the token from GitHub's settings any time you want to cut off access.
- Because saves go straight to GitHub, a save can occasionally fail if two edits happen at once — the panel will show an error message if that happens; just retry.

## Customizing further
- Colors, fonts, and the card design live in `style.css` — the `:root` block at the top has all the color variables.
- Add more fields to a bike (e.g. "EMI available") by adding an input in `admin.html`'s bike form, reading it in `admin.js`, and displaying it in `script.js`'s card/modal rendering.
