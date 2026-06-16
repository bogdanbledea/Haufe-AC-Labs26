# Testing Guide - AI Question Summary Feature

## ✅ Pre-Flight Check

All services are running and healthy:

- ✅ **smo-ai**: http://localhost:3100/health
- ✅ **smo-backend**: http://localhost:3000/ai/health  
- ✅ **smo-frontend**: http://localhost:5173/

---

## 🧪 Test Scenarios

### Scenario 1: Basic Summarization (Happy Path)

**Steps:**
1. Open http://localhost:5173/
2. Sign in (or create an account)
3. Click on any question to open the detail page
4. Scroll to find the **"Summarize"** button below the question description
5. Click the button

**Expected Result:**
- Button text changes to "Generating summary..."
- Button is disabled while loading
- After ~2-5 seconds, a summary card appears
- Card has "AI summary" header and plain text summary
- Summary is contextual and technical

---

### Scenario 2: Cached Summary (Performance)

**Steps:**
1. After completing Scenario 1, refresh the page
2. Click "Summarize" again on the same question

**Expected Result:**
- Summary appears almost instantly (<500ms)
- This proves database caching is working
- No duplicate LLM API calls

---

### Scenario 3: Question with Answer

**Steps:**
1. Find a question that has an accepted answer or highly voted answer
2. Click "Summarize"

**Expected Result:**
- Summary includes both:
  - The problem/question
  - The solution from the top answer
- Format: "Problem X occurs when... Solution involves..."

---

### Scenario 4: Question without Answer

**Steps:**
1. Create a new question (no answers yet)
2. View your new question
3. Click "Summarize"

**Expected Result:**
- Summary focuses only on diagnosing the problem
- Does not hallucinate a solution
- Mentions technologies involved

---

### Scenario 5: AI Service Down (Error Handling)

**Steps:**
1. Stop the smo-ai service (go to terminal, Ctrl+C)
2. Navigate to a question (without cached summary)
3. Click "Summarize"

**Expected Result:**
- Button shows loading state briefly
- Error message appears: "AI Service Temporarily Unavailable" or similar
- Button disappears (hides itself)
- No crashes or white screens

**Cleanup:** Restart smo-ai service after test

---

### Scenario 6: Multiple Questions

**Steps:**
1. Summarize question #1
2. Navigate to question #2  
3. Summarize question #2
4. Go back to question #1

**Expected Result:**
- Each question has its own summary
- Summaries don't mix up
- Navigation works smoothly

---

### Scenario 7: Theme Compatibility

**Steps:**
1. Toggle between light and dark theme (if available)
2. Check the Summarize button and summary card styling

**Expected Result:**
- Button and card adapt to theme
- Text is readable in both themes
- No color contrast issues

---

## 🎯 Acceptance Criteria Checklist

Use this to verify all requirements:

- [ ] Button appears on the question detail page
- [ ] Clicking it shows a loading state ("Generating summary...")
- [ ] Button is disabled while loading
- [ ] Summary appears below the question description (in styled card)
- [ ] If question has accepted/top answer, summary reflects both
- [ ] If smo-ai is down, the button is hidden (after first error)
- [ ] No crashes if the LLM returns unexpected output
- [ ] Cached summaries load instantly
- [ ] UI is clean and matches the site design

---

## 🐛 Common Issues & Solutions

### Issue: Button doesn't appear
**Solution:** Check browser console for errors. Ensure you're signed in if auth is required.

### Issue: "AI Service Temporarily Unavailable"
**Solution:** 
1. Check if smo-ai is running: `http://localhost:3100/health`
2. Check smo-ai terminal for errors
3. Verify GROQ_API_KEY is set in `.env`

### Issue: Summary takes too long (>10 seconds)
**Solution:**
- First call is always slower (LLM processing)
- Check Groq API rate limits
- Verify network connection

### Issue: Summary is generic or low quality
**Solution:**
- This is a prompt engineering issue
- Check the SUMMARY_SYSTEM_PROMPT in `app/smo-ai/index.js`
- Groq's llama-3.1-8b-instant is fast but not perfect

---

## 📊 Performance Benchmarks

Expected response times:

- **First summary (uncached)**: 2-5 seconds
- **Cached summary**: <500ms
- **Health check**: <100ms
- **Button click → Loading state**: Instant

---

## 🔍 Debugging Tips

### Frontend Console
Open browser DevTools (F12) → Console tab
- Look for API calls to `/ai/summarize`
- Check for React errors

### Backend Logs
Terminal running smo-backend shows:
- `POST /ai/summarize 200` (success)
- `POST /ai/summarize 503` (AI service down)
- `POST /ai/summarize 429` (rate limited)

### AI Service Logs
Terminal running smo-ai shows:
- `POST /summarize` requests
- Groq API calls
- Rate limit warnings

---

## ✅ Sign-Off Checklist

Before marking the feature as complete:

- [ ] All 7 test scenarios pass
- [ ] Acceptance criteria checklist is complete
- [ ] No console errors in browser
- [ ] No server errors in terminals
- [ ] UI looks good in light and dark themes
- [ ] Performance is acceptable
- [ ] Code has been reviewed
- [ ] Documentation is complete

---

## 🚀 Next Steps

After testing is complete:

1. **Demo to team** - Show the feature working
2. **Code review** - Have another developer review changes
3. **Merge to main** - Create PR and merge
4. **Deploy** - Push to production
5. **Monitor** - Watch for errors in production logs

---

## 📞 Support

If you encounter issues during testing:

- Check `IMPLEMENTATION_COMPLETE.md` for architecture details
- Review `Target.md` for original requirements
- Check terminal outputs for error messages
- Review Groq API dashboard for rate limits

---

**Happy Testing! 🎉**
