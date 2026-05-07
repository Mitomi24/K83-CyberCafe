import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Precise CORS Handler
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      // Allow all origins specifically to fix cross-domain (github.io -> ais-pre)
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-App-Version');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });
  
  // 2. Focused Request Logger (Skip static assets noise)
  app.use((req, res, next) => {
    const isApi = req.url.startsWith('/api');
    if (!isApi) return next();
    
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const color = status >= 400 ? '\x1b[31m' : (status >= 300 ? '\x1b[33m' : '\x1b[32m');
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${color}${status}\x1b[0m ${duration}ms`);
    });
    next();
  });
  
  app.use(express.json({ limit: '50mb' }));

  // Google OAuth Configuration
  const getOAuthClient = () => {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      console.error("CRITICAL: Google OAuth credentials missing from environment.");
      return null;
    }

    console.log(`Setting up OAuth with Client ID: ${clientId.substring(0, 5)}... and Redirect URI: ${redirectUri}`);
    
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  };

  const oauth2Client = getOAuthClient();

  // API Routes
  // Support both slashed and non-slashed to avoid 301/302 redirects
  const healthHandler = (req: any, res: any) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      config: {
        hasClientId: !!(process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID),
        appUrl: process.env.APP_URL || 'not set',
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      request: {
        origin: req.headers.origin || 'none',
        host: req.headers.host || 'none',
        method: req.method,
        url: req.url
      }
    });
  };

  app.get("/api/health", healthHandler);
  app.get("/api/health/", healthHandler);

  // 1. Get Google Auth URL
  app.get("/api/auth/google/url", (req, res) => {
    try {
      if (!oauth2Client) {
        console.error("Cannot generate Auth URL: OAuth client not initialized (missing credentials)");
        return res.status(500).json({ 
          error: "Google Drive is not configured on the server. Please add VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Secrets." 
        });
      }

      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent', // Force consent to ensure refresh token is returned
        state: req.query.uid as string // Pass Firebase UID in state to link accounts
      });

      res.json({ url });
    } catch (error) {
      console.error("Error generating Auth URL:", error);
      res.status(500).json({ error: "Failed to generate authentication URL." });
    }
  });

  // 2. Google OAuth Callback
  app.get("/api/auth/google/callback", async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Use the tokens to check for/create folder
      const tempAuth = new google.auth.OAuth2(
        process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      tempAuth.setCredentials(tokens);
      
      const drive = google.drive({ version: 'v3', auth: tempAuth });
      
      // Look for or create the dedicated backup folder
      let folderId = "";
      try {
        const folderResponse = await drive.files.list({
          q: "name = 'K83_Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          fields: 'files(id)',
          spaces: 'drive'
        });

        if (folderResponse.data.files && folderResponse.data.files.length > 0) {
          folderId = folderResponse.data.files[0].id!;
        } else {
          const folderMetadata = {
            name: 'K83_Backups',
            mimeType: 'application/vnd.google-apps.folder'
          };
          const folder = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id'
          });
          folderId = folder.data.id!;
        }
      } catch (folderError) {
        console.error("Error managing folder:", folderError);
        // Fallback to root if folder management fails
      }
      
      const successHtml = `
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f8fafc;">
            <div style="background: white; padding: 2rem; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <h1 style="color: #1e293b;">Connected!</h1>
              <p style="color: #64748b;">Google Drive has been linked and the K83_Backups folder is ready.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'GOOGLE_DRIVE_AUTH_SUCCESS',
                    tokens: ${JSON.stringify(tokens)},
                    id_token: '${tokens.id_token || ""}',
                    folderId: '${folderId}'
                  }, '*');
                  window.close();
                }
              </script>
              <button onclick="window.close()" style="background: #4f46e5; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer;">Close Window</button>
            </div>
          </body>
        </html>
      `;
      res.send(successHtml);
    } catch (error) {
      console.error("Error exchanging code:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // 3. Upload Backup to Drive
  app.post("/api/backup/drive", async (req, res) => {
    const { tokens, backup, folderId } = req.body;

    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Server configuration missing: Google Client ID or Secret not set." });
    }

    if (!tokens || !backup) {
      return res.status(400).json({ error: "Missing tokens or backup data" });
    }

    try {
      const auth = new google.auth.OAuth2(clientId, clientSecret);
      auth.setCredentials(tokens);

      const drive = google.drive({ version: 'v3', auth });
      
      const fileName = `K83_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : []
      };

      const media = {
        mimeType: 'application/json',
        body: JSON.stringify(backup, null, 2)
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      res.json({ 
        success: true, 
        fileId: file.data.id,
        newTokens: auth.credentials 
      });
    } catch (error: any) {
      console.error("Drive upload error:", error);
      res.status(500).json({ error: "Drive Upload Failed: " + (error.message || "Unknown Error") });
    }
  });

  // 4. List Backups from Drive
  app.post("/api/backup/drive/list", async (req, res) => {
    const { tokens, folderId } = req.body;

    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Server configuration missing: Google Client ID or Secret not set." });
    }

    if (!tokens) {
      return res.status(400).json({ error: "Missing tokens" });
    }

    try {
      const auth = new google.auth.OAuth2(clientId, clientSecret);
      auth.setCredentials(tokens);

      const drive = google.drive({ version: 'v3', auth });
      
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and name contains 'K83_Backup'`,
        fields: 'files(id, name, createdTime, size)',
        orderBy: 'createdTime desc',
        pageSize: 10
      });

      res.json({ 
        success: true, 
        files: response.data.files,
        newTokens: auth.credentials 
      });
    } catch (error: any) {
      console.error("Drive list error:", error);
      res.status(500).json({ error: "Drive List Failed: " + (error.message || "Unknown Error") });
    }
  });

  // 5. Fetch Backup from Drive
  app.post("/api/backup/drive/fetch", async (req, res) => {
    const { tokens, fileId } = req.body;

    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Server configuration missing: Google Client ID or Secret not set." });
    }

    if (!tokens || !fileId) {
      return res.status(400).json({ error: "Missing tokens or fileId" });
    }

    try {
      const auth = new google.auth.OAuth2(clientId, clientSecret);
      auth.setCredentials(tokens);

      const drive = google.drive({ version: 'v3', auth });
      
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      res.json({ 
        success: true, 
        data: response.data,
        newTokens: auth.credentials 
      });
    } catch (error: any) {
      console.error("Drive fetch error:", error);
      res.status(500).json({ error: "Drive Fetch Failed: " + (error.message || "Unknown Error") });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
