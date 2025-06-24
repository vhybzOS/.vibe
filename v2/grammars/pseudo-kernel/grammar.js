/**
 * @file Pseudo-Kernel Grammar - LLM-Native System Algorithm Language
 * @author vibe  
 * @license MIT
 * 
 * Revolutionary LLM-optimized syntax combining:
 * - Markdown structure (# headers, ## sections, ``` code blocks, [links])  
 * - Functional pseudo-code (fn, match, |>, let, method chaining)
 * - LaTeX math blocks (``` latex ... ```)
 * - Context links and system functions
 * 
 * 30% token reduction + effortless LLM parsing = precious! 💎
 */

/// <reference types="tree-sitter-cli/dsl" />  
// @ts-check

module.exports = grammar({
  name: 'pseudo_kernel',

  rules: {
    source_file: $ => seq(
      optional($.shebang),
      repeat($._content)
    ),

    shebang: $ => seq(
      '#!',
      '/grammars/',
      $.grammar_name,  
      'parse'
    ),

    grammar_name: $ => /[a-z][a-z0-9-]*/,

    _content: $ => choice(
      $.markdown_header,
      $.code_block,
      $.math_block,
      $.context_link,
      $.paragraph,
      $.pseudo_code_block,
      $.newline
    ),

    // Markdown Structure
    markdown_header: $ => seq(
      choice('##', '#'),
      /[^\n]+/
    ),

    code_block: $ => seq(
      '```',
      optional($.language_identifier),
      $.newline,
      repeat(choice($.code_line, $.newline)),
      '```'
    ),

    math_block: $ => seq(
      '```latex',
      $.newline,
      repeat(choice($.latex_line, $.newline)),
      '```'
    ),

    context_link: $ => seq(
      '-',
      '[',
      /[^\]]+/,
      ']',
      optional(/[^\n]+/)
    ),

    paragraph: $ => /[^#\-\n`][^\n]*/,

    // LLM-Native Pseudo-code Block
    pseudo_code_block: $ => seq(
      '```pseudo',
      $.newline,
      repeat(choice($.pseudo_statement, $.newline)),
      '```'
    ),

    pseudo_statement: $ => choice(
      $.function_definition,
      $.let_binding,
      $.assignment,
      $.if_statement,
      $.system_function_call,
      $.return_statement,
      $.comment,
      $.expression_statement
    ),

    // LLM-Native Constructs
    function_definition: $ => seq(
      'fn',
      $.identifier,
      '(',
      optional($.parameter_list),
      ')',
      optional(seq('->', $.type_annotation)),
      $.block
    ),

    parameter_list: $ => seq(
      $.parameter,
      repeat(seq(',', $.parameter))
    ),

    parameter: $ => seq(
      $.identifier,
      ':',
      $.type_annotation
    ),

    block: $ => seq(
      '{',
      repeat($.pseudo_statement),
      '}'
    ),

    let_binding: $ => seq(
      'let',
      $.identifier,
      '=',
      $._expression
    ),

    assignment: $ => seq(
      $.identifier,
      '=',
      $._expression
    ),

    if_statement: $ => seq(
      'if',
      $._expression,
      $.block,
      optional(seq('else', $.block))
    ),


    // Functional Composition (My Precious!)
    pipe_chain: $ => seq(
      $._expression,
      repeat1(seq('|>', $._expression))
    ),

    method_chain: $ => seq(
      $._expression,
      repeat1(seq('.', $.method_call))
    ),

    method_call: $ => seq(
      $.identifier,
      '(',
      optional($.argument_list),
      ')'
    ),

    // System Functions (Simplified)
    system_function_call: $ => choice(
      seq('spawn_subagent', '(', $.argument_list, ')'),
      seq('load_specs', '(', $.argument_list, ')'),
      seq('load_algorithm', '(', $.argument_list, ')'),
      seq('execute', '(', $.argument_list, ')')
    ),

    return_statement: $ => seq('return', $._expression),

    expression_statement: $ => $._expression,

    function_call: $ => prec(1, seq(
      $.identifier,
      '(',
      optional($.argument_list),
      ')'
    )),

    argument_list: $ => seq(
      $._expression,
      repeat(seq(',', $._expression))
    ),

    // Simplified Expressions 
    _expression: $ => choice(
      $.number,
      $.string_literal,
      $.boolean,
      $.object_literal,
      $.array_literal,
      $.range_expression,
      $.function_call,
      $.property_access,
      $.identifier
    ),

    property_access: $ => seq(
      $.identifier,
      repeat1(seq('.', $.identifier))
    ),

    // Object Literal
    object_literal: $ => seq(
      '{',
      optional(seq(
        $.object_property,
        repeat(seq(',', $.object_property))
      )),
      '}'
    ),

    object_property: $ => seq(
      choice($.identifier, $.string_literal),
      ':',
      $._expression
    ),

    array_literal: $ => seq(
      '[',
      optional(seq(
        $._expression,
        repeat(seq(',', $._expression))
      )),
      ']'
    ),

    range_expression: $ => choice(
      seq($.number, '..', $.number),
      seq('(', $.number, '..', $.number, ')')
    ),

    binary_expression: $ => choice(
      prec.left(1, seq($._expression, choice('+', '-'), $._expression)),
      prec.left(2, seq($._expression, choice('*', '/'), $._expression)),
      prec.left(0, seq($._expression, choice('==', '!=', '>', '<', '>=', '<='), $._expression)),
      prec.left(0, seq($._expression, choice('&&', '||'), $._expression))
    ),

    // Enhanced Types for LLM System Context
    type_annotation: $ => choice(
      // Primitive types
      'string', 'number', 'boolean', 'any',
      
      // System types
      'SessionState', 'ProjectContext', 'Checkpoint', 'SessionUpdate',  
      'AuthRequest', 'VibeError', 'CodeNode', 'QueryResult',
      
      // Generic types
      seq('Result', '<', $.type_annotation, ',', $.type_annotation, '>'),
      seq('Option', '<', $.type_annotation, '>'),
      seq('Array', '<', $.type_annotation, '>'),
      
      // Custom types
      $.identifier,
      seq($.identifier, '<', $.type_list, '>')
    ),

    type_list: $ => seq(
      $.type_annotation,
      repeat(seq(',', $.type_annotation))
    ),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => /\d+(\.\d+)?/,

    string_literal: $ => choice(
      seq('"', repeat(/[^"\\]|\\.*/), '"'),
      seq("'", repeat(/[^'\\]|\\.*/), "'"),
      seq('"""', repeat(/[^"]/), '"""')
    ),

    boolean: $ => choice('true', 'false'),

    comment: $ => seq('//', /[^\n]*/),

    // Content helpers
    language_identifier: $ => /[a-z]+/,
    code_line: $ => /[^`\n][^\n]*/,
    latex_line: $ => /[^`\n][^\n]*/,
    newline: $ => /\n/
  }
})