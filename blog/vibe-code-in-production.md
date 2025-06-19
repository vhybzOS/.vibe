---
title: Vibe code in production; don't listen to the haters! 🚀💪
published: false
description: How to ship production code by orchestrating AI agents while focusing on architecture and having time for beer
tags: ai, productivity, development, automation
cover_image:
---

**TL;DR** Stop letting coding purists hold you back. I see two types of coding: "Passion Coding" (things I love to write, personal preference, e.g. a kink for DJing with code 🤪) and "Vibe Coding" (the new way to get stuff that I want without particularly being in love with coding in that domain!). LLMs are perfect for the latter. Be a **Vibe Coder**: embrace your inner Karen, set the architectural direction, let AI agents do the boring work, and still have time for a beer. 🍺

## The Two Faces of Code

Every developer has two modes, whether they admit it or not.

First, there's **"Passion Coding"**. The stuff that makes you feel alive. When you're in the zone and write something that feels like poetry. Take this beauty I wrote called [Nancy](https://github.com/keyvan-m-sadeghi/nancy), where I re-implemented JavaScript promises using functional programming principles:

```js
const callLater = (getMember) => (callback) =>
  new Nancy((resolve) => laterCalls.push(() => resolve(getMember()(callback))))
```

Look at that line! It's compact, elegant, and probably only I can read it. But damn, was it satisfying to write. That's the kink for coding. When you're solving a problem just to prove how elegant functional programming can be, or building something because the architecture feels _right_.

Then there's the other mode. The stuff that pays the bills. Let's call it **"Corporate BS Coding."** Writing endless boilerplate, wrestling with YAML configs, implementing yet another CRUD endpoint, documenting everything in excruciating detail. It's necessary, but it's also soul-crushing.

The tragedy is that to ship anything real, you're constantly forced to switch between these modes, killing your flow and your passion. Until now.

## Why LLMs Write "Ugly" Code (And Why That's Perfect)

Enter the LLM revolution. These things are _insane_. They can produce megabytes of functioning code in seconds. It's the ultimate superpower for any lazy ass passion programmer.

But let's be brutally honest about what they produce. If I asked GPT-4 to implement something like Nancy, it would probably spit out 1000 lines of verbose, over-commented, explicitly typed code that looks like it came straight from a Java enterprise handbook. It would work perfectly, but it would have zero soul.

Many developers see this as a problem. They're wrong.

**This isn't a bug; it's exactly what we want!** Most code doesn't need to be an elegant poem. It just needs to work, be maintainable, and not break in production. The Nancy-style code is for the 5% of cases where you're solving a genuinely interesting problem or need that perfect abstraction. The other 95%? Let the robot handle it.

This realization unlocks a completely new paradigm: **"Vibe Coding."**

## The Vibe Coder's Manifesto

Vibe Coding is about embracing your inner Karen. And I mean that in the best possible way.

You become the demanding architect who cares deeply about the _what_ and the _why_, but delegates the tedious _how_ to a robot. You get to focus on the parts you actually enjoy:

- 🧠 Selecting the perfect tech stack
- 🏗️ Having weird opinions about integration patterns
- 🔮 Designing genius, future-proof architectures
- ✨ Setting the overall _vibe_ of the project

The robot does the boring implementation work. You orchestrate. You make the high-level decisions. You get to be the Karen, and your robot does all the boring work.

This isn't lazy programming. It's _evolved_ programming. Just like how we moved from assembly to C, then from C to high-level languages, this is the next logical step.

## The Algorithm of Convergence: Corporate Jujitsu for AI

So how do you direct this firehose of AI-generated code without creating an unmaintainable disaster?

Here's where all that "corporate BS" you were forced to learn finally becomes useful. TDD, PRDs, documentation standards. These aren't burdens anymore. They're the very tools you use to control your AI workforce. The Operating System. I call it the **Algorithm of Convergence**.

**Phase 1: The Unhinged Vibe (Divergence)**
You start with a crazy idea. You prompt the LLM. It hallucinates with you, making the idea even more unhinged. This is pure creative energy. No constraints, just possibilities.

**Phase 2: The Reality Check (Convergence)**
Here's the critical step. You command the agent: _"Write a test for that vague idea."_

Boom. Instantly, the unhinged concept gets slammed into the cold, hard reality of executable code. It's no longer abstract. It's a concrete specification that either passes or fails.

**Phase 3: The Agent Ping-Pong**
Now the magic happens. The agent bounces between two roles:

1. **The Intern**: Writes whatever ugly code it thinks will make the test pass. It usually fails, but now we have something instead of nothing
2. **The Architect**: Edits the non-passing code until it passes. The concrete implementation may give it ideas to even refactor the original test

This cycle (implement, test, refactor, test, repeat) forces the chaotic energy of the LLM to converge on a high-quality result that matches your vision. You don't need to understand every line of the legacy code it generates. You just need to vibe-check the end result. You have legacy code sure, but isn't all code legacy except maybe in the eyes of the few nerds hypnotized by that tech specifically? Algorithm is king. If you get your dream algorithm to shippable state, no one cares about the code underneath.

## We're Building `.vibe` with Vibe Coding

This whole philosophy isn't just theory. It's how we're building [`.vibe` (dotvibe)](https://github.com/vhybzOS/.vibe), an open-source tool for codifying vibe flows!

**.vibe** is a local-only, autonomous dependency management system built to solve "AI amnesia". On each `npm install <package>`, the know-how of using that package is injected to LLM's context. All you need to do is a simple `vibe init` command, everything runs on autopilot. Think of it as giving your AI coder a photographic memory of your codebase, including your libraries and unique dev workflow.

We started building `.vibe` in full "Karen mode", using AI agents to generate tons of features rapidly. We quickly ended up with a `legacy/` directory full of functional but messy code. It proved the raw power but also highlighted the danger. Without proper constraints, AI can create an unmaintainable mess faster than any junior developer ever could. The excess of legacy became uncontrollable.

So we built a harness using the corporate jujitsu I described. Our framework consists of `AGENTS.md` and `CLAUDE.md` files that serve as a "Constitution" for our AI workforce, laying down non-negotiable architectural laws like functional programming patterns, strict TDD cycles, and tagged union error handling. We use `@tested_by` annotations that anchor every line of generated code to concrete tests, making the entire system self-auditing. We even have `PRD.md` (Product Requirements Document) - another corporate concept, finally finding a home!

But here's where it gets really cool: we're baking this philosophy directly into the tool itself. A `vibe code` command is being designed _for the robot_ to use. An LLM will run `vibe code hono --list` to discover what code patterns are available, then `vibe code hono middleware` to show the LLM up to date docs specifically for the used version of `hono` library. The CLI becomes an API that allows AI to understand and execute on the human's architectural vision. The robot vibe-codes and understands the human authors!

## Don't Listen to the Haters

"But that's not _real_ coding!" cry the gatekeepers. "You need to understand every line!" they proclaim. "What about code quality?"

Look, I get it. There's something deeply satisfying about crafting beautiful code by hand. The Nancy example proves I can appreciate elegant implementations. But let's be real about what we're optimizing for.

Are you building software to impress other developers with your clever abstractions? Or are you building software to solve real problems for real users?

If it's the latter, then Vibe Coding is objectively superior. It lets you focus on the 20% of decisions that create 80% of the value: the architecture, the user experience, the business logic that actually matters. The robot handles the remaining 80% of grunt work that nobody enjoys anyway.

Your corporate learnings aren't going to waste. They become the sophisticated framework you can use to design your own agentic OS. E.g. TDD becomes your convergence algorithm. Documentation standards become your agent instructions. Code review processes become your quality gates.

This isn't about abandoning rigor; it's about automating rigor so you can focus on the interesting problems.

Dismissing what young people do is a trait we picked up from some of our boomer elderly. Ahem... not some, most!! Don't be that person. This is evolution, not laziness.

## Try It Yourself

AI coding tools are ready. The techniques work. The only thing standing between you and a feeling you probably had on the early days of coding is the voice in your head saying "but real programmers don't do it this way."

That voice is wrong, and it's holding you back.

So here's my challenge: try Vibe Coding on your next project. Don't follow hyped tutorials and click-bait videos. Build a process that feels right. Something that vibes with *you!* Set the architectural vision. Then vibe-check the results and iterate until it matches.

You might find yourself vibe coding a lot after a while, and still have time for that beer. 🍺

And to the haters who think this isn't "real programming"? We'll be over here shipping production code while you're still arguing about semicolons.

---

_Want to try Vibe Coding yourself? Check out [.vibe](https://github.com/vhybzOS/.vibe), it currently teaches libraries in `package.json` to your AI coder, with much more planned! PRs welcome, haters can stay home._ 😎
