# Commit Protocol

## Algorithm

```pseudo
INPUT: work_completed, session_changes
vibe measure --format_check
git_status = vibe scan --git_status
changes_summary = vibe compress session_changes --format technical_summary
validation_result = vibe validate work_completed --against acceptance_criteria

IF validation_result.passed AND version_bump_needed(work_completed) THEN
  new_version = calculate_version(work_completed.impact)
  vibe parse deno.json --update version=new_version
END

commit_message = template_commit(changes_summary, work_completed.impact)
git add .
git commit -m commit_message

OUTPUT: committed_changes, updated_version
```

## Math

```latex
version_{new} = version_{old} + Δ where Δ ∈ {patch, minor, major}
impact(changes) = max(change_i.impact) ∀ change_i ∈ changes
```

## Context Links

- [deno.json] - version tracking
- [git status] - current changes
- [PROTOCOLS.md#commit-protocol] - legacy verbose format (reference only)

## Template Format

```
[type]: 🎯 [engaging description]

[technical details]
[context and impact]

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>
```
