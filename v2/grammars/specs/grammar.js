/**
 * @file Specifications Grammar - Structured requirement files
 * @author vibe
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'specs',

  rules: {
    source_file: $ => seq(
      optional($.shebang),
      repeat($._section)
    ),

    shebang: $ => seq(
      '#!',
      '/grammars/',
      $.grammar_name,
      'parse'
    ),

    grammar_name: $ => /[a-z][a-z0-9-]*/,

    _section: $ => choice(
      $.feature_section,
      $.intent_section,
      $.inputs_section,
      $.outputs_section,
      $.examples_section,
      $.constraints_section,
      $.invariants_section,
      $.comment
    ),

    feature_section: $ => seq(
      '#',
      'Feature:',
      $.feature_name
    ),

    intent_section: $ => seq(
      '##',
      'Intent',
      $.intent_declaration
    ),

    inputs_section: $ => seq(
      '##',
      'Inputs',
      repeat($.input_spec)
    ),

    outputs_section: $ => seq(
      '##',
      'Outputs',
      repeat($.output_spec)
    ),

    examples_section: $ => seq(
      '##',
      'Examples',
      repeat($.example_spec)
    ),

    constraints_section: $ => seq(
      '##',
      'Constraints',
      repeat($.constraint_spec)
    ),

    invariants_section: $ => seq(
      '##',
      'Invariants',
      repeat($.invariant_spec)
    ),

    intent_declaration: $ => seq(
      $.action_verb,
      $.subject,
      'WITH',
      $.parameters,
      'RETURNING',
      $.return_type
    ),

    input_spec: $ => seq(
      $.identifier,
      ':',
      $.type_specification
    ),

    output_spec: $ => choice(
      seq('SUCCESS:', field('name', $.identifier), ':', field('type', $.type_specification)),
      seq('FAILURE:', field('name', $.identifier), '=', field('errors', $.error_types))
    ),

    example_spec: $ => seq(
      $.function_call,
      '→',
      $.expected_result
    ),

    constraint_spec: $ => $._constraint_expression,

    invariant_spec: $ => seq(
      $._logical_expression,
      '⟺',
      $._logical_expression
    ),

    _constraint_expression: $ => choice(
      $.comparison,
      $.range_constraint,
      $.format_constraint
    ),

    comparison: $ => seq(
      $.property_access,
      $.comparison_operator,
      $.value
    ),

    range_constraint: $ => seq(
      $.property_access,
      'IN',
      $.range
    ),

    format_constraint: $ => seq(
      $.property_access,
      'MATCHES',
      $.pattern
    ),

    _logical_expression: $ => choice(
      $.function_call,
      $.property_access,
      $.boolean_literal
    ),

    function_call: $ => seq(
      $.identifier,
      '(',
      optional(seq($.argument, repeat(seq(',', $.argument)))),
      ')'
    ),

    property_access: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier))
    ),

    type_specification: $ => choice(
      $.primitive_type,
      $.object_type,
      $.array_type,
      $.union_type,
      $.generic_type
    ),

    primitive_type: $ => choice('string', 'number', 'boolean'),

    object_type: $ => seq(
      '{',
      optional(seq($.property_type, repeat(seq(',', $.property_type)))),
      '}'
    ),

    property_type: $ => seq(
      $.identifier,
      ':',
      $.type_specification
    ),

    array_type: $ => prec(2, seq(
      $.type_specification,
      '[',
      ']'
    )),

    union_type: $ => prec.left(1, seq(
      $.type_specification,
      '|',
      $.type_specification
    )),

    generic_type: $ => seq(
      $.identifier,
      '<',
      $.type_specification,
      '>'
    ),

    error_types: $ => seq(
      $.identifier,
      repeat(seq('|', $.identifier))
    ),

    range: $ => choice(
      seq($.number, '..', $.number),
      seq('[', $.value, ',', $.value, ']')
    ),

    pattern: $ => seq('/', /[^\/]+/, '/'),

    comparison_operator: $ => choice('>=', '<=', '>', '<', '==', '!='),

    action_verb: $ => /[A-Z][A-Z_]*/,

    subject: $ => $.identifier,

    parameters: $ => $.identifier,

    return_type: $ => $.identifier,

    argument: $ => choice(
      $.identifier,
      $.string_literal,
      $.number,
      $.object_literal
    ),

    object_literal: $ => seq(
      '{',
      optional(seq($.property_assignment, repeat(seq(',', $.property_assignment)))),
      '}'
    ),

    property_assignment: $ => seq(
      $.identifier,
      ':',
      $.value
    ),

    value: $ => choice(
      $.identifier,
      $.string_literal,
      $.number,
      $.boolean_literal
    ),

    expected_result: $ => choice(
      $.string_literal,
      $.identifier,
      $.error_result
    ),

    error_result: $ => seq(
      'Error:',
      $.identifier
    ),

    feature_name: $ => /[^\n]+/,

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => /\d+/,

    string_literal: $ => choice(
      seq('"', /[^"]*/, '"'),
      seq("'", /[^']*/, "'")
    ),

    boolean_literal: $ => choice('true', 'false'),

    comment: $ => seq(/#+/, /.*/)
  }
})