# Phase 1: ChatHeader Component Creation

**Status:** 📝 Ready to Implement
**Dependencies:** None (standalone component)
**Estimated Time:** 30-45 minutes

---

## 📋 Phase Checklist

- [x] ✅ Create new file `app/components/chat/ChatHeader.tsx`
- [x] ✅ Implement ChatHeaderProps interface
- [x] ✅ Create ChatHeader component with three buttons (Chat, History, Settings)
- [x] ✅ Add highlighted state styling for current view
- [x] ✅ Add hover states and transitions
- [x] ✅ Export component
- [ ] Test component renders correctly (visual check - will test after Phase 3)

---

## 🎯 Objective

Create a reusable ChatHeader component that provides consistent navigation across desktop and mobile layouts. The component displays three buttons (Chat, History, Settings) with highlighted state for the current view.

---

## 📝 Implementation

### File Location
```
app/components/chat/ChatHeader.tsx
```

### Complete Component Code

```tsx
import { HistoryButton } from './HistoryButton';
import { SettingsButton } from '../SettingsButton';

interface ChatHeaderProps {
  currentView: 'chat' | 'history';
  onChatClick: () => void;
  onHistoryClick: () => void;
  onSettingsClick: () => void;
  showPanelSwitchers?: boolean;  // false for desktop, true for mobile (not used in this phase)
}

export function ChatHeader({
  currentView,
  onChatClick,
  onHistoryClick,
  onSettingsClick,
  showPanelSwitchers = false,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Left side - empty for desktop, panel switchers handled in MobileLayout */}
      <div className="flex-1" />

      {/* Right side - View switchers and settings */}
      <div className="flex items-center gap-2">
        {/* Chat button */}
        <button
          onClick={onChatClick}
          className={`px-3 py-1.5 rounded-lg transition-colors duration-200 ${
            currentView === 'chat'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          aria-label="Switch to chat view"
          aria-pressed={currentView === 'chat'}
        >
          Chat
        </button>

        {/* History button */}
        <button
          onClick={onHistoryClick}
          className={`px-3 py-1.5 rounded-lg transition-colors duration-200 ${
            currentView === 'history'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          aria-label="Switch to history view"
          aria-pressed={currentView === 'history'}
        >
          History
        </button>

        {/* Settings button */}
        <SettingsButton onClick={onSettingsClick} />
      </div>
    </div>
  );
}
```

---

## 🎨 Design Specifications

### Desktop Layout
```
┌─────────────────────────────────────────────────┐
│                    [Chat] [History] [⚙️]        │
└─────────────────────────────────────────────────┘
```

### Mobile Layout (buttons only - toolbar in MobileLayout)
```
[Chat] [History] [⚙️]
```

### Button States

**Active (highlighted):**
- Background: `bg-blue-100 dark:bg-blue-900`
- Text: `text-blue-700 dark:text-blue-300`
- Font: `font-medium`

**Inactive (default):**
- Text: `text-gray-600 dark:text-gray-400`
- Hover: `hover:bg-gray-100 dark:hover:bg-gray-800`

**Transitions:**
- Duration: 200ms
- Property: colors

---

## 🔍 Component Analysis

### Props Interface

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `currentView` | `'chat' \| 'history'` | Yes | Current active view for highlighting |
| `onChatClick` | `() => void` | Yes | Callback when Chat button clicked |
| `onHistoryClick` | `() => void` | Yes | Callback when History button clicked |
| `onSettingsClick` | `() => void` | Yes | Callback when Settings button clicked |
| `showPanelSwitchers` | `boolean` | No | Reserved for future use (default: false) |

### Dependencies

**External Components:**
- `HistoryButton` - from `./HistoryButton` (assumed to exist)
- `SettingsButton` - from `../SettingsButton` (assumed to exist)

**Note:** If these components don't exist or need different imports, adjust the import statements accordingly.

---

## ✅ Validation Checklist

### Visual Tests
- [ ] Component renders without errors
- [ ] Chat button highlights when `currentView="chat"`
- [ ] History button highlights when `currentView="history"`
- [ ] Settings button appears and is clickable
- [ ] Hover states work on inactive buttons
- [ ] Transitions are smooth (200ms)
- [ ] Dark mode styling works correctly

### Functional Tests
- [ ] Clicking Chat button triggers `onChatClick` callback
- [ ] Clicking History button triggers `onHistoryClick` callback
- [ ] Clicking Settings button triggers `onSettingsClick` callback
- [ ] ARIA labels present for accessibility
- [ ] ARIA pressed state matches `currentView`

### Integration Preparation
- [ ] Component exports correctly
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Component is ready to import in layouts

---

## 🚨 Common Issues & Solutions

### Issue: HistoryButton or SettingsButton not found
**Solution:** Check actual import paths in your codebase. Update imports:
```tsx
// Example alternative imports
import { HistoryIcon } from '@/components/icons/HistoryIcon';
import { SettingsIcon } from '@/components/icons/SettingsIcon';
```

### Issue: Button styling doesn't match design
**Solution:** Verify Tailwind CSS classes are available. Check dark mode configuration.

### Issue: TypeScript errors on callback props
**Solution:** Ensure callbacks are correctly typed as `() => void` in parent components.

---

## 📊 Phase Completion Criteria

✅ **Phase 1 is complete when:**
1. ChatHeader.tsx file created in correct location
2. All validation checklist items pass
3. Component ready for import in Phase 3
4. No TypeScript or linting errors
5. Visual appearance matches design specifications

---

## 🎯 Next Phase

Once Phase 1 is complete, proceed to:
- **[Phase 2: ChatPage Refactoring](./Phase-2-ChatPage.md)**

---

**Estimated Completion Time:** 30-45 minutes
