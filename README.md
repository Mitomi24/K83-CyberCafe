# Tomi & Gen Business Manager

A full-stack application for managing Cybercafe and Printing business operations, featuring energy cost tracking, transaction history, and performance analytics.

## 🚀 How to Run Locally

1. **Prerequisites**
   - Install [Node.js](https://nodejs.org/) (LTS version recommended).
   - A Firebase project (already configured in this repository).

2. **Setup (Run these in your Terminal/Command Prompt)**
   ```bash
   # 1. Open your terminal and 'cd' into the project folder
   # 2. Install dependencies
   npm install
   # 3. Start the app
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 🌐 Deploying to GitHub Pages (Free Hosting)

GitHub provides a free domain: `https://username.github.io/repo-name/`

1. **Export**: Use "Settings" > "Export to GitHub" in AI Studio.
2. **Workflow**: I've already added `.github/workflows/deploy.yml` to your project.
3. **Activate**:
   - Go to your GitHub Repo **Settings** > **Pages**.
   - Change "Source" from "Deploy from a branch" to **GitHub Actions**.
4. **Done**: Your site will deploy automatically every time you push code!

## 🚨 Troubleshooting

### "auth/unauthorized-domain" Error
If you see this error when logging in:
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication** > **Settings** > **Authorized Domains**.
3. Add your deployment domain (e.g., `yourusername.github.io`) and `localhost` to the list.

### Google Drive Backup Setup
This app supports automatic daily backups to your Google Drive. To enable this:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Drive API**.
3. Configure the **OAuth Consent Screen** (internal or external).
4. Create **OAuth 2.0 Client IDs** (Web Application).
5. Add these **Authorized redirect URIs**:
   - `https://ais-dev-urxqrgy7m6bn56pdv4nkiu-895055720664.asia-southeast1.run.app/api/auth/google/callback`
   - `https://ais-pre-urxqrgy7m6bn56pdv4nkiu-895055720664.asia-southeast1.run.app/api/auth/google/callback`
6. Set the `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your app's Settings > Secrets.
7. Go to the app's **Settings** and click **Connect Google Drive**.

## 🛠 Features
- **Dual System**: Switch between Cybercafe (Energy tracking) and Printing (Job tracking) modes.
- **Analytics**: Peak daily/weekly/monthly stats with specific dates and customer counts.
- **Data Export**: Export your operational history to Excel (XLSX).
- **Secure**: Powered by Firebase Authentication and Firestore.
