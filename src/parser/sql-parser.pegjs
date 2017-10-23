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
  function column(target: any, alias: string) {
    return {
      "type": "column",
      "target": target,
      "alias": alias
    }
  }
  function join(lhs: any, rhs: any, jointype: string = 'join', condition: any = null) {
    return {
      "type": "join",
      jointype,
      condition,
      lhs,
      rhs
    }
  }
  function relation(target: any, alias: string) {
    return {
      "type": "relation",
      target,
      alias
    }
  }
  function conditional(operation: string, lhs: any, rhs: any = null) {
    return {
      operation,
      lhs,
      rhs
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
    // ( "GROUP BY"i groupby:select_groupby ) ?
    // ( "ORDER BY"i orderby:select_orderby ) ?
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
    { return join(item1, items) }
    / item1:RelationItem __
      ( "NATURAL"i __ ) ?
      jtype:JoinType __
      items:RelationList
      jcond:(
        __ "ON"i
        __ expr:Expression
        { return expr }
        / __ "USING"i
          "(" _ TargetList _ ")"
          { return ['using', TargetList] }
      ) ?
      { return join(item1, items, jtype, jcond) }
    / item:RelationItem
    { return item }

RelationItem
  = table:Name alias:( __ ( "AS"i __ ) ? Name ) ?
    { return relation(table, alias[2] ) }

TargetClause
  = spec:$( "DISTINCT"i __ / "ALL"i __ ) ?
    target:(
      "*"
      / TargetList
    )
    { return { 'type': "targetlist", 'specifier': spec, 'target': target} }

TargetList
  = item1:TargetItem _ "," _ items:TargetList
    { return [item1].concat(items) }
    / item:TargetItem
    { return [item] }

TargetItem "TargetItem"
  = tableName:Name "." "*"
    { return column(`${tableName}.*`, null) }
    / term:Term alias:( __ ( "AS"i __ ) ? ColumnAlias ) ?
    { return column(term, alias && alias[2]) }

Expression
  = AndCondition ( __ "OR"i __ Expression ) ?

AndCondition
  = Condition ( __ "AND"i __ AndCondition ) ?

Condition
  = (
    Operand
    / ConditionComp
    / ConditionIn
    / ConditionLike
    / ConditionBetween
    / ConditionNull
  )
  / "NOT"i __ expr:Expression
    { return conditional('not', expr) }
  / "(" _ expr:Expression _ ")"
    { return conditional('()', expr) }

ConditionComp
  = lhs:Operand _ cmp:Compare _ rhs:Operand
    { return conditional(cmp, lhs, rhs) }

ConditionIn
  = lhs_op:Operand __
    not:( "NOT"i __ ) ?
    "IN" _
    "(" _
      rhs_ops:Operands
    ")"
    {
      const cond = conditional('in', lhs_op, rhs_ops)
      if (not)
        return conditional('not', cond)
      return cond
    }

ConditionLike
  = lhs_op:Operand __
    not:( "NOT"i __ ) ?
    "LIKE" __
    rhs_op:Operand
    {
      const cond = conditional('like', lhs_op, rhs_op)
      if (not)
        return conditional('not', cond)
      return cond
    }

ConditionBetween
  = lhs_op:Operand __
    not:( "NOT"i __ ) ?
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
    {
      const cond = conditional('between', lhs_op, rhs)
      if (not)
        return conditional('not', cond)
      return cond
    }

ConditionNull
  = lhs:Operand __ "IS" __
    not:( "NOT"i __ ) ?
    NullLiteral
    {
      const cond = conditional('isnull', lhs)
      if (not)
        return conditional('not', cond)
      return cond
    }

Term
  = Literal
    / Function
    / ( "(" _ Operand _ ")" )
    / ( ColumnRef )

ColumnRef
  = $( ( table:Name "." ) ? column:Name )

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
      ("DISTINCT" __ ) ?
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
  = Operand
    ( _ "," _ Operand ) *

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
