# Slash AI Roadmap

## 🐛 Known Bugs

### SuperHuman
- `/ai` trigger doesn't activate - no overlay appears when typing `/ai`

### LinkedIn
- `/ai` trigger works and overlay appears
- Command+Enter doesn't insert AI response text into the field
- Text insertion mechanism broken for LinkedIn's input handling

## 🚀 Feature Requests

### User Experience (UX)

#### Dark Mode Support
- Current overlay styling looks good in Gmail light mode
- Breaks/looks poor on dark mode sites (e.g., Google in dark mode)
- Need adaptive styling that detects page theme or uses CSS media queries

#### Enhanced Visual Indicators
- ✅ Already shows "Esc to cancel" hint
- **Add**: Subtle indication for Command+Enter to send prompt
- Consider improving the visual hierarchy and accessibility of these hints

### Functionality

#### Context-Aware Prompts
- **Page Context Integration**: Ability to include page content as background information
- Automatically pull relevant context from the current page/selection
- Toggle option to include/exclude context per prompt

#### Model Selection
- Allow users to toggle between different AI models
- Support for different OpenAI models (GPT-4, GPT-4-turbo, etc.)
- Model selection UI in overlay or options page

#### Notion Support
- **Rich Text Editor Compatibility**: Full support for Notion's contentEditable implementation
- Handle Notion's complex DOM structure and block-based editing
- Proper text insertion that respects Notion's formatting and block boundaries
- Test across different Notion block types (text, headings, lists, etc.)

#### Text Blaze-Style Shortcuts
- Non-AI shortcuts for common text expansions
- Custom shortcuts like `/email` → email signature
- User-defined text replacement shortcuts

#### Conversation Mode
- **Interactive Chat**: Multi-turn conversation before final insertion
- Preview/edit AI response before inserting
- Chat interface within the overlay for back-and-forth
- Final "Insert" button to place refined response

#### Saved Prompts System
- **Custom Prompt Library**: User-created reusable prompts
- Quick access via `/ai /sales-email` syntax
- Categories and organization for prompt management

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
1. Fix LinkedIn text insertion bug
2. Fix SuperHuman compatibility
3. Dark mode styling support

### Medium Priority
1. Enhanced visual indicators for shortcuts
2. Notion support
3. Page context integration
4. Model selection

### Future/Research
1. Conversation mode
2. Saved prompts system
3. Team sharing and versioning features