/*
  Initially based on grammar of the "Phoenix" SQL layer
    (https://forcedotcom.github.io/phoenix/index.html)

  Revised based on PostgreSql grammar:
    https://www.postgresql.org/docs/9/static/sql-syntax.html
    https://www.postgresql.org/docs/9/static/sql-select.html
    https://github.com/postgres/postgres/blob/master/src/backend/parser/gram.y
*/

// initializer
{
  function makeColumn(target: any, alias: string) {
    return {
      "type": "column",
      "target": target,
      "alias": alias
    }
  }
  function makeJoin(lhs: any, rhs: any, joinType: string = 'join', condition: any = null) {
    /* jointypes:
        join: "," "JOIN" "CROSS JOIN"
        equi: "INNER JOIN" "JOIN ... USING"
        natural: "NATURAL JOIN"
        leftouter: "LEFT [OUTER] JOIN"
        rightouter: "RIGHT [OUTER] JOIN"
        fullouter: "FULL [OUTER] JOIN"
     */
    return {
      "type": "join",
      joinType,
      condition,
      lhs,
      rhs
    }
  }
  function makeRelation(target: any, alias: string) {
    return {
      "type": "relation",
      target,
      alias
    }
  }
  function makeConditional(operation: string, lhs: any, rhs: any = null, not: boolean = false) {
    return {
      operation,
      lhs,
      rhs,
      not
    }
  }
}

start
  = Select

// https://github.com/postgres/postgres/blob/master/src/backend/parser/gram.y#L10921
Select
  = "SELECT"i __ what:TargetClause __
    "FROM"i   __ from:FromClause __
    where:( "WHERE"i __ Expression __ )?
    // ( "GROUP BY"i groupby:select_groupby )?
    // ( "ORDER BY"i orderby:select_orderby )?
  { return { what, from, 'where': where[2] } }

FromClause
  = from:RelationList
    { return {
        "type": "fromclause",
        "from": from
      }
    }

RelationList
  = item1:RelationItem _ "," _ items:RelationList
    { return makeJoin(item1, items) }
    / Join
    / item

RelationItem
  = "(" _ list:RelationList _ ")"
  { return list }
  / "(" _ join:Join _ ")"
  { return join }
  / item:RelationItem alias:( __ ( "AS"i __ )? Name )?
  { return makeRelation(item, alias[2]) }

Join
  = item1:RelationItem __
    jtype:JoinType __
    item2:RelationItem
    jcond:(
      __ "ON"i
      __ expr:Expression
      { return expr }
      / __ "USING"i
        "(" _ TargetList _ ")"
        { return ['using', TargetList] }
    )?
  { return makeJoin(item1, item2, jtype, jcond) }

TargetClause
  = spec:$( "DISTINCT"i __ / "ALL"i __ )?
    target:(
      "*"
      / TargetList
    )
  { return { 'type': "targetclause", 'specifier': spec, 'targetlist': target} }

TargetList
  = item1:TargetItem _ "," _ items:TargetList
    { return [item1].concat(items) }
    / item:TargetItem
    { return [item] }

TargetItem "TargetItem"
  = tableName:Name ".*"
  { return makeColumn(`${tableName}.*`, null) }
  / term:Term alias:( __ ( "AS"i __ )? ColumnAlias )?
  { return makeColumn(term, alias && alias[2]) }

Expression
  = lhs:AndCondition rhs:( __ "OR"i __ Expression )?
  { return rhs ? makeConditional('or', lhs, rhs[3]) : lhs }

AndCondition
  = lhs:Condition ( __ "AND"i __ rhs:AndCondition )?
  { return rhs ? makeConditional('and', lhs, rhs[3]) : lhs }

Condition
  / (
    Operand
    / ConditionComp
    / ConditionIn
    / ConditionLike
    / ConditionBetween
    / ConditionNull
  )
  / "NOT"i __ expr:Expression
  { return makeConditional('not', expr) }
  / "(" _ expr:Expression _ ")"
  { return expr }

ConditionComp
  = lhs:Operand _ cmp:Compare _ rhs:Operand
  { return makeConditional(cmp, lhs, rhs) }

ConditionIn
  = lhs_op:Operand __
    not:( "NOT"i __ )?
    "IN" _
    "(" _
      rhs_ops:Operands
    ")"
  { return makeConditional('in', lhs_op, rhs_ops, not) }

ConditionLike
  = lhs_op:Operand __
    not:( "NOT"i __ )?
    "LIKE" __
    rhs_op:Operand
  { return makeConditional('like', lhs_op, rhs_op, not) }

ConditionBetween
  = lhs_op:Operand __
    not:( "NOT"i __ )?
    "BETWEEN"i
    rhs:(
      __
      rhs_op1:Operand __
      "AND"i __
      rhs_op2:Operand
      { return [rhs_op1, rhs_op2] }
      / _
        "(" _
          rhs_op1:Operand __
          "AND"i __
          rhs_op2:Operand
        ")"
        { return [rhs_op1, rhs_op2] }
    )
  { return makeConditional('between', lhs_op, rhs, not) }

ConditionNull
  = lhs:Operand __ "IS" __
    not:( "NOT"i __ )?
    NullLiteral
  { return makeConditional('isnull', lhs, null, not) }

Term
  = Literal
    / Function
    / ( "(" _ Operand _ ")" )
    / ( ColumnRef )

ColumnRef
  = $( ( table:Name "." )? column:Name )

TableName
  = Name

ColumnAlias
  = Name

Function "function"
  = FunctionAvg
    / FunctionCount
    / FunctionMax
    / FunctionMin
    / FunctionSum

FunctionAvg
  = "AVG"i _
    "(" _ Term _ ")"

FunctionCount
  = "COUNT"i _
    "(" _
      ("DISTINCT" __ )?
      ( "*" / Term ) _
    ")"

FunctionMax
  = "MAX"i _
    "(" _
      Term _
    ")"

FunctionMin
  = "MIN"i _
    "(" _
      Term _
    ")"

FunctionSum
  = "SUM"i _
    "(" _
      Term _
    ")"

/***** PRIMITIVES *****/

Name
  = $( [A-Za-z_][A-Za-z0-9_]* )
    / StringLiteral
    / $( "`" [A-Za-z_][A-Za-z0-9_]* "`" )

Operands
  = lhs:Operand
    rhs:( _ "," _ Operand )*
  { return rhs.reduce((result, element) => result.concat(element[3]), [lhs]) }

Operand
  = Summand
    ( _ "||" _ Summand ) *

Summand
  = Factor
    ( _ ("+" / "-") _ Factor ) *

Factor
  = Term
    ( _ ("*" / "/") _ Term ) *

Compare
  = "<>"
    / "<="
    / ">="
    / "="
    / "<"
    / ">"
    / "!="



JoinType "JoinType"
  = ( "CROSS"i __ )? "JOIN"i
  { return "join" }
  / "INNER"i __ "JOIN"i
  { return "equi" }
  / "NATURAL"i __ "JOIN"i
  { return "natural" }
  / "LEFT"i __ ( "OUTER" __ )? "JOIN"
  { return "left" }
  / "RIGHT"i __ ( "OUTER" __ )? "JOIN"
  { return "right" }
  / "FULL"i __ ( "OUTER" __ )? "JOIN"
  { return "full" }

/***** LITERALS *****/

Literal "Literal"
  = StringLiteral
    / NumericLiteral
    / BooleanLiteral
    / NullLiteral

StringLiteral "string"
  = $( "\"" [^\"]+ "\"" )

ExponentialLiteral "exponential"
  = val:$( NumericLiteral "e" IntegerLiteral )
  { return parseFloat(val) }

NumericLiteral "number"
  = IntegerLiteral
    / DecimalLiteral

IntegerLiteral "integer"
  = int:$( "-"? [0-9]+ )
  { return parseInt(int) }

DecimalLiteral "decimal"
  = value:$( "-"? [0-9]+ "." [0-9]+ )
  { return parseFloat(value) }

NullLiteral "null"
  = "NULL"i

BooleanLiteral "boolean"
  = TruePrim
    / FalsePrim

TruePrim
  = "TRUE"i

FalsePrim
  = "FALSE"i

_ "OptionalWhitespace"
  = WS* Comment? WS* {}

__ "RequiredWhitespace"
  = WS+ Comment? WS* {}
    / WS* Comment? WS+ {}

WS
  = [ \t\n]

Comment "Comment"
  = "/*" ( !"*/" . )* "*/"   {}
    / "--" ( !"\n" . )* "\n" {}
