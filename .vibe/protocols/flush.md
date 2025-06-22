# Flush Protocol

## Algorithm

```pseudo
INPUT: completed_feature, current_session
completed_details = vibe scan .vibe/active/ --type completion_markers
architecture_summary = vibe compress completed_details --format architecture

IF has_user_facing_value(completed_feature) THEN
  user_benefits = vibe compress completed_feature --format user_benefits
  changelog_entry = template_changelog(user_benefits)
  vibe parse CHANGELOG.md --append changelog_entry
END

features_entry = template_features(architecture_summary, completed_details)
timestamp = vibe measure --current_date
archive_path = ".vibe/archive/features/" + timestamp + "_" + feature_name + ".md"
write_to(archive_path, features_entry)

clean_active = vibe diff .vibe/active/context.md completed_feature --remove_completed
write_to(.vibe/active/context.md, clean_active)

session_state = vibe compress current_session --format session_summary  
session_path = ".vibe/archive/sessions/" + timestamp + "_session.md"
write_to(session_path, session_state)

OUTPUT: archived_feature, clean_active_state, session_archived
```

## Context Links

- [.vibe/active/context.md] - current working memory to clean
- [.vibe/archive/features/] - completed work storage
- [CHANGELOG.md] - user-facing change log
- [.vibe/archive/sessions/] - session history storage

## Trigger Conditions

- All acceptance criteria met AND quality gates passed
- Agent assessment: "COMPLETE and PRODUCTION READY"
- Exit criteria achieved for current 8-step cycle
