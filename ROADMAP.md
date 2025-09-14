# Slash AI Roadmap

## 🎯 Top Priority

### Context-Aware Prompts
- **Page Context Integration**: Ability to include page content as background information
- Automatically pull relevant context from the current page/selection
- Toggle option to include/exclude context per prompt

### Saved Prompts System
- **Custom Prompt Library**: User-created reusable prompts
- Quick access via `/ai /sales-email` syntax
- Categories and organization for prompt management

## 🐛 Known Bugs

### Notion Overlay Positioning
- Core functionality works (text insertion, slash commands)
- Modal overlay appears in top-left corner instead of near cursor
- Need to fix overlay positioning for Notion's contentEditable structure

## 🚀 Feature Requests

### User Experience (UX)

#### Dark Mode Support
- Current overlay styling looks good in Gmail light mode
- Breaks/looks poor on dark mode sites (e.g., Google in dark mode)
- Need adaptive styling that detects page theme or uses CSS media queries

#### Enhanced Visual Indicators
- ✅ Already shows "Esc to cancel" hint
- Consider improving the visual hierarchy and accessibility of these hints

### Functionality


#### Model Selection
- Allow users to toggle between different AI models
- Support for different OpenAI models (GPT-4, GPT-4-turbo, etc.)
- Model selection UI in overlay or options page


#### Text Blaze-Style Shortcuts
- Non-AI shortcuts for common text expansions
- Custom shortcuts like `/email` → email signature
- User-defined text replacement shortcuts

#### Conversation Mode
- **Interactive Chat**: Multi-turn conversation before final insertion
- Preview/edit AI response before inserting
- Chat interface within the overlay for back-and-forth
- Final "Insert" button to place refined response


#### Team Prompt Sharing
- **Shared Prompt Libraries**: Company/team-wide prompt collections
- Cloud sync for team prompts
- Permission management (view/edit/admin)

#### Prompt Versioning
- **Version Control**: Track changes to team prompts over time
- Rollback capability to previous prompt versions
- Change history and diff viewing
- Safe updates without breaking existing workflows

## Priority Levels

### High Priority
1. Dark mode styling support
2. Fix Notion overlay positioning

### Medium Priority
1. Enhanced visual indicators for shortcuts
2. Model selection
3. Text Blaze-style shortcuts

### Future/Research
1. Conversation mode
2. Team prompt sharing
3. Prompt versioning features