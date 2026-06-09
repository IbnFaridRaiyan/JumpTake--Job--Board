# JumpTake API-Based Job Board

JumpTake is a full-stack job board with separate candidate and employer portals. It includes resume parsing, employer job posting, talent pool browsing, candidate applications, and company profiles.

## Stack

- Frontend: React
- Backend: Node.js + Express
- Database: MongoDB / MongoDB Atlas

## Project Structure

- `client/` - React frontend
- `server/` - Express API and static frontend hosting

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start both apps in development mode:
   ```bash
   npm run dev
   ```
3. Open:
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:5000`

## Production / Render

This repo is set up to run as a single Node web service in production:

- The React app is built into `client/build`
- The Express server serves both the API and the built frontend
- Client API calls use relative paths by default, so production does not depend on `localhost`

For Render setup details, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Environment Variables

Required for production:

- `MONGO_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`

Optional:

- `PORT`
- `CLIENT_URL` (only needed if you split frontend and backend onto different origins)

## Scripts

- `npm run dev` - run client and server locally
- `npm start` - run the production server
- `npm run build` - build the React app
- `npm run render-build` - install app dependencies and build the frontend for Render
