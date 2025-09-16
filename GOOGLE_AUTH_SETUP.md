# Google Authentication Setup Guide

This guide explains how to set up Google authentication using Firebase Admin SDK in the Streami backend.

## Prerequisites

1. **Firebase Project**: You need a Firebase project with Google Authentication enabled
2. **Service Account Key**: Firebase service account credentials (JSON file)

## Firebase Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Enable Google Authentication:
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Configure OAuth consent screen if needed

### 2. Get Service Account Credentials

1. In Firebase Console, go to Project Settings (gear icon)
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file
5. **Important**: Keep this file secure and never commit it to version control

### 3. Extract Required Values

From the downloaded JSON file, you need these values:

```json
{
  "project_id": "your-project-id",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

## Environment Variables

Add these to your `.env` file:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note**: The `FIREBASE_PRIVATE_KEY` should include the newlines as `\n` characters.

## Database Migration

Run the migration script to update your database schema:

```bash
# Connect to your PostgreSQL database
psql -d streami

# Run the migration
\i src/database/migrations/add-google-auth.sql
```

Or copy and paste the SQL commands directly into your database.

## API Endpoints

### Google Authentication

**POST** `/v1/auth/google`

**Request Body:**
```json
{
  "idToken": "firebase_id_token_from_frontend",
  "displayName": "User Display Name"
}
```

**Response:**
```json
{
  "accessToken": "jwt_access_token",
  "user": {
    "id": "user_uuid",
    "email": "user@example.com",
    "displayName": "User Display Name",
    "isEmailVerified": true,
    "loginType": "GOOGLE"
  }
}
```

**Cookies Set:**
- `at`: Access token (15 minutes)
- `rt`: Refresh token (30 days)

## Frontend Integration

### 1. Install Firebase Client SDK

```bash
npm install firebase
```

### 2. Initialize Firebase

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
```

### 3. Google Sign-In

```typescript
const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    
    // Send to your backend
    const response = await fetch('/v1/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({
        idToken,
        displayName: result.user.displayName || '',
      }),
    });
    
    if (response.ok) {
      // User authenticated successfully
      const data = await response.json();
      console.log('Authenticated:', data.user);
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
  }
};
```

## How It Works

1. **Frontend**: User clicks Google sign-in button
2. **Firebase**: Handles OAuth flow and returns ID token
3. **Backend**: Receives ID token and verifies it with Firebase Admin SDK
4. **User Creation/Lookup**: 
   - If user exists by Google ID → update last login
   - If user exists by email → link Google account and convert to Google login
   - If new user → create account with Google credentials
5. **JWT Tokens**: Generate access and refresh tokens
6. **Cookies**: Set HTTP-only cookies for secure token storage

## Security Features

- **ID Token Verification**: All Google tokens are verified server-side
- **Account Linking**: Existing email users can be converted to Google login
- **Unique Constraints**: Prevents duplicate Google accounts
- **Database Constraints**: Ensures data integrity between login types
- **Cookie Security**: HTTP-only, secure cookies for token storage

## Troubleshooting

### Common Issues

1. **"invalid_google_token"**: 
   - Check Firebase configuration
   - Verify service account credentials
   - Ensure ID token is not expired

2. **"user_not_found"**:
   - Verify Firebase project ID
   - Check service account permissions

3. **Database Constraints Violation**:
   - Run the migration script
   - Check existing user data for conflicts

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
TYPEORM_LOGGING=true
```

## Testing

1. **Test Google Sign-In**: Use the frontend to sign in with Google
2. **Verify Cookies**: Check that `at` and `rt` cookies are set
3. **Test Protected Endpoints**: Use the access token to access `/v1/auth/me`
4. **Test Token Refresh**: Wait for access token to expire and test refresh

## Production Considerations

1. **Service Account Security**: Store Firebase credentials securely
2. **Rate Limiting**: Google auth endpoints are protected by throttling
3. **Monitoring**: Monitor authentication success/failure rates
4. **Backup**: Regular database backups including user authentication data
