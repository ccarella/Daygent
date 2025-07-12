# OAuth Testing Checklist

## Successful Flow
- [ ] Login page loads without errors
- [ ] Clicking "Continue with GitHub" redirects to GitHub
- [ ] GitHub shows your app name and permissions
- [ ] After authorizing, redirects back to your app
- [ ] User is logged in (auth status shows user info)
- [ ] User data is stored in Supabase database

## Check Database (in Supabase Dashboard)
1. Go to Table Editor → users table
2. You should see your GitHub user data:
   - email
   - github_username
   - github_id
   - avatar_url

## Test Protected Routes
- [ ] Try accessing a protected route while logged out (should redirect to login)
- [ ] Access the same route while logged in (should work)

## Test Logout
- [ ] Click logout button
- [ ] Verify you're redirected to login page
- [ ] Verify you can't access protected routes

## Common Issues
- "Provider not enabled" → GitHub OAuth not enabled in Supabase
- "Redirect URI mismatch" → Check callback URL in GitHub OAuth app
- "User already registered" → Email already exists with different auth method
