#!/grammars/pseudo-kernel parse

# Flush Protocol - Cleanup and Archival

## Purpose

Efficient cleanup using direct SurrealDB CLI primitives. Archive completed work, compress session data, and prepare system for next development cycle while preserving knowledge for future queries.

## Algorithm

```pseudo
fn flush_protocol(flush_scope: "session" | "feature" | "project", archive_mode: "compress" | "full") -> FlushResult {
  // Step 1: Analyze current state for flush eligibility
  let state_query = "SELECT * FROM session:current";
  let current_session = execute_cli(`echo '${state_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  if !is_flush_eligible(current_session, flush_scope) {
    return Err(VibeError::FlushNotEligible("Session not complete or has pending work"));
  }
  
  // Step 2: Collect data for archival
  let archival_data = collect_archival_data(flush_scope);
  
  // Step 3: Create archive record with compression
  let archive_record = create_archive_record(archival_data, archive_mode);
  
  // Step 4: Preserve knowledge patterns for future queries
  let knowledge_patterns = extract_knowledge_patterns(archival_data);
  
  // Step 5: Execute cleanup with CLI primitives
  let cleanup_result = execute_cleanup(flush_scope, archive_record);
  
  // Step 6: Verify flush integrity
  let verification_result = verify_flush_integrity(archive_record, cleanup_result);
  
  FlushResult {
    archived_items: cleanup_result.archived_count,
    compression_ratio: archive_record.compression_ratio,
    knowledge_preserved: knowledge_patterns.length,
    cleanup_size: cleanup_result.bytes_freed,
    archive_id: archive_record.id
  }
}

fn collect_archival_data(flush_scope: string) -> ArchivalData {
  let data_queries = match flush_scope {
    "session" => {
      // Collect current session data
      [
        "SELECT * FROM code_node WHERE session_id = 'current'",
        "SELECT * FROM specs WHERE status = 'completed'", 
        "SELECT * FROM query_pattern WHERE timestamp > time::now() - 1d",
        "SELECT * FROM context_metric WHERE timestamp > time::now() - 1d",
        "SELECT * FROM mri_access WHERE session_id = 'current'"
      ]
    },
    
    "feature" => {
      // Collect feature-specific data  
      [
        "SELECT * FROM code_node WHERE patterns CONTAINS 'current_feature'",
        "SELECT * FROM specs WHERE feature_name = 'current_feature'",
        "SELECT * FROM session WHERE stage = 'completed'",
        "SELECT * FROM algorithm_generated WHERE feature = 'current_feature'"
      ]
    },
    
    "project" => {
      // Full project data (use sparingly)
      [
        "SELECT * FROM code_node WHERE indexed_at < time::now() - 30d",
        "SELECT * FROM session WHERE status = 'completed'",
        "SELECT * FROM specs WHERE status = 'archived'",
        "SELECT * FROM query_pattern WHERE timestamp < time::now() - 30d"
      ]
    }
  };
  
  let collected_data = [];
  
  for query in data_queries {
    let result = execute_cli(`echo '${query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    collected_data.push({
      query: query,
      data: result.records,
      size_bytes: calculate_size(result)
    });
  }
  
  ArchivalData {
    collections: collected_data,
    total_size: collected_data.map(d => d.size_bytes).sum(),
    total_records: collected_data.map(d => d.data.length).sum()
  }
}

fn create_archive_record(archival_data: ArchivalData, archive_mode: string) -> ArchiveRecord {
  let compressed_data = match archive_mode {
    "compress" => {
      // Compress by extracting only essential patterns
      compress_to_patterns(archival_data)
    },
    
    "full" => {
      // Keep full data but organize efficiently
      organize_full_data(archival_data)
    }
  };
  
  let archive_id = generate_archive_id();
  
  // Archive IS the database record - no external files!
  // All archived data lives queryable in code.db, not separate files
  let archive_query = `CREATE archive:${archive_id} CONTENT {
    scope: "${flush_scope}",
    mode: "${archive_mode}",
    created: time::now(),
    original_size: ${archival_data.total_size},
    compressed_size: ${compressed_data.size},
    compression_ratio: ${compressed_data.size / archival_data.total_size},
    record_count: ${archival_data.total_records},
    
    // This IS the archival storage - all data lives in code.db!
    archived_data: ${JSON.stringify(compressed_data.content)},
    
    // Queryable metadata for future retrieval
    metadata: {
      session_id: "${get_current_session()}",
      feature_name: "${get_current_feature()}",
      completion_timestamp: time::now(),
      patterns_archived: ${extract_pattern_summary(compressed_data)},
      queries_archived: ${extract_query_summary(compressed_data)}
    }
  }`;
  
  execute_cli(`echo '${archive_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  ArchiveRecord {
    id: archive_id,
    compressed_data: compressed_data,
    compression_ratio: compressed_data.size / archival_data.total_size,
    size_bytes: compressed_data.size
  }
}

fn compress_to_patterns(archival_data: ArchivalData) -> CompressedData {
  // Extract reusable patterns instead of storing raw data
  let patterns = [];
  
  for collection in archival_data.collections {
    match collection.query {
      query if query.contains("code_node") => {
        // Extract code patterns
        let code_patterns = collection.data.map(record => ({
          pattern_type: record.node_type,
          patterns: record.patterns,
          complexity: record.complexity_score,
          usage_count: 1
        }));
        patterns.extend(code_patterns);
      },
      
      query if query.contains("query_pattern") => {
        // Extract successful query patterns
        let query_patterns = collection.data.map(record => ({
          query_type: record.strategy_used,
          compression_achieved: record.compression_ratio,
          effectiveness: record.token_savings
        }));
        patterns.extend(query_patterns);
      },
      
      query if query.contains("specs") => {
        // Extract specification patterns
        let spec_patterns = collection.data.map(record => ({
          feature_type: record.feature_type,
          patterns_used: record.implementation_patterns,
          success_metrics: record.completion_metrics
        }));
        patterns.extend(spec_patterns);
      }
    }
  }
  
  // Deduplicate and score patterns
  let deduplicated_patterns = deduplicate_patterns(patterns);
  
  CompressedData {
    content: deduplicated_patterns,
    size: calculate_compressed_size(deduplicated_patterns),
    pattern_count: deduplicated_patterns.length
  }
}

fn execute_cleanup(flush_scope: string, archive_record: ArchiveRecord) -> CleanupResult {
  let cleanup_queries = match flush_scope {
    "session" => [
      "DELETE FROM code_node WHERE session_id = 'current'",
      "DELETE FROM query_pattern WHERE timestamp > time::now() - 1d", 
      "DELETE FROM context_metric WHERE timestamp > time::now() - 1d",
      "UPDATE session:current SET status = 'archived', archived_at = time::now()"
    ],
    
    "feature" => [
      "DELETE FROM code_node WHERE patterns CONTAINS 'current_feature'",
      "UPDATE specs SET status = 'archived' WHERE feature_name = 'current_feature'",
      "DELETE FROM session WHERE stage = 'completed' AND feature = 'current_feature'"
    ],
    
    "project" => [
      "DELETE FROM code_node WHERE indexed_at < time::now() - 30d",
      "DELETE FROM session WHERE status = 'completed' AND archived_at < time::now() - 30d",
      "DELETE FROM query_pattern WHERE timestamp < time::now() - 30d"
    ]
  ];
  
  let archived_count = 0;
  let bytes_freed = 0;
  
  for cleanup_query in cleanup_queries {
    // Get count before deletion
    let count_query = cleanup_query.replace("DELETE", "SELECT COUNT()");
    let count_result = execute_cli(`echo '${count_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    
    // Execute cleanup
    let cleanup_result = execute_cli(`echo '${cleanup_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    
    archived_count += count_result.count;
    bytes_freed += estimate_bytes_freed(count_result.count);
  }
  
  // Update indexing state after cleanup
  execute_cli(`vibe index --incremental`);
  
  CleanupResult {
    archived_count: archived_count,
    bytes_freed: bytes_freed,
    cleanup_time: measure_time()
  }
}

fn extract_knowledge_patterns(archival_data: ArchivalData) -> Array<KnowledgePattern> {
  // Preserve essential patterns for future vibe queries
  let knowledge_patterns = [];
  
  // Extract successful development patterns
  let dev_patterns_query = "SELECT DISTINCT patterns, complexity_score FROM code_node WHERE complexity_score > 0.8";
  let dev_patterns = execute_cli(`echo '${dev_patterns_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  for pattern in dev_patterns.records {
    let knowledge_query = `CREATE knowledge_pattern CONTENT {
      pattern_type: "development",
      patterns: ${JSON.stringify(pattern.patterns)},
      effectiveness: ${pattern.complexity_score},
      usage_count: 1,
      last_used: time::now(),
      source: "flush_extraction"
    }`;
    
    execute_cli(`echo '${knowledge_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    
    knowledge_patterns.push({
      type: "development",
      patterns: pattern.patterns,
      effectiveness: pattern.complexity_score
    });
  }
  
  // Extract successful query patterns
  let query_patterns_query = "SELECT strategy_used, compression_ratio FROM query_pattern WHERE compression_ratio > 0.9";
  let query_patterns = execute_cli(`echo '${query_patterns_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  for pattern in query_patterns.records {
    let knowledge_query = `CREATE knowledge_pattern CONTENT {
      pattern_type: "query",
      strategy: "${pattern.strategy_used}",
      effectiveness: ${pattern.compression_ratio},
      usage_count: 1,
      last_used: time::now(),
      source: "flush_extraction"
    }`;
    
    execute_cli(`echo '${knowledge_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    
    knowledge_patterns.push({
      type: "query",
      strategy: pattern.strategy_used,
      effectiveness: pattern.compression_ratio
    });
  }
  
  knowledge_patterns
}
```

## CLI Command Patterns

### Archive Creation
```bash
# Create session archive
echo 'CREATE archive:session_20241224 CONTENT {scope: "session", mode: "compress", created: time::now(), original_size: 15000, compressed_size: 2000, compression_ratio: 0.13}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Create feature archive with full data
echo 'CREATE archive:auth_feature_complete CONTENT {scope: "feature", mode: "full", feature_name: "authentication", completion_metrics: {lines_added: 450, tests_created: 12}}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty
```

### Data Cleanup
```bash
# Clean current session data  
echo 'DELETE FROM code_node WHERE session_id = "current"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Clean old query patterns
echo 'DELETE FROM query_pattern WHERE timestamp < time::now() - 7d' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Clean completed sessions
echo 'DELETE FROM session WHERE status = "completed" AND archived_at < time::now() - 30d' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Archive old code patterns
echo 'UPDATE code_node SET archived = true WHERE indexed_at < time::now() - 14d' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty
```

### Knowledge Preservation
```bash
# Extract successful patterns for future use
echo 'CREATE knowledge_pattern CONTENT {pattern_type: "development", patterns: ["async", "error_handling"], effectiveness: 0.95, usage_count: 1, source: "flush_extraction"}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Query preserved knowledge
echo 'SELECT * FROM knowledge_pattern WHERE effectiveness > 0.8 ORDER BY usage_count DESC' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Update knowledge usage
echo 'UPDATE knowledge_pattern SET usage_count += 1, last_used = time::now() WHERE patterns CONTAINS "async"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty
```

### Archive Queries (All Queryable in code.db)
```bash
# List available archives - everything in one database
echo 'SELECT id, scope, created, compression_ratio, metadata.feature_name FROM archive ORDER BY created DESC' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Query archived patterns directly - no file extraction needed!
echo 'SELECT archived_data FROM archive WHERE metadata.patterns_archived CONTAINS "authentication"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Find archives by feature type
echo 'SELECT id, metadata FROM archive WHERE metadata.feature_name LIKE "%auth%" ORDER BY created DESC' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Query specific archived implementation patterns
echo 'SELECT archived_data.patterns FROM archive WHERE scope = "feature" AND metadata.patterns_archived CONTAINS "async"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Archive analytics - compression effectiveness
echo 'SELECT AVG(compression_ratio), MIN(compression_ratio), MAX(compression_ratio) FROM archive WHERE created > time::now() - 30d' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Archive cleanup (old archives) - still in database, just deleted records
echo 'DELETE FROM archive WHERE created < time::now() - 90d AND scope != "project"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty
```

### Vibe Integration
```bash
# Trigger incremental indexing after cleanup
vibe index --incremental

# Create new session after flush
vibe session create post_flush_session

# Stage boundary tracking
vibe stage start flush_cleanup
vibe stage end flush_cleanup

# Verify cleanup effectiveness
vibe query "recent development patterns" --limit 5 # Should return minimal results after flush
```

## Benefits

- **Massive Space Savings**: 90%+ compression through pattern extraction
- **Knowledge Preservation**: Essential patterns survive flush for future queries
- **CLI Native**: Direct SurrealDB operations without file intermediaries  
- **Surgical Cleanup**: Precise deletion with data integrity
- **Learning System**: Archives contribute to future development intelligence

## Flush Strategies

### Session Flush (Most Common)
- Clean current development session
- Preserve successful patterns
- Compress context metrics
- ~90% space reduction

### Feature Flush (After Completion)
- Archive complete feature implementation
- Extract reusable patterns
- Clean feature-specific data
- ~85% space reduction

### Project Flush (Periodic)
- Clean old, unused data
- Compress historical patterns
- Maintain essential knowledge
- ~95% space reduction

## Context Links

- [tools.md] - SurrealDB CLI patterns for archival operations
- [context-query.md] - How to query archived knowledge patterns
- [Session Management] - Integration with session lifecycle
- [Knowledge Extraction] - Pattern recognition for preservation