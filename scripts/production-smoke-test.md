# Production Smoke Test for Project Creation

## Quick Verification (5 minutes)

### 1. Health Check
```bash
# Check if the API is responding
curl https://your-domain.com/api/health

# Check Supabase connection
curl https://your-domain.com/api/supabase-health
```

### 2. Visual Inspection
- [ ] Login page loads with OAuth options
- [ ] Dashboard loads after authentication
- [ ] Projects page shows empty state or existing projects
- [ ] "New Project" button is visible and clickable

### 3. Core Functionality Test
1. **Create Project**
   - Click "New Project"
   - Fill in: "Smoke Test - [Current Date]"
   - Submit and verify creation

2. **View Project**
   - Click on newly created project
   - Verify all details are displayed
   - Check GitHub link works

3. **Error Handling**
   - Try creating duplicate project name
   - Verify error message appears

## Automated E2E Test (if Playwright is set up)

```bash
# Run from your local machine against production
PLAYWRIGHT_BASE_URL=https://your-domain.com npm run test:e2e -- --grep "project creation"
```

## Performance Checks

### Load Times (use Chrome DevTools)
- [ ] Projects page loads < 3 seconds
- [ ] Modal opens < 500ms
- [ ] Project creation < 2 seconds

### Network Tab Checks
- [ ] No failed requests (4xx/5xx errors)
- [ ] API responses < 1 second
- [ ] No CORS errors

## Rollback Plan

If critical issues are found:

1. **Immediate Rollback**
   ```bash
   # Revert to previous deployment
   vercel rollback
   # or your deployment platform's rollback command
   ```

2. **Database Cleanup** (if needed)
   ```sql
   -- Remove test projects created during testing
   DELETE FROM projects 
   WHERE name LIKE 'Smoke Test%' 
   AND created_at > NOW() - INTERVAL '1 hour';
   ```

## Success Criteria

- [ ] All manual tests pass
- [ ] No console errors in browser
- [ ] No 500 errors in server logs
- [ ] Projects persist after page refresh
- [ ] Works on mobile devices

## Post-Deployment Monitoring

1. **Set up alerts for**:
   - API endpoint failures
   - Increased error rates
   - Slow response times

2. **Monitor for 24 hours**:
   - Check error tracking (Sentry/LogRocket)
   - Review user feedback
   - Watch for support tickets

## Reporting

After testing, document:
- Test completion time
- Any issues found
- Performance metrics
- User feedback (if any)