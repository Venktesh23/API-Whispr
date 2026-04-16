# Implementation Guide: Streaming, RLS Fixes, and CI/CD

This guide walks through implementing the new features that complete the remaining todos.

## Table of Contents
1. [Improved Streaming and Chunking](#improved-streaming-and-chunking)
2. [RLS Violation Fixes](#rls-violation-fixes)
3. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
4. [Testing the Implementation](#testing-the-implementation)

---

## Improved Streaming and Chunking

### What Changed
- Added semantic-aware chunking that respects sentence/paragraph boundaries
- Implemented multiple chunking strategies (semantic, fixed-size, word-boundary)
- Better token estimation for rate limiting
- Improved client-side parsing of streaming responses

### Files Created
- `lib/streaming.js` - Core streaming utilities
- `lib/streaming-hooks.js` - React hooks for streaming integration

### How to Use

#### In API Endpoints

```javascript
import { streamTextResponse } from '../../lib/streaming'

// In your endpoint handler:
res.setHeader('Content-Type', 'text/event-stream')

const text = "Your response text here"

await streamTextResponse(res, text, {
  chunkType: 'semantic',    // 'semantic', 'fixed', 'wordBoundary'
  chunkSize: 256,           // Characters per chunk
  delayMs: 15,              // Delay between chunks
  onChunk: (chunk, idx, total) => {
    console.log(`Sent chunk ${idx}/${total}`)
  }
})
```

#### In React Components

```javascript
import { useStreamingChat } from '../../lib/streaming-hooks'

function ChatComponent() {
  const { messages, isStreaming, sendMessage } = useStreamingChat()
  
  const handleSendMessage = async (question) => {
    await sendMessage(question, currentSpec, user)
  }

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.timestamp}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      <input 
        disabled={isStreaming}
        onSend={handleSendMessage}
      />
    </div>
  )
}
```

### Migration Steps

1. **Update API Endpoints**
   ```bash
   cp pages/api/ask.js pages/api/ask-backup.js
   # Review ask-improved.js and integrate changes
   ```

2. **Update Chat Page**
   - Import `useStreamingChat` from `lib/streaming-hooks.js`
   - Replace manual streaming logic with hook

3. **Test Streaming**
   ```bash
   npm run dev
   # Test chat functionality
   ```

---

## RLS Violation Fixes

### Problem
The chat page was using queries that bypassed RLS or didn't properly validate user ownership.

### Solution
- Created `pages/api/chat-rls.js` with proper ownership validation
- All queries now verify `user_id` match
- Added DELETE endpoint for clearing chat history
- Reduced payload sizes to improve performance

### Key Changes

```javascript
// Before (RLS vulnerability)
const { data } = await supabase
  .from('chat_history')
  .select('*')  // Could access anyone's data if using wrong key

// After (RLS safe)
const { data } = await supabase
  .from('chat_history')
  .select('*')
  .eq('user_id', userId)  // Only this user's data
  .eq('spec_id', specId)  // Only this spec
```

### Database RLS Policies Needed

Ensure these RLS policies exist in Supabase:

```sql
-- Chat History RLS
CREATE POLICY "Users can only read their own chat history" ON chat_history
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only insert their own chat history" ON chat_history
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can only delete their own chat history" ON chat_history
  FOR DELETE USING (auth.uid()::text = user_id);

-- API Specs RLS  
CREATE POLICY "Users can only read their own specs" ON api_specs
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only insert their own specs" ON api_specs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can only update their own specs" ON api_specs
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only delete their own specs" ON api_specs
  FOR DELETE USING (auth.uid()::text = user_id);
```

### Migration Steps

1. **Review Current Policies**
   - Go to Supabase Dashboard
   - Tables → api_specs → RLS Policies
   - Tables → chat_history → RLS Policies

2. **Update Chat Page**
   ```javascript
   // Update fetch calls to use new endpoints
   const response = await fetch('/api/chat-rls?action=loadChatHistory&userId=...', {
     method: 'GET'
   })
   ```

3. **Update POST Calls**
   ```javascript
   const response = await fetch('/api/chat-rls', {
     method: 'POST',
     body: JSON.stringify({ userId, specId, question, answer })
   })
   ```

4. **Test RLS**
   ```bash
   # Should work with own data
   # Should fail with other users' data
   npm run test:integration
   ```

---

## CI/CD Pipeline Setup

### What's Included

The `.github/workflows/ci-cd.yml` provides:

1. **Quality Checks**
   - ESLint for code quality
   - TypeScript type checking

2. **Testing**
   - Unit tests
   - Integration tests
   - Coverage reporting

3. **Build Verification**
   - Next.js build
   - Build artifact caching

4. **Security Scanning**
   - Trivy vulnerability scanning
   - Dependency checking

5. **Deployment**
   - Staging (develop branch)
   - Production (main branch)
   - Slack notifications

### Setup Steps

#### 1. Add GitHub Secrets

Go to: Repository → Settings → Secrets and variables → Actions

**Required for All:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_OPENAI_API_KEY
```

**For Vercel Deployment:**
```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_ORG_SLUG
```

**Optional - For Slack Notifications:**
```
SLACK_WEBHOOK_URL
```

See `GITHUB_ACTIONS_SETUP.md` for detailed instructions.

#### 2. Configure Vercel Integration

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Get details for secrets
```

Get `VERCEL_TOKEN` from: https://vercel.com/account/tokens
Get `VERCEL_ORG_ID` from: https://vercel.com/YOUR_ORG/settings

#### 3. Set Branch Protection

1. Go to: Repository → Settings → Branches
2. Add rule for `main` branch
3. Require status checks to pass:
   - quality
   - test
   - build
   - security

#### 4. Configure Slack (Optional)

1. Create incoming webhook: https://api.slack.com/apps/new
2. Choose channel
3. Copy webhook URL to GitHub secret

### Testing CI/CD Locally

```bash
# Install act (runs GitHub Actions locally)
brew install act  # or follow https://github.com/nektos/act

# Run workflow locally
act push -s NEXT_PUBLIC_SUPABASE_URL=xxx \
          -s NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx \
          -s NEXT_PUBLIC_OPENAI_API_KEY=xxx
```

### Workflow Triggers

**Staging Deployment:**
- Push to `develop` branch
- All checks pass
- Deploys to Vercel preview

**Production Deployment:**
- Push to `main` branch
- All checks pass + security scan pass
- Deploys to Vercel production
- Slack notification sent

---

## Testing the Implementation

### 1. Test Streaming

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test streaming endpoint
curl -N -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is REST?",
    "userId": "test-user-123"
  }' | cat
```

You should see:
```
data: {"type":"metadata",...}
data: {"type":"text",...}
data: {"type":"done",...}
```

### 2. Test Chat with RLS

```javascript
// In browser console, after logging in:
fetch('/api/chat-rls?action=loadSpecs&userId=YOUR_USER_ID', {
  method: 'GET'
})
.then(r => r.json())
.then(data => console.log(data))
```

Should return only YOUR specs, not others'.

### 3. Test CI/CD

Create a test PR:
```bash
git checkout -b test/ci-pipeline
git commit --allow-empty -m "test: trigger CI pipeline"
git push origin test/ci-pipeline
# Create PR on GitHub
# Watch Actions tab for workflow
```

### 4. Run Test Suite

```bash
# Local testing
npm run test:ci

# Should see:
# ✅ quality checks pass
# ✅ tests pass
# ✅ build succeeds
```

---

## Troubleshooting

### Streaming Not Working

```
Error: Not receiving SSE data
```

**Solution:**
- Check API response headers include `Content-Type: text/event-stream`
- Verify client is reading `response.body.getReader()`
- Check browser console for errors

### RLS Policy Errors

```
Error: new row violates row-level security policy
```

**Solution:**
- Verify user_id in request matches authenticated user
- Check RLS policies are enabled in Supabase
- Ensure service role key not used for client operations

### GitHub Actions Failing

```
Error: VERCEL_TOKEN not found
```

**Solution:**
- Add secret to GitHub
- Use correct secret name (case-sensitive)
- Verify Vercel token is valid

### Build Fails

```
Error: Cannot find module
```

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing locally (`npm run test:ci`)
- [ ] TypeScript checks pass (`npx tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Environment secrets configured in GitHub
- [ ] RLS policies enabled in Supabase
- [ ] Vercel project linked and secrets set
- [ ] Slack webhook configured (optional)
- [ ] Branch protection rules enabled
- [ ] Database migrations applied
- [ ] Manual testing completed

---

## Next Steps

1. **Implement Streaming** (1-2 hours)
   - Update API endpoints to use new streaming utils
   - Update chat page with streaming hooks

2. **Fix RLS Issues** (30-45 minutes)
   - Review and update database policies
   - Test with real authentication

3. **Set Up CI/CD** (1-2 hours)
   - Add GitHub secrets
   - Configure Vercel
   - Set up branch protection
   - Test workflow

4. **Full Testing** (2-3 hours)
   - Integration tests
   - Manual testing
   - Load testing
   - Security review

---

## Support

For issues:
1. Check logs in GitHub Actions
2. Review relevant documentation
3. Test locally with `npm run dev`
4. Check Supabase logs
5. Review browser console errors

---

**Last Updated**: April 2026
**Status**: Implementation Guide v1.0
