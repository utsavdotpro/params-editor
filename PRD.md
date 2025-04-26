# PRD: Chrome Extension - Query Param Editor

Chrome extension to read, edit, add, and remove query parameters from the current tab's URL, with smart input types based on value format.

## Core Features

- Read and parse current tab URL
- Display list of query parameters
- Editable fields with smart input types:
  - Text input for strings
  - Number input for numbers
  - Date picker for date strings
  - Boolean toggle for true/false
- Add new parameters
- Remove existing parameters
- Apply changes (update URL)
- Reset to original

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
