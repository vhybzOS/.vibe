---
title: Vibe code in production and don't listen to haters! 🚀💪
published: false
description: How to ship production code by orchestrating AI agents while focusing on architecture and having time for beer
tags: ai, productivity, development, automation
cover_image:
---

**TL;DR** Stop letting coding purists hold you back. There are two kinds of code: the kind you write in flow, and the kind that gets products out the door. LLMs are perfect for the latter. Be a *proud* **Vibe Coder**: set the architectural direction, let AI agents do the grunt work, and still have time for a beer. 🍺

## The Two Faces of Code

Every dev I know lives in two modes, even if they don’t admit it.

First, there’s **"Passion Coding"**—the stuff that lights you up. When it feels like the code is flowing through you, not from you. Like this beauty I wrote called [Nancy](https://github.com/keyvan-m-sadeghi/nancy), re-implementing JavaScript promises using functional programming:

```js
const callLater = (getMember) => (callback) =>
  new Nancy((resolve) => laterCalls.push(() => resolve(getMember()(callback))))
```

Look at that. Compact, weirdly elegant, probably inefficient, and totally worth it. That’s the thrill of coding for yourself. You’re solving something just because it feels good, not because Jira told you to.

But let’s be honest. That’s not most of your day.

The rest is what I call **Corporate Coding**. You know the drill: endless boilerplate, tweaking configs, writing the same CRUD API for the fifth time, adding a comment to a test you didn’t even want to write. It’s work. It pays the bills. It’s not fun.

The real pain is context switching. One moment you’re deep in a clever abstraction, the next you’re writing pagination logic for a dashboard no one reads. That back-and-forth kills momentum and wrecks the flow. But there’s a better way now.

## Let the Robot Handle the Boring Stuff

LLMs are ridiculously good at one thing: outputting working code fast. Not poetic, not optimal, but functional. Perfect for Corporate Coding.

Ask one to write a version of Nancy, and it’ll give you 200 lines of verbose, explicit, over-documented code. It'll run just fine, but feel like it came from a committee.

That’s not a bug. That’s exactly what you want.

Most code doesn’t need soul. It just needs to run, not crash, and be easy to change later. That clever architecture you love? Keep it for the 5%. Let the machine own the rest.

This is where **Vibe Coding** kicks in.

## What It Means to Be a Vibe Coder

You stop being the person who writes everything by hand. You become the one who defines the direction.

You're the system designer. The taste enforcer. The one with strong opinions about folder structure and dependency graphs.

You focus on:

- 🧠 Architectural direction
- 🧪 Test definitions
- 🗺️ Domain modeling
- 🛠️ Creating reusable patterns
- 🍻 And yeah, having time to chill when the job’s done

The AI fills in the tedious parts. You stay focused on the interesting decisions. It’s not slacking off — it’s using your brain for what it’s best at.

## How You Stay in Control: The Algorithm of Convergence

You don’t just throw prompts at the LLM and hope for the best. You use process as leverage.

That process is what I call the **Algorithm of Convergence**. Here’s how it works:

**Step 1: Diverge**  
Start with an idea. Doesn’t matter how vague or wild. Prompt the LLM and let it go crazy. This is your brainstorming phase.

**Step 2: Ground It**  
Now bring it back to Earth. Ask the AI to write a test for the idea. Just one. Doesn’t matter if the implementation is messy. Once the test exists, the idea is real.

**Step 3: Ping-Pong**  
Switch roles between implementer and architect:
- One AI writes whatever is needed to pass the test.
- Another reviews and refactors to align with the project’s style.

That cycle — write, test, refactor, repeat — forces the chaos into shape. The result is code that works, fits the system, and matches your vision. You don’t have to understand every line, just whether it holds up.

## We’re Building `.vibe` Like This

This isn’t a theory post. It’s how we’re building [.vibe](https://github.com/vhybzOS/.vibe), our AI-first dev tool.

`.vibe` fixes context loss and fragmentation in agent-assisted coding. Instead of starting every prompt from scratch, `.vibe` gives agents full memory of your stack, your opinions, your history.

We used LLMs to ship it fast — and ended up with a pile of messy but working code. It proved the concept, but also showed how dangerous AI at scale can be without rules.

So we gave it structure. We added `AGENTS.md` and `CLAUDE.md` files. These act like laws for our agent workforce. They define how things should be built: effectful code with Effect-TS, strict TDD, safe error handling, consistent patterns.

Every line of generated code gets an `@tested_by` link to a concrete test. If it fails, it gets thrown out. If it passes, it sticks.

Then we started building the tooling *for* the agents. The `vibe code` CLI isn't made for humans. It’s designed for LLMs to query patterns, follow architectural rules, and generate code that fits the vibe.

Agents can call `vibe code hono --list` to see available generators. They run `vibe code hono route` to scaffold REST endpoints with the right structure. We even added import maps for AIs with commands like `vibe code --map zod zod/v4`.

The whole CLI becomes a programmable interface between your architectural intent and your AI workforce.

## Ignore the Purists

There’s always going to be a dev yelling, “You have to understand every line.” That mindset is stuck in the past.

Sure, elegant code is nice. Nancy is a fun flex. But are you building art for GitHub stars, or software that solves real problems?

Vibe Coding puts your time where it matters. You make the calls that shape the system. The machine handles the rest.

Your experience still matters — it just shows up in the rules, not the keystrokes.

## Try It Yourself

All the tools are here. The workflows are clear. The only thing in your way is a voice in your head saying, “This isn’t real engineering.”

That voice is wrong.

Try Vibe Coding on your next project. Start with architecture. Define the tests. Let the LLMs fill in the gaps. Then check the outputs and tune the results.

You’ll ship faster, stress less, and still have time for that beer. 🍺

And if someone asks, “Isn’t that cheating?” — just smile and point to the working product.

---

_Want to get hands-on with Vibe Coding? Check out [.vibe](https://github.com/vhybzOS/.vibe). PRs welcome. Haters can stay home._ 😎
