# Online Menu

The menu is stored in MongoDB and served by the Express API. Menu changes require
an admin password; the browser receives an HTTP-only session cookie.

## Local setup

1. In MongoDB Atlas, create a database user and allow the development machine's IP
   address in Network Access.
2. Copy `backend/.env.example` to `backend/.env`. Replace the URI username and
   password with your Atlas database-user credentials. URL-encode special
   characters in the password. Set a strong `ADMIN_PASSWORD` and a random
   `SESSION_SECRET` of at least 32 characters. Keep `.env` private.
3. Install and start the API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

4. In another terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The Vite development server proxies `/api` requests to `http://localhost:3001`.
On first startup, the API inserts the example menu only if the database has no
menu items. Subsequent menu additions, edits, and removals are stored in the
`menu_items` collection in the `online_menu` database by default.

For production, set the same environment variables on the backend host, serve the
frontend over HTTPS, and configure the production web server to proxy `/api` to
the backend. The admin session cookie is marked `Secure` in production.
