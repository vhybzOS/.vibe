/**
 * @file Pseudo-TypeScript Grammar - Hybrid algorithmic + native language
 * @author vibe
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'pseudo_typescript',

  rules: {
    source_file: $ => seq(
      optional($.shebang),
      repeat($._statement)
    ),

    shebang: $ => seq(
      '#!',
      '/grammars/',
      $.grammar_name,
      'parse'
    ),

    grammar_name: $ => /[a-z][a-z0-9-]*/,

    _statement: $ => choice(
      $.input_declaration,
      $.output_declaration,
      $.assignment,
      $.condition,
      $.loop,
      $.function_call,
      $.native_node,
      $.spawn_statement,
      $.query_statement,
      $.return_statement,
      $.comment
    ),

    input_declaration: $ => seq(
      'INPUT:',
      $.parameter_list
    ),

    output_declaration: $ => seq(
      'OUTPUT:',
      $.return_types
    ),

    parameter_list: $ => seq(
      $.identifier,
      ':',
      $.type_annotation,
      repeat(seq(',', $.identifier, ':', $.type_annotation))
    ),

    return_types: $ => choice(
      $.type_annotation,
      seq($.identifier, ':', $.type_annotation)
    ),

    assignment: $ => seq(
      $.identifier,
      '=',
      $._expression
    ),

    condition: $ => seq(
      'IF',
      $._expression,
      'THEN',
      repeat($._statement),
      optional(seq('ELSE', repeat($._statement))),
      'END'
    ),

    loop: $ => seq(
      'FOR',
      $.identifier,
      'IN',
      $._expression,
      'DO',
      repeat($._statement),
      'END'
    ),

    native_node: $ => seq(
      $.identifier,
      '=',
      'tsNode',
      $.number,
      optional(seq('//', $.typescript_code))
    ),

    spawn_statement: $ => seq(
      'spawn_subagent',
      '(',
      $.string_literal,
      ',',
      $._expression,
      ')'
    ),

    query_statement: $ => seq(
      'query_database',
      '(',
      $.identifier,
      ',',
      $.string_literal,
      ')'
    ),

    return_statement: $ => seq(
      'RETURN',
      $._expression
    ),

    function_call: $ => seq(
      $.identifier,
      '(',
      optional(seq($._expression, repeat(seq(',', $._expression)))),
      ')'
    ),

    _expression: $ => choice(
      $.identifier,
      $.property_access,
      $.number,
      $.string_literal,
      $.function_call,
      $.boolean,
      $.binary_expression
    ),

    property_access: $ => seq(
      $.identifier,
      repeat1(seq('.', $.identifier))
    ),

    binary_expression: $ => choice(
      prec.left(1, seq($._expression, '+', $._expression)),
      prec.left(1, seq($._expression, '-', $._expression)),
      prec.left(2, seq($._expression, '*', $._expression)),
      prec.left(2, seq($._expression, '/', $._expression)),
      prec.left(0, seq($._expression, '==', $._expression)),
      prec.left(0, seq($._expression, '!=', $._expression))
    ),

    type_annotation: $ => choice(
      'string',
      'number',
      'boolean',
      'any',
      $.identifier,
      seq($.identifier, '<', $.type_annotation, '>')
    ),

    typescript_code: $ => /[^\n]+/,

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => /\d+/,

    string_literal: $ => choice(
      seq('"', /[^"]*/, '"'),
      seq("'", /[^']*/, "'")
    ),

    boolean: $ => choice('true', 'false'),

    comment: $ => seq('#', /.*/)
  }
})