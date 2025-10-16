# Ticket 012: Production Build with Terminal Fixes

## Objective
Create a fresh production build of My Jarvis Desktop with all terminal fixes implemented, ensuring the UI doesn't black out and all recent improvements are included.

## Current Situation
- Development environment has all fixes implemented
- Production build may be outdated
- UI showing black screen issues
- Need to verify all terminal fixes are in production

## Implementation Steps

### 1. Verify Current Code State
- [ ] Check all terminal fixes are committed
- [ ] Verify package.json build scripts
- [ ] Confirm electron-builder configuration

### 2. Clean Build Environment
- [ ] Delete dist/ folder
- [ ] Delete out/ folder  
- [ ] Clear node_modules if needed
- [ ] Clean any cached builds

### 3. Install Dependencies
- [ ] Run `npm install` fresh
- [ ] Verify all dependencies resolved

### 4. Create Production Build
- [ ] Run `npm run build` for production assets
- [ ] Run `npm run dist` for Electron packaging
- [ ] Verify .dmg or appropriate installer created

### 5. Test Production Build
- [ ] Install fresh build
- [ ] Test terminal functionality
- [ ] Verify no black screen issues
- [ ] Test Claude Code interactions

## Build Commands
```bash
# Clean
rm -rf dist out

# Install
npm install

# Build
npm run build
npm run dist

# Output location
# macOS: out/make/*.dmg
# Windows: out/make/*.exe
# Linux: out/make/*.AppImage
```

## Success Criteria
- Production build created successfully
- Terminal works without black screens
- All recent fixes included
- Installable package generated

## Notes
- Ensure all recent terminal fixes from tickets 001-011 are included
- Focus on stability over new features
- Document any build issues encountered