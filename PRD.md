# PRD: Chrome Extension - Query Param Editor

Chrome extension to read, edit, add, and remove query parameters from the current tab's URL, with smart input types based on value format.

## Core Features

- Read and parse current tab URL
- Display list of query parameters with parameter count
- Editable fields with smart input types:
  - Text input for strings
  - Number input for numbers
  - Date picker for date strings
  - Boolean toggle for true/false
  - List editor for comma-separated values
  - JSON editor for JSON objects/arrays
- Expandable URL display with syntax highlighting for parameter keys
- Add new parameters with auto-detected input types
- Remove existing parameters
- Apply changes with visual feedback (update URL)
- Reset to original values
- Refresh active tab URL

## Requirements

| Category    | Detail                                   |
| ----------- | ---------------------------------------- |
| Platform    | Chrome Extension (Manifest v3)           |
| Data        | Read-only access to active tab URL       |
| Tech Stack  | Vanilla JS / React, Tailwind for styling |
| Permissions | tabs                                     |

## Wireframe

```
+---------------------------------------------------------+
| Query Param Editor [Extension Popup]                    |
|---------------------------------------------------------|
| [ Refresh 🔄 ]                                          |
| URL: https://example.com?foo=123&date=2025-04-23        |
|---------------------------------------------------------|
| Param Key | Param Value              | [Remove]          |
|---------------------------------------------------------|
| foo       | [123           ][number] | [🗑️]             |
| date      | [2025-04-23    ][date]   | [🗑️]             |
| active    | [true          ][toggle] | [🗑️]             |
|---------------------------------------------------------|
| [+ Add Param]                                           |
| Key: [_______] Value: [_______][auto-input type detect] |
|---------------------------------------------------------|
| [Apply Changes]                      [Reset]            |
+---------------------------------------------------------+
```

## Phase 2 Ideas

| Idea               | Detail                                   |
| ------------------ | ---------------------------------------- |
| Param Templates    | Save common param sets for reuse         |
| Param History      | View and revert previous param changes   |
| Validation Rules   | Custom regex validation for inputs       |
| Preset Generators  | Generate params for SEO, tracking, etc.  |
| Auto-detect Enum   | Dropdown for values like `status=active` |
| Keyboard Shortcuts | Quick apply/reset via hotkeys            |
| Multi-Tab Editing  | Apply to multiple tabs at once           |

## Notes

- Extension will not auto-reload the page unless user clicks "Apply Changes"
- Smart detection for types: RegEx-based parsing

## Color Schema

### Primary Colors

- Green: `#10b981` (green-500) - Used for primary actions, buttons, and highlights
- Green Hover: `#059669` (green-600) - Used for hover states of green elements

### Neutral Colors

- White: `#ffffff` - For backgrounds and content areas
- Gray-100: `#f3f4f6` - For light backgrounds, form elements
- Gray-200: `#e5e7eb` - For borders, secondary buttons
- Gray-300: `#d1d5db` - For input borders
- Gray-400: `#9ca3af` - For inactive elements
- Gray-600: `#4b5563` - For secondary text
- Gray-700: `#374151` - For primary text
- Gray-800: `#1f2937` - For headings
- Black: `#000000` - For borders and certain UI elements

### Accent Colors

- Red-500: `#ef4444` - For error states and deletion actions (implied by the trash function)
