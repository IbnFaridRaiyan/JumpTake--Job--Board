# Deployment Guide

This project is ready to deploy as a single Render web service so it works from any device without depending on your local machine.

## How Production Works

- The React frontend is built into `client/build`
- The Express server serves both the frontend and `/api` routes
- Client requests use relative API paths by default
- In production, users access one public Render URL instead of `localhost`

## Recommended Render Setup

### 1. Prepare MongoDB Atlas

Use a cloud MongoDB connection string for production.

Required steps:

1. Create a MongoDB Atlas cluster
2. Create a database user
3. Allow your hosting provider to connect
4. Copy the `mongodb+srv://...` connection string

### 2. Push to GitHub

Push the full repository to GitHub before connecting Render.

### 3. Create a Render Web Service

In Render:

1. Click **New +**
2. Choose **Web Service**
3. Connect your GitHub repository
4. Use these settings:

- **Environment**: `Node`
- **Build Command**: `npm run render-build`
- **Start Command**: `npm start`

This setup builds the React app and starts the Express production server that serves the whole site.

### 4. Add Environment Variables

Set these in Render:

- `MONGO_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = a strong random secret
- `GEMINI_API_KEY` = your Gemini API key
- `NODE_ENV` = `production`
- `STRIPE_SECRET_KEY` = the Stripe secret API key (`sk_test_...` while testing)
- `STRIPE_WEBHOOK_SECRET` = the signing secret for the Render webhook endpoint (`whsec_...`)
- `STRIPE_PREMIUM_PRICE_ID` = the recurring £5/month Premium Stripe Price ID
- `STRIPE_EXTREME_PRICE_ID` = the recurring £12/month Extreme Stripe Price ID

Optional:

- `CLIENT_URL` = only set this if you later split frontend and backend across different domains

### 5. Configure Stripe subscriptions

1. In Stripe Product catalogue, create **JumpTake Premium** with a recurring GBP price of **£5 monthly**.
2. Create **JumpTake Extreme** with a recurring GBP price of **£12 monthly**.
3. Copy each `price_...` identifier into the matching Render environment variable above.
4. In Stripe Workbench/Webhooks, add `https://YOUR-RENDER-DOMAIN/api/billing/webhook`.
5. Subscribe it to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
6. Copy that endpoint's `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.
7. Add payout bank details only in Stripe Dashboard under payout/bank settings; never place bank details in Render or this repository.
8. Redeploy the Render service after saving the environment variables.

Leave `REACT_APP_API_URL` unset for this single-service deployment. If it points at a static frontend or an older service, `/api/billing/checkout` returns HTML rather than the required JSON response.

## Why This Works On Other Devices

- Render gives the app a public HTTPS URL
- The backend does not rely on `localhost` in production
- The frontend calls `/api/...` on the same deployed domain
- MongoDB comes from Atlas instead of your local computer

## Local Production Check

Before pushing, you can test the production shape locally:

```bash
npm run render-build
npm start
```

Then open:

```text
http://localhost:5000
```

That simulates the single-service production setup.
