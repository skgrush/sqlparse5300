/*
  Primarily based on grammar of the "Phoenix" SQL layer
    (https://forcedotcom.github.io/phoenix/index.html)
*/

start
  = select

select "select"
  = "SELECT"i fields:select_what
    "FROM"i   relations:select_from
    // ( "GROUP BY"i groupby:select_groupby ) ?
    // ( "ORDER BY"i orderby:select_orderby ) ?

select_what
  = spec:( "DISTINCT" / "ALL" ) ?
    what:(
      "*"
      / select_expressions
    )

select_expressions
  = select_expression
    / expr1:select_expression "," exprN:select_expressions { return expr1.concat(exprN) }

select_expression
  = ( table_name "." "*" )
    / (
        term
        ( "AS"i ? column_alias ) ?
      )

select_from
  = relation_expressions
    ( "WHERE"i expression ) ?

relation_expressions
  = relation_expression
    / expr1:relation_expression "," exprN:relation_expressions { return expr1.concat(exprN) }

relation_expression
  = table_name ( "AS"i ? name ) ?

expression
  = and_condition
    (
      "OR"i and_condition
    ) *

and_condition
  = condition
    (
      "AND"i condition
    ) *

condition
  = (
    operand
    / condition_comp
    / condition_in
    / condition_like
    / condition_between
    / condition_null
  )
  / ( "NOT"i expression )
  / ( "(" expression ")" )

condition_comp
  = operand compare operand

condition_in
  = operand
    "NOT"i ?
    "IN"
    "("
      constant_operand ( "," constant_operand ) *
    ")"

condition_like
  = operand
    "NOT"i ?
    "LIKE"
    operand

condition_between
  = operand
    "NOT"i ?
    "BETWEEN"i operand "AND"i operand

condition_null
  = operand "IS"
    "NOT"i ?
    null_literal

constant_operand
  = operand


term
  = literal
    / function
    / ( "(" operand ")" )
    / ( column_ref )

column_ref
  = ( table_name "." ) ? name

table_name
  = name

column_alias
  = name

function "function"
  = function_avg
    / function_count
    / function_max
    / function_min
    / function_sum

function_avg
  = "AVG"i
    "(" term ")"

function_count
  = "COUNT"i
    "("
      "DISTINCT" ?
      ( "*" / term )
    ")"

function_max
  = "MAX"i
    "(" term ")"

function_min
  = "MIN"i
    "(" term ")"

function_sum
  = "SUM"i
    "(" term ")"

/***** PRIMITIVES *****/

name
  = ( [A-Za-z_] [A-Za-z0-9_]* )
    / string_literal

operand
  = summand
    ( "||" summand ) *

summand
  = factor
    ( ("+" / "-") factor ) *

factor
  = term
    ( ("*" / "/") term ) *

compare
  = "<>"
    / "<="
    / ">="
    / "="
    / "<"
    / ">"
    / "!="

/***** LITERALS *****/

literal "literal"
  = string_literal
    / numeric_literal
    / boolean_literal
    / null_literal

string_literal "string"
  = "\"" [^\"]+ "\""

numeric_literal "number"
  = integer_literal
    / decimal_literal

integer_literal "integer"
  = int:( "-"? [0-9]+ )
  {
    return parseInt(int)
  }

decimal_literal "decimal"
  = value:( "-"? [0-9]+ "." [0-9]+ )
  {
    return parseFloat(value)
  }

null_literal "null"
  = "NULL"i

boolean_literal "boolean"
  = true_prim
    / false_prim

true_prim
  = "TRUE"i

false_prim
  = "FALSE"i
