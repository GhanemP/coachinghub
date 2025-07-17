# Coaching Dashboard Setup Guide

## 🚀 Quick Start

This is a professional coaching dashboard built with Next.js, Prisma, and NextAuth.js for Google Workspace authentication.

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Google Cloud Console project
- Company Google Workspace domain

## 🔧 Setup Instructions

### 1. Database Setup

1. Create a PostgreSQL database:
```bash
createdb coachingdb
```

2. Update your `.env` file with your database connection:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/coachingdb?schema=public"
```

3. Run Prisma migrations:
```bash
npx prisma migrate dev
```

4. (Optional) Seed the database with sample data:
```bash
node seed.js
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000` (and your production domain)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

6. Copy your Client ID and Client Secret to your `.env` file:
```env
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. NextAuth Configuration

Update your `.env` file with NextAuth settings:
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

**Important**: In production, use a strong random secret:
```bash
openssl rand -base64 32
```

### 4. Company Domain Restriction (Optional)

To restrict login to your company domain, update `/src/lib/auth.ts`:

```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    // Allow only company domain emails
    if (user.email?.endsWith('@yourcompany.com')) {
      return true;
    }
    return false;
  },
  // ... rest of callbacks
}
```

## 🏃‍♂️ Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## 🔐 Authentication Flow

1. Users are redirected to `/login` if not authenticated
2. Click "Sign in with Google" to authenticate with Google Workspace
3. After successful authentication, users are redirected to the main dashboard
4. Users can sign out using the button in the header

## 📊 Features

- **Session Management**: Track coaching sessions with timers and notes
- **Goal Setting**: Create and track SMART goals with progress indicators
- **Action Items**: Kanban-style board for task management
- **Notes & Evaluations**: Rich text notes with ratings and feedback
- **Real-time Data**: All data persists to PostgreSQL database
- **Secure Authentication**: Google Workspace SSO with route protection

## 🛠️ Development

### Database Schema

View your database schema:
```bash
npx prisma studio
```

### Adding New Features

1. Update the Prisma schema in `/prisma/schema.prisma`
2. Create a migration: `npx prisma migrate dev --name your_feature_name`
3. Update TypeScript types in `/src/types/`
4. Add API routes in `/src/app/api/`
5. Update frontend components in `/src/components/`

### Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Your app URL
- `NEXTAUTH_SECRET`: Random secret for JWT signing
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Update `NEXTAUTH_URL` to your production domain
5. Update Google OAuth redirect URIs to include your production domain

### Other Platforms

Ensure you:
1. Set all environment variables
2. Run `npx prisma migrate deploy` in production
3. Update Google OAuth settings with production URLs

## 🆘 Troubleshooting

### Authentication Issues

1. **"OAuth error"**: Check your Google Client ID and Secret
2. **"Redirect URI mismatch"**: Ensure redirect URIs in Google Console match your app
3. **"Access denied"**: Check domain restrictions in your auth configuration

### Database Issues

1. **Migration errors**: Check your DATABASE_URL and PostgreSQL connection
2. **Schema out of sync**: Run `npx prisma db push` to sync schema

### Development Issues

1. **Port conflicts**: Next.js will automatically use an available port
2. **Module not found**: Run `npm install` to ensure all dependencies are installed

## 📞 Support

For technical support or questions about the coaching dashboard, contact your development team.
