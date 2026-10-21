# Arshith Connect registration notifications

This Firebase Cloud Function sends an email and an SMS when an employee document in `employees/{employeeId}` changes from `status: "pending"` to `status: "approved"` or `status: "rejected"`.

## Requirements
- A Firebase project with Cloud Functions enabled (deployment may require the Blaze billing plan).
- Node.js 20 and Firebase CLI.
- SMTP credentials for an email account/provider.
- A Twilio account with SMS enabled and a Twilio sender number.

## Setup
1. Place the `functions` folder in your Firebase project root (the same folder as `firebase.json`). If you already have a `functions` folder, merge `index.js` and dependencies rather than replacing other functions.
2. From the Firebase project root, run `firebase init functions` only if Functions has not already been initialized. Choose JavaScript and Node 20 if prompted.
3. In the `functions` folder, run `npm install`.
4. From the Firebase project root, set the secrets. Do not put real credentials in source code or commit them to Git:

```bash
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set EMAIL_FROM
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_PHONE_NUMBER
```

For Gmail SMTP, commonly `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER` is the sender Gmail address, `SMTP_PASS` is a Google App Password (not the normal account password), and `EMAIL_FROM` is the sender address. Provider settings can differ.

5. Deploy from the Firebase project root:

```bash
firebase deploy --only functions:notifyEmployeeRegistrationDecision
```

## Important
- The employee document must be in the top-level `employees` collection and include `name`, `email`, `phone`, and `status` fields.
- `phone` must be in international format, for example `+919876543210`; use the actual employee's number.
- The status transition must be `pending` -> `approved` or `pending` -> `rejected`. The Android approval code should continue updating the same document's `status` field.
- SMS charges and provider restrictions may apply. Test with a consenting number first.
- The function sends notifications after a status transition; it does not itself approve or reject users.
