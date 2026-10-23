# AWS Lambda + EventBridge + SES Setup Guide

This guide walks you through setting up automated daily reminder emails using AWS SES, Lambda, and EventBridge.

---

## 1. Verify Your Sender Email Address in AWS SES

Since new AWS accounts start in the SES Sandbox (free tier allows up to 62,000 emails/month if sent from EC2/Lambda, or 1,000+ emails free), you need to verify your email address before sending:

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/ses/).
2. Select your preferred region (e.g., `us-east-1` (N. Virginia)).
3. In the left navigation, click **Verified identities**.
4. Click **Create identity**.
5. Select **Email address**, enter the email you want to send from (e.g. `yourname@example.com` or custom address), and click **Create identity**.
6. Check your inbox for an AWS verification email and click the confirmation link.
7. *(Note while in Sandbox)*: In SES sandbox mode, you can only send emails to verified addresses. If you want to send reminders to yourself or family, either verify their email addresses too or click **Request production access** on the SES Account dashboard (usually approved within 24 hours).

---

## 2. Package the Lambda Function

Run the build script from this directory:

```bash
cd lambda
bash build.sh
```

This creates `lambda/dist/reminder-worker.zip`.

---

## 3. Create the AWS Lambda Function

1. Go to the [AWS Lambda Console](https://console.aws.amazon.com/lambda/).
2. Click **Create function**:
   - Select **Author from scratch**.
   - **Function name**: `reminder-daily-worker`
   - **Runtime**: **Node.js 20.x** or **Node.js 22.x**
   - **Architecture**: `x86_64` (default)
3. Click **Create function**.
4. In the **Code** tab:
   - Click **Upload from** -> **.zip file**.
   - Select `lambda/dist/reminder-worker.zip` and click **Save**.
   - Under **Runtime settings** (below the code editor), verify **Handler** is set to:
     ```
     index.handler
     ```
5. In the **Configuration** tab:
   - Click **General configuration** -> **Edit**:
     - Set **Timeout** to **1 min** (default 3s is too short for network calls).
     - Set **Memory** to **256 MB**.
     - Click **Save**.
   - Click **Environment variables** -> **Edit**:
     - `SES_FROM_EMAIL`: `your-verified-email@example.com`
     - `FIREBASE_PROJECT_ID`: `sandbox-ed1e2`
     - `FIREBASE_SERVICE_ACCOUNT_JSON`: *(Optional for production)* Paste your private Firebase service account key JSON as a single line, or provide credentials.
     - Click **Save**.
   - Click **Permissions** -> Click the **Execution role** name (opens IAM Console):
     - Click **Add permissions** -> **Attach policies**.
     - Attach `AmazonSESFullAccess` (or create an inline policy allowing `ses:SendEmail`).

---

## 4. Add the EventBridge Scheduled Trigger (Cron)

1. On your Lambda function page, click **+ Add trigger**.
2. In the dropdown, choose **EventBridge (CloudWatch Events)**.
3. Select **Create a new rule**:
   - **Rule name**: `daily-morning-reminder`
   - **Rule type**: **Schedule expression**
   - **Schedule expression**:
     ```
     cron(0 14 * * ? *)
     ```
     *(This runs every day at 14:00 UTC / 9:00 AM EST / 6:00 AM PST. You can adjust the hour to match your local timezone).*
4. Click **Add**.

---

## 5. Test Your Worker

You can click the **Test** tab in AWS Lambda:
- Event name: `TestDailyRun`
- Event JSON: `{}`
- Click **Test**.
- View execution logs in CloudWatch to see scanned users and dispatched emails.
