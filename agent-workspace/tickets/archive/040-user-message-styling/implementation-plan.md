# Ticket #040: User Message Styling Consistency

## Objective
Update user message bubble styling to match my-jarvis-frontend design system.

## Current State
- User messages use neutral-200 background (gray)
- "User" label displayed above message
- Timestamp on same line as label (top of message)
- Text uses neutral-900 color

## Target State (from my-jarvis-frontend)
- User messages use green-100 background: `hsl(140.6, 84.2%, 92.5%)`
- No user label displayed
- Timestamp moved below message content
- Text uses nearly black color (`text-black`)
- Padding: `px-4 py-3`
- Border radius: `rounded-lg`

## Implementation Tasks

### 1. Update Background Color
- **File**: `app/components/MessageComponents.tsx`
- **Line**: 50
- Change from `bg-neutral-200` to custom green-100 color
- Add CSS variable or inline style for exact HSL match

### 2. Remove User Label
- **File**: `app/components/MessageComponents.tsx`
- **Lines**: 58-72
- Remove the entire header div containing "User" label and timestamp

### 3. Move Timestamp Below Message
- **File**: `app/components/MessageComponents.tsx`
- Add timestamp component after message content (line 73-76)
- Position timestamp below the message text

### 4. Update Text Color
- **File**: `app/components/MessageComponents.tsx`
- Change text color to `text-black` for better contrast on green background
- Ensure dark mode compatibility

### 5. Verify Padding and Layout
- Confirm `px-4 py-3` padding matches frontend
- Verify `rounded-lg` border radius
- Check `max-w-[90%]` on MessageContainer

## Files to Modify
1. `app/components/MessageComponents.tsx` - ChatMessageComponent function
2. Potentially `app/styles/global.css` - Add green-100 CSS variable if needed

## Testing
- Verify user messages display with green background
- Confirm no user label appears
- Check timestamp appears below message
- Test in both light and dark modes
- Verify alignment with other message types

## Success Criteria
- ✅ User message background is light green (green-100)
- ✅ No "User" label displayed
- ✅ Timestamp appears below message content
- ✅ Text color is nearly black with good contrast
- ✅ Styling matches my-jarvis-frontend exactly
- ✅ Removed font-mono from chat messages (using sans-serif)
- ✅ Updated MessageContainer padding to px-4 py-3
- ✅ Background color updated to neutral-50 for lighter appearance

## Implementation Complete

### Files Modified
1. `app/components/MessageComponents.tsx`:
   - Removed "User" label for user messages
   - Moved timestamp below message content
   - Changed background to green-100 (HSL 140.6, 84.2%, 92.5%)
   - Updated text color to black
   - Removed font-mono class, changed pre to div

2. `app/components/messages/MessageContainer.tsx`:
   - Added customBgColor prop for inline background colors
   - Updated padding from conditional to consistent px-4 py-3

3. `app/components/chat/ChatMessages.tsx`:
   - Changed background from neutral-100 to neutral-50

4. `app/components/ChatPage.tsx`:
   - Changed background from neutral-100 to neutral-50

All changes tested and verified in development build.
