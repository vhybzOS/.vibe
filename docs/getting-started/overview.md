# .vibe: Agentic Coding Runtime

> **Finally, context compression that actually works.** Stop dumping 1000-line files into AI chat windows. Get exactly the 10 lines you need.

## 🤖 What is .vibe?

**.vibe** is an agentic coding runtime that solves the AI context problem. Instead of overwhelming your AI with entire files, it gives you precise code snippets through natural language queries.

### Traditional AI Development
- **Copy entire files** into AI chat windows
- **Context overload** - AI gets confused by irrelevant code
- **Manual context management** - you spend time curating what to share
- **Information scattered** across files, docs, and your brain

### .vibe Development
- **Query for what you need** - "async functions with error handling"
- **Precise context** - get 10 relevant lines, not 1000 irrelevant ones
- **Automatic indexing** - your codebase stays queryable as you code
- **Local-only** - no cloud dependencies, no privacy concerns

## 🧠 The Context Compression Philosophy

### Core Problems We Solve

1. **AI Context Overload**
   - Problem: Dumping entire files overwhelms AI with irrelevant information
   - Solution: Query for exactly what you need with natural language
   - Result: AI gives better responses because it has better context

2. **Manual Context Curation**
   - Problem: You waste time deciding what code to share with AI
   - Solution: Automated indexing makes everything queryable
   - Result: Spend time coding instead of copy-pasting files

3. **Information Scatter**
   - Problem: Relevant code is spread across multiple files
   - Solution: Cross-file pattern recognition and smart retrieval
   - Result: Get related patterns even if they're in different modules

## 🎯 The Transformation

When you `vibe init` a project, you're setting up intelligent context management:

### Before: Manual Context Hell
```bash
# Traditional workflow
git clone project
cd project
# Read README, docs, code files
# Copy relevant parts to AI chat
# Manually curate context
# Repeat every conversation
```

### After: .vibe Smart Context
```bash
# Smart context management
git clone project
cd project
vibe init
vibe index
# Now your entire codebase is queryable
vibe query "authentication middleware"
# Returns exactly the relevant code snippets
```

## 🔧 How It Works

### 1. Project Setup
```bash
vibe init
```
- Sets up development protocols (testing, patterns, etc.)
- Creates queryable project structure
- No cloud setup, no account creation, just works locally

### 2. Codebase Indexing
```bash
vibe index --path src/
```
- Parses code with tree-sitter for structural analysis
- Extracts patterns and stores in queryable format
- Creates semantic links between code elements

### 3. Intelligent Querying
```bash
vibe query "async functions with error handling"
```
- Natural language → Precise code snippets
- 10 relevant lines instead of 1000-line files
- Context-aware relevance scoring

## 🌟 What You Can Do

`.vibe` enables you to:

### 📖 **Find Code Fast**
- Query your codebase like you're talking to a person
- Get relevant snippets instead of scrolling through files
- Cross-reference patterns across your entire project

### ✍️ **Give AI Better Context**
- Stop copy-pasting entire files into chat windows
- Get precise, relevant code examples for your AI
- Maintain context without overwhelming your AI assistant

### 🔄 **Work Locally**
- Everything runs on your machine
- No cloud dependencies or privacy concerns
- Works offline, no account needed

## 🚀 Real-World Impact

### Development Velocity
- **10x faster context discovery** through intelligent querying
- **No more file hunting** - ask for what you need
- **Better AI responses** because you give better context

### Code Quality
- **Find patterns** across your entire codebase
- **Consistent implementations** through pattern discovery
- **Learn from your own code** instead of Stack Overflow

### Sanity Preservation
- **Stop copy-pasting** massive files into AI chats
- **No context juggling** between multiple files
- **Actual productivity** instead of context management overhead

## 🔮 The Vision

`.vibe` is what AI development should have been from the start:

- **Local-first** - your code stays on your machine
- **Context-aware** - get relevant information, not information overload
- **Actually useful** - solve real problems instead of creating new ones
- **No bullshit** - three commands that work, no PhD required

This isn't about replacing developers or some AI revolution nonsense. It's about having better tools that don't get in your way.

**Ready to try context compression that actually works?** [Install .vibe →](installation.md)