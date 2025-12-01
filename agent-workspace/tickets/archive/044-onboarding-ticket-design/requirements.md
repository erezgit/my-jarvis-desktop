# Onboarding Ticket Design - Requirements

## Problem Statement
Current ticket UI lacks visual appeal and engagement, especially for onboarding scenarios:
- **Minimal color usage**: Only status label has color (blue "planned")
- **Low contrast**: All text in neutral grays - feels lifeless
- **No visual hierarchy**: Hard to distinguish importance
- **Lacks delight**: First user experience should be engaging and welcoming
- **No icons**: Purely text-based, missing visual cues

## User Context
This is the **first thing new users see** when they open My Jarvis Desktop. The onboarding ticket needs to:
- Create excitement and confidence
- Guide users through setup clearly
- Feel modern and polished
- Reduce cognitive load with visual cues
- Establish trust through professional design

## Design Goals

### 1. Strategic Color Usage
- **Existing palette**: Leverage Shadcn colors already in use
  - Green (`#10B981`) - success, completion, active states
  - Blue (`#3B82F6`) - information, progress, planned items
  - Sky (`#0EA5E9`, `#38BDF8`) - highlights, interactive elements
  - Neutral/Zinc - backgrounds and text
- **Apply boldly**: Don't just tint backgrounds - use full color for impact
- **Color coding**: Different task states, priorities, sections

### 2. Icons & Visual Elements
- Task state icons (checkmarks, progress spinners, etc.)
- Section icons (product, architecture, implementation)
- Status indicators beyond just text labels
- Visual progress indicators

### 3. Enhanced Typography & Hierarchy
- Clear visual distinction between sections
- Better spacing and grouping
- Readable but engaging font sizes
- Proper contrast ratios

### 4. Interactive & Delightful Details
- Hover states with color feedback
- Smooth transitions
- Celebratory elements for completed items
- Visual feedback for progress

## Technical Requirements

### Component Architecture
Each design variant will have:
1. **React Component** (`OnboardingTicketV1.tsx`, etc.)
   - Location: `app/components/FilePreview/mdx/mdx-components/`
   - TypeScript with proper interfaces
   - Theme-aware (dark/light mode)
   - Self-contained with no external dependencies

2. **Demo MDX File** (in onboarding workspace)
   - Shows real onboarding scenario
   - Demonstrates component capabilities
   - Provides context and instructions

3. **Registration** in `MDXRenderer.tsx`
   - Added to component imports
   - Available for all MDX files

### Data Structure
```typescript
interface OnboardingTask {
  name: string;
  done: boolean;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface OnboardingTicketProps {
  title: string;
  description: string;
  confidence?: number;
  tasks: OnboardingTask[];
  currentStep?: number;
}
```

## Three Design Variants

### Variant 1: Color-Coded Progress States
**Theme**: Traffic light progression
- **Red/Orange**: Not started tasks
- **Blue**: In progress
- **Green**: Completed
- **Gradient progress bar**: Transitioning colors as completion increases
- **Large visual progress circle**: Shows percentage prominently
- **Color-coded sections**: Each section gets a theme color

### Variant 2: Icon-Driven Storytelling
**Theme**: Visual journey with icons
- **Journey metaphor**: Path/road visualization
- **Status icons**: ⚪ → 🔵 → ✅ (or custom SVG icons)
- **Section icons**: 📋 Product, 🏗️ Architecture, 💻 Implementation
- **Milestone markers**: Visual checkpoints along the way
- **Illustrated progress**: Icons show current position in journey

### Variant 3: Card-Based Modern Layout
**Theme**: Clean, segmented card design
- **Separate cards**: Each major section is a distinct card
- **Color accents**: Left border or top accent in theme colors
- **Floating shadows**: Depth and layering
- **Badge components**: For status, priority, completion
- **Compact stats**: Quick-glance metrics in cards
- **Modern spacing**: More breathing room, less density

## Success Criteria
- [ ] All three variants render correctly in light/dark mode
- [ ] Colors are vibrant but not overwhelming
- [ ] Clear visual hierarchy - users know where to look
- [ ] Icons enhance understanding, not clutter
- [ ] Feels delightful and professional
- [ ] Components registered and usable in MDX
- [ ] Demo MDX files show real onboarding scenario

## References
- Current TicketStack component: `app/components/FilePreview/mdx/mdx-components/TicketStack.tsx`
- MDX component registry: `app/components/FilePreview/mdx/MDXRenderer.tsx`
- Existing color usage: Green (#10B981), Blue (#3B82F6), Sky blues for highlights
- Theme system: `useSimpleTheme()` hook for dark/light detection
