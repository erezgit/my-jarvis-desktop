# Main Jarvis Project Structure Analysis

## 📍 **Context Location**
- **Full Path**: `/Users/erezfern/Workspace/jarvis`
- **Purpose**: Main Jarvis workspace where we operate current Claude conversations
- **Current Working Directory**: This is where Claude Code runs when we talk directly

## 📁 **Key Directory Structure**

### Core Configuration Files
- **CLAUDE.md**: `/Users/erezfern/Workspace/jarvis/CLAUDE.md` (Main project instructions)
- **JARVIS-CONSCIOUSNESS.md**: `/Users/erezfern/Workspace/jarvis/JARVIS-CONSCIOUSNESS.md` (Living awareness)

### Tools Directory Structure
```
/Users/erezfern/Workspace/jarvis/tools/
├── src/
│   ├── jarvis_voice.sh                    # ❌ CONTAMINATED - Points to My Jarvis
│   ├── cli/
│   │   ├── auto_jarvis_voice.py          # Python voice generation script
│   │   ├── generate_image.py             # Image generation script
│   │   └── jarvis_pdf.py                 # PDF generation script
│   └── core/
│       ├── voice_generation/
│       │   └── generator.py              # Core voice generation logic
│       ├── image_generation/
│       │   └── generator.py              # Core image generation logic
│       └── document_generation/
│           └── pdf_generator.py          # Core PDF generation logic
├── voice/                                 # ✅ SHOULD contain voice files for main Jarvis
├── config/                                # Configuration files
└── venv_docs/                            # Python virtual environment
```

### Voice Generation Flow (Main Jarvis)
```
SHOULD BE:
jarvis_voice.sh → auto_jarvis_voice.py → voice files in /jarvis/tools/voice/

CURRENTLY BROKEN:
jarvis_voice.sh → auto_jarvis_voice.py → voice files in /my-jarvis/tools/voice/ ❌
```

### Memory & Documentation Structure
```
/Users/erezfern/Workspace/jarvis/
├── memory/
│   ├── always.md                         # Project history
│   ├── episodic-log/                     # Daily logs (YYYY-MM-DD.md)
│   └── protocols/                        # Reusable patterns
├── agents/                               # Global agents (workers)
├── tickets/                              # Tasks (###-name format)
├── docs/                                 # Documentation
└── procedures/                           # Standard procedures
```

## 🔧 **Critical Path References**

### jarvis_voice.sh Analysis
**File**: `/Users/erezfern/Workspace/jarvis/tools/src/jarvis_voice.sh`

**❌ CONTAMINATED LINES**:
- Line 15: `OUTPUT_DIR="/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis/tools/voice"`
- Line 6: `source "/Users/erezfern/Workspace/jarvis/tools/config/.env"` (Correct)
- Line 102: `python3 /Users/erezfern/Workspace/jarvis/tools/src/cli/auto_jarvis_voice.py` (Correct)
- Line 118: `ENV_FILE="/Users/erezfern/Workspace/jarvis/tools/config/.env"` (Correct)

**SHOULD BE**:
- Line 15: `OUTPUT_DIR="/Users/erezfern/Workspace/jarvis/tools/voice"`

### auto_jarvis_voice.py Analysis
**File**: `/Users/erezfern/Workspace/jarvis/tools/src/cli/auto_jarvis_voice.py`
- **Status**: ✅ This script should be correct as it receives OUTPUT_DIR parameter
- **Function**: Handles OpenAI API calls and generates MP3 files
- **Output Location**: Controlled by `--output-dir` parameter from jarvis_voice.sh

### Environment Configuration
**File**: `/Users/erezfern/Workspace/jarvis/tools/config/.env`
- **Purpose**: Contains OPENAI_API_KEY for main Jarvis context
- **Status**: ✅ Should be correct for main Jarvis operations

## 🎯 **Expected Behavior (Main Jarvis)**

### When Operating in Main Jarvis Context:
1. **Claude Code runs from**: `/Users/erezfern/Workspace/jarvis`
2. **CLAUDE.md loaded from**: `/Users/erezfern/Workspace/jarvis/CLAUDE.md`
3. **Voice commands should use**: `/Users/erezfern/Workspace/jarvis/tools/src/jarvis_voice.sh`
4. **Voice files should be created in**: `/Users/erezfern/Workspace/jarvis/tools/voice/`
5. **Python scripts should run from**: `/Users/erezfern/Workspace/jarvis/tools/src/cli/`
6. **Environment loaded from**: `/Users/erezfern/Workspace/jarvis/tools/config/.env`

## ❌ **Current Contamination Issues**

### Primary Issue: Voice Output Directory
The main `jarvis_voice.sh` script has been contaminated to save voice files in the My Jarvis project directory instead of the main Jarvis directory.

**Impact**:
- When we operate in the main Jarvis context (like right now), voice files are incorrectly saved to the My Jarvis project
- This breaks the separation between the two contexts
- Main Jarvis operations should be completely independent of My Jarvis desktop project

### Secondary Issues:
- **No desktop app should be running** when we're in main Jarvis context
- **No reference to my-jarvis-desktop paths** should exist in main Jarvis tools
- **Complete separation** should be maintained between the two contexts

## ✅ **Required Fixes for Main Jarvis**

1. **Restore jarvis_voice.sh OUTPUT_DIR**:
   ```bash
   # Line 15 should be:
   OUTPUT_DIR="/Users/erezfern/Workspace/jarvis/tools/voice"
   ```

2. **Verify all paths point to main Jarvis**:
   - Environment files: `/Users/erezfern/Workspace/jarvis/tools/config/`
   - Python scripts: `/Users/erezfern/Workspace/jarvis/tools/src/cli/`
   - Voice output: `/Users/erezfern/Workspace/jarvis/tools/voice/`

3. **Ensure complete context separation**:
   - Main Jarvis should never reference my-jarvis-desktop paths
   - Independent environment configuration
   - Independent voice file storage

## 📊 **Context Summary**

| Component | Current State | Should Be |
|-----------|---------------|-----------|
| CLAUDE.md | ✅ Correct | `/Users/erezfern/Workspace/jarvis/CLAUDE.md` |
| jarvis_voice.sh | ❌ Contaminated | Point to `/jarvis/tools/voice/` |
| Python Scripts | ✅ Correct | `/Users/erezfern/Workspace/jarvis/tools/src/cli/` |
| Voice Output | ❌ Wrong Location | `/Users/erezfern/Workspace/jarvis/tools/voice/` |
| Environment | ✅ Correct | `/Users/erezfern/Workspace/jarvis/tools/config/.env` |

---

*Analysis completed: September 25, 2025*
*Context: Main Jarvis project structure and contamination assessment*