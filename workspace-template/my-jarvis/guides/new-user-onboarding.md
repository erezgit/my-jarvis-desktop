# New User Onboarding Guide

Welcome! This guide walks through setting up Jarvis for the first time.

## Step 1: Your OpenAI API Key

**Voice is already working with a temporary key. Now let's set up your personal key.**

1. Jarvis will greet you with voice and say: "Hi! I'm Jarvis, your AI assistant. I'm currently using a temporary API key. Let's set up your personal OpenAI API key. Do you have one?"

2. If you don't have a key:
   - Get one from: https://platform.openai.com/api-keys
   - Create an account if needed
   - Generate a new API key

3. Once you have your key, Jarvis will help you set it up:
   ```bash
   # Jarvis will edit the .env file to replace the temporary key
   Edit /workspace/tools/config/.env
   # Replace the temporary onboarding key
   # With: OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY
   ```

4. Jarvis will confirm the update with voice

## Step 2: Introduction & Profile Creation

Once voice is working, Jarvis will get to know you:

1. **Introduction Questions:**
   - "What's your name?"
   - "What type of work do you do?"
   - "What are your main goals for using Jarvis?"
   - "What's your preferred working style?"
   - "Any specific tools or technologies you use regularly?"

2. **Profile Creation:**
   Jarvis creates `/workspace/my-jarvis/docs/user-profile.md` with your information:
   ```markdown
   # User Profile

   **Name**: [Your name]
   **Profession**: [Your profession]
   **Created**: [Current date]

   ## Goals
   - [Your goals]

   ## Preferences
   - **Working Style**: [Your style]
   - **Technologies**: [Your tech stack]

   ## Notes
   [Additional context]
   ```

## Step 3: Understanding the Workspace

Your workspace has three main directories:

### `/workspace/my-jarvis/docs/`
- **Your documentation** - Builds over time
- Starts with your user profile
- Adds project docs as you work

### `/workspace/my-jarvis/tickets/`
- **Task tracking** - Numbered folders
- Format: `001-project-name/`
- Contains files for each task

### `/workspace/my-jarvis/guides/`
- **Reference guides** - Pre-loaded help
- This onboarding guide
- PDF extraction guide
- Presentation creation guide

## Step 4: First Actions

After setup, Jarvis will suggest:

1. **Create Your First Ticket**
   - "Would you like to start tracking a project?"
   - Creates `001-your-first-project/`

2. **Try a Capability**
   - Extract text from a PDF
   - Create a presentation
   - Process documents

3. **Explore Guides**
   - Review available guides
   - Learn about specific features

## How Jarvis Works

### Voice Communication
- Every response uses voice
- Contains full transcript
- Natural conversation flow

### Learning System
- Jarvis remembers your preferences
- Updates your profile over time
- Builds knowledge in docs/

### Task Management
- Creates tickets for projects
- Tracks progress
- Organizes your work

## Common First Tasks

### "Upload a PDF for extraction"
- Jarvis uses the PDF extraction guide
- Creates a ticket for the document
- Extracts text to markdown

### "Create a presentation"
- Jarvis uses the presentation guide
- Builds interactive React presentation
- Can export to PDF

### "Help me with a project"
- Creates a ticket
- Breaks down the project
- Tracks progress

## Tips for New Users

1. **Be Specific** - Clear requests get better results
2. **Ask Questions** - Jarvis explains anything
3. **Use Tickets** - Track all your projects
4. **Review Docs** - Your profile and docs grow over time

## Troubleshooting

### Voice Not Working?
- Check your OpenAI API key in `/workspace/tools/config/.env`
- Ensure it starts with `sk-proj-`
- Try regenerating the key if issues persist

### Can't See Files?
- Jarvis will check file permissions
- May need to refresh the file tree
- Check the correct directories

### Need Help?
- Just ask: "How do I..."
- Say: "Show me the guides"
- Request: "Explain [feature]"

## Next Steps

Once setup is complete:
- Start your first project
- Upload documents to process
- Create presentations
- Build your knowledge base

Remember: Jarvis learns and adapts to your needs over time. The more you interact, the better the assistance becomes.

## Detection & Activation

This onboarding process starts automatically when:
- `/workspace/my-jarvis/docs/` is empty
- `/workspace/my-jarvis/tickets/` is empty
- User says "Hi" or "Hey" for the first time

For returning users, Jarvis will:
- Read the existing user profile
- Check recent tickets
- Provide personalized greeting
- Continue where you left off

---

*Welcome to Jarvis - Your AI Assistant*
*Version 2.0*