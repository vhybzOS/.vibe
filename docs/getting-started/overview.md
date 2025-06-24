# .vibe: Agentic Coding Runtime

> **Context compression for coding agents. Humans `vibe init`, agents take over.**

## 🤖 What is .vibe?

**.vibe** is an agentic coding runtime that enables intelligent development workflows. Humans initialize projects, agents execute with precise context through intelligent code indexing.

### Traditional Development
- **Humans copy entire files** into agent chat windows
- **Context overload** - agents get confused by irrelevant code
- **Manual context management** - humans spend time curating what to share
- **Information scattered** across files, docs, and human memory

### .vibe Agentic Development
- **Agents query for what they need** - "async functions with error handling"
- **Precise context** - agents get 10 relevant lines, not 1000 irrelevant ones
- **Automatic indexing** - codebase stays queryable as agents code
- **Seamless handoff** - humans init, agents execute

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

When humans `vibe init` a project, they're setting up intelligent context management for agents:

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

### After: .vibe Agentic Context
```bash
# Agentic context management
git clone project
cd project
vibe init  # Human hands off to agents
vibe index  # Agents index codebase
# Now entire codebase is queryable by agents
vibe query "authentication middleware"  # Agent queries
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

`.vibe` enables agents to:

### 📖 **Find Code Fast**
- Query codebase with natural language
- Get relevant snippets instead of scanning entire files
- Cross-reference patterns across the entire project

### ✍️ **Execute with Precise Context**
- No more overwhelming file dumps in agent context
- Get precise, relevant code examples
- Maintain focus without context overload

### 🔄 **Work Locally**
- Everything runs on the human's machine
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