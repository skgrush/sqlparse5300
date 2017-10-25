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
  function makeColumn(target: any, alias: string|null = null) {
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
  function makeRelation(target: any, alias: string|null = null) {
    return {
      "type": "relation",
      target,
      alias
    }
  }
  function makeConditional(operation: string, lhs: any, rhs: any = null, not: boolean = false) {
    return {
      "type": "conditional",
      operation,
      lhs,
      rhs,
      not
    }
  }

  function makeAggFunction(fname: string, expr: string) {
    return {
      "type": "function",
      fname,
      expr
    }
  }
}

start
  = Statements

Statements
  = _ lhs:Statement rhs:( _ ";" _ Statement )* _ ";"?
  { return rhs.reduce((result, element) => result.concat(element[3]), [lhs]) }

Statement
  = stmt:(
      Select
      / SelectUnion
    )
    { return stmt }

SelectUnion
  = lhs:Select __ "UNION"i __ all:( "ALL"i __ )? rhs:( Select / SelectUnion )
  { return [lhs, 'union', all && 'all', rhs] }

Select
  = "SELECT"i __ what:TargetClause __
    "FROM"i   __ from:FromClause
    where:(   __ "WHERE"i  __          WhereClause )?
    groupBy:( __ "GROUP"i  __ "BY"i __ GroupByClause )?
    having:(  __ "HAVING"i __          HavingClause )?
    orderBy:( __ "ORDER"i  __ "BY"i __ OrderByClause )?
  { return {
      "type": "selectclause",
      what,
      from,
      'where': where && where[2],
      'groupBy': groupBy && groupBy[5],
      'having': having && having[3],
      'orderBy': orderBy && orderBy[5]
    }
  }

TargetClause
  = spec:$( "DISTINCT"i __ / "ALL"i __ )?
    target:(
      "*"
      / TargetList
    )
  { return {
      'type': "targetclause",
      'specifier': spec || null,
      'targetlist': target
    }
  }

FromClause
  = from:RelationList

WhereClause
  = where:Condition

GroupByClause
  = groupBy:TargetList

HavingClause
  = having:Condition

OrderByClause
  = lhs:Ordering rhs:( _ "," _ Ordering )*
  { return rhs.reduce((result, element) => result.concat(element[3]), [lhs]) }

Ordering
  = expr:Operand
    cond:(
        __ "ASC"i { return 'asc' }
      / __ "DESC"i { return 'desc' }
      / __ "USING"i _ op:$( "<" / ">" ) { return op }
    )

RelationList
  = item1:RelationItem _ "," _ items:RelationList
    { return makeJoin(item1, items) }
    / Join
    / RelationItem

RelationItem "RelationItem"
  = item:RelationThing __ ( "AS"i __ )? alias:Name
  { return makeRelation(item, alias) }
  / RelationThing

RelationThing
  = "(" _ list:RelationList _ ")"
  { return list }
  / "(" _ join:Join _ ")"
  { return join }
  / tableName:Name
  { return makeRelation(tableName) }

Join
  = item1:RelationItem __
    jtype:JoinType __
    item2:RelationItem
    jcond:(
      __ "ON"i
      __ expr:Condition
      { return expr }
      / __ "USING"i
        "(" _ list:TargetList _ ")"
        { return ['using', list] }
    )?
  { return makeJoin(item1, item2, jtype, jcond) }

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

Condition "Condition"
  = lhs:AndCondition rhs:( __ "OR"i __ Condition )?
  { return rhs ? makeConditional('or', lhs, rhs[3]) : lhs }

AndCondition
  = lhs:InnerCondition rhs:( __ "AND"i __ AndCondition )?
  { return rhs ? makeConditional('and', lhs, rhs[3]) : lhs }

InnerCondition
  = (
    ConditionComp
    / ConditionIn
    / ConditionExists
    / ConditionLike
    / ConditionBetween
    / ConditionNull
    / Operand
  )
  / "NOT"i __ expr:Condition
  { return makeConditional('not', expr) }
  / "(" _ expr:Condition _ ")"
  { return expr }

ConditionComp
  = lhs:Operand _ cmp:Compare _ rhs:Operand
  { return makeConditional(cmp, lhs, rhs) }

ConditionIn
  = lhs_op:Operand __
    not:( "NOT"i __ )?
    "IN"i _
    "(" _
      rhs_ops:Operands
    ")"
  { return makeConditional('in', lhs_op, rhs_ops, not) }

ConditionExists
  = "EXISTS"i _
    "(" _ subquery:Select _ ")"
  { return makeConditional('exists', subquery) }

ConditionLike
  = lhs_op:Operand __
    not:( "NOT"i __ )?
    "LIKE"i __
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
  = lhs:Operand __ "IS"i __
    not:( "NOT"i __ )?
    NullLiteral
  { return makeConditional('isnull', lhs, null, not) }

Term
  = Literal
    / AggFunction
    / "(" _ Operand _ ")"
    / ColumnRef

ColumnRef
  = $( ( table:Name "." )? column:Name )

AggFunction "aggregate function"
  = AggFunctionAvg
    / AggFunctionCount
    / AggFunctionMax
    / AggFunctionMin
    / AggFunctionSum

AggFunctionAvg
  = "AVG"i _
    "(" _ term:Term _ ")"
  { return makeAggFunction("avg", term) }

AggFunctionCount
  = "COUNT"i _
    "(" _
      targ:TargetClause _
    ")"
  { return makeAggFunction("count", targ) }

AggFunctionMax
  = "MAX"i _
    "(" _
      term:Term _
    ")"
  { return makeAggFunction("max", term) }

AggFunctionMin
  = "MIN"i _
    "(" _
      term:Term _
    ")"
  { return makeAggFunction("min", term) }

AggFunctionSum
  = "SUM"i _
    "(" _
      term:Term _
    ")"
  { return makeAggFunction("sum", term) }

/***** PRIMITIVES *****/

Name
  = DQStringLiteral
    / BTStringLiteral
    / !ReservedWord id:Ident {return id }

Ident
  = $( [A-Za-z_][A-Za-z0-9_]* )

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
  / "LEFT"i __ ( "OUTER"i __ )? "JOIN"i
  { return "left" }
  / "RIGHT"i __ ( "OUTER"i __ )? "JOIN"i
  { return "right" }
  / "FULL"i __ ( "OUTER"i __ )? "JOIN"i
  { return "full" }

/***** LITERALS *****/

Literal "Literal"
  = SQStringLiteral
    / NumericLiteral
    / BooleanLiteral
    / NullLiteral

BTStringLiteral "backtick string"
  = $( '`' ( [^`] / '``' )+ '`' )

DQStringLiteral "double-quote string"
  = $( '"' ( [^"] / '""' )+ '"' )

SQStringLiteral "single-quote string"
  = $( "'" ( [^'] / "''" )* "'" !SQStringLiteral )

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

/** SQL2008 reserved words.
    In alphabetical order but not always lexical order,
      as there is no backtracking in PEG.js, e.g. for
        "IN" / "INT" / "INTERSECT" / "INTERSECTION"
      only "IN" is reachable.
 **/
ReservedWord
  = $("ABS"i / "ALL"i / "ALLOCATE"i / "ALTER"i / "AND"i / "ANY"i / "ARE"i / "ARRAY_AGG"i / "ARRAY"i / "ASENSITIVE"i / "ASYMMETRIC"i / "AS"i / "ATOMIC"i / "AT"i / "AUTHORIZATION"i / "AVG"i
      / "BEGIN"i / "BETWEEN"i / "BIGINT"i / "BINARY"i / "BLOB"i / "BOOLEAN"i / "BOTH"i / "BY"i
      / "CALLED"i / "CALL"i / "CARDINALITY"i / "CASCADED"i / "CASE"i / "CAST"i / "CEILING"i / "CEIL"i / "CHARACTER_LENGTH"i / "CHAR_LENGTH"i / "CHARACTER"i / "CHAR"i / "CHECK"i / "CLOB"i /
        "CLOSE"i / "COALESCE"i / "COLLATE"i / "COLLECT"i / "COLUMN"i / "COMMIT"i / "CONDITION"i / "CONNECT"i / "CONSTRAINT"i / "CONVERT"i / "CORRESPONDING"i / "CORR"i / "COUNT"i / "COVAR_POP"i /
        "COVAR_SAMP"i / "CREATE"i / "CROSS"i / "CUBE"i / "CUME_DIST"i / "CURRENT_CATALOG"i / "CURRENT_DATE"i / "CURRENT_DEFAULT_TRANSFORM_GROUP"i / "CURRENT_PATH"i / "CURRENT_ROLE"i /
        "CURRENT_SCHEMA"i / "CURRENT_TIMESTAMP"i / "CURRENT_TIME"i / "CURRENT_TRANSFORM_GROUP_FOR_TYPE"i / "CURRENT_USER"i / "CURRENT"i / "CURSOR"i / "CYCLE"i
      / "DATALINK"i / "DATE"i / "DAY"i / "DEALLOCATE"i / "DECIMAL"i / "DECLARE"i / "DEC"i / "DEFAULT"i / "DELETE"i / "DENSE_RANK"i / "DEREF"i / "DESCRIBE"i / "DETERMINISTIC"i / "DISCONNECT"i /
        "DISTINCT"i / "DLNEWCOPY"i / "DLPREVIOUSCOPY"i / "DLURLCOMPLETE"i / "DLURLCOMPLETEONLY"i / "DLURLCOMPLETEWRITE"i / "DLURLPATHONLY"i / "DLURLPATHWRITE"i / "DLURLPATH"i / "DLURLSCHEME"i /
        "DLURLSERVER"i / "DLVALUE"i / "DOUBLE"i / "DROP"i / "DYNAMIC"i
      / "EACH"i / "ELEMENT"i / "ELSE"i / "END-EXEC"i / "END"i / "ESCAPE"i / "EVERY"i / "EXCEPT"i / "EXECUTE"i / "EXEC"i / "EXISTS"i / "EXP"i / "EXTERNAL"i / "EXTRACT"i
      / "FALSE"i / "FETCH"i / "FILTER"i / "FIRST_VALUE"i / "FLOAT"i / "FLOOR"i / "FOREIGN"i / "FOR"i / "FREE"i / "FROM"i / "FULL"i / "FUNCTION"i / "FUSION"i
      / "GET"i / "GLOBAL"i / "GRANT"i / "GROUPING"i / "GROUP"i
      / "HAVING"i / "HOLD"i / "HOUR"i
      / "IDENTITY"i / "IMPORT"i / "INDICATOR"i / "INNER"i / "INOUT"i / "INSENSITIVE"i / "INSERT"i / "INTEGER"i / "INTERSECTION"i / "INTERSECT"i / "INTERVAL"i / "INTO"i / "INT"i / "IN"i / "IS"i
      / "JOIN"i
      / "LAG"i / "LANGUAGE"i / "LARGE"i / "LAST_VALUE"i / "LATERAL"i / "LEADING"i / "LEAD"i / "LEFT"i / "LIKE_REGEX"i / "LIKE"i / "LN"i / "LOCALTIMESTAMP"i / "LOCAL"i / "LOCALTIME"i / "LOWER"i
      / "MATCH"i / "MAX_CARDINALITY"i / "MAX"i / "MEMBER"i / "MERGE"i / "METHOD"i / "MINUTE"i / "MIN"i / "MODIFIES"i / "MODULE"i / "MOD"i / "MONTH"i / "MULTISET"i
      / "NATIONAL"i / "NATURAL"i / "NCHAR"i / "NCLOB"i / "NEW"i / "NONE"i / "NORMALIZE"i / "NOT"i / "NO"i / "NTH_VALUE"i / "NTILE"i / "NULLIF"i / "NULL"i / "NUMERIC"i
      / "OCCURRENCES_REGEX"i / "OCTET_LENGTH"i / "OFFSET"i / "OF"i / "OLD"i / "ONLY"i / "ON"i / "OPEN"i / "ORDER"i / "OR"i / "OUTER"i / "OUT"i / "OVERLAPS"i / "OVERLAY"i / "OVER"i
      / "PARAMETER"i / "PARTITION"i / "PERCENTILE_CONT"i / "PERCENTILE_DISC"i / "PERCENT_RANK"i / "POSITION_REGEX"i / "POSITION"i / "POWER"i / "PRECISION"i / "PREPARE"i / "PRIMARY"i / "PROCEDURE"i
      / "RANGE"i / "RANK"i / "READS"i / "REAL"i / "RECURSIVE"i / "REFERENCES"i / "REFERENCING"i / "REF"i / "REGR_AVGX"i / "REGR_AVGY"i / "REGR_COUNT"i / "REGR_INTERCEPT"i / "REGR_R2"i /
        "REGR_SLOPE"i / "REGR_SXX"i / "REGR_SXY"i / "REGR_SYY"i / "RELEASE"i / "RESULT"i / "RETURNS"i / "RETURN"i / "REVOKE"i / "RIGHT"i / "ROLLBACK"i / "ROLLUP"i / "ROWS"i / "ROW_NUMBER"i / "ROW"i
      / "SAVEPOINT"i / "SCOPE"i / "SCROLL"i / "SEARCH"i / "SECOND"i / "SELECT"i / "SENSITIVE"i / "SESSION_USER"i / "SET"i / "SIMILAR"i / "SMALLINT"i / "SOME"i / "SPECIFICTYPE"i / "SPECIFIC"i /
        "SQLEXCEPTION"i / "SQLSTATE"i / "SQLWARNING"i / "SQL"i / "SQRT"i / "START"i / "STATIC"i / "STDDEV_POP"i / "STDDEV_SAMP"i / "SUBMULTISET"i / "SUBSTRING_REGEX"i / "SUBSTRING"i / "SUM"i /
        "SYMMETRIC"i / "SYSTEM_USER"i / "SYSTEM"i
      / "TABLESAMPLE"i / "TABLE"i / "THEN"i / "TIMESTAMP"i / "TIMEZONE_HOUR"i / "TIMEZONE_MINUTE"i / "TIME"i / "TO"i / "TRAILING"i / "TRANSLATE_REGEX"i / "TRANSLATE"i / "TRANSLATION"i / "TREAT"i /
        "TRIGGER"i / "TRIM_ARRAY"i / "TRIM"i / "TRUE"i / "TRUNCATE"i
      / "UESCAPE"i / "UNION"i / "UNIQUE"i / "UNKNOWN"i / "UNNEST"i / "UPDATE"i / "UPPER"i / "USER"i / "USING"i
      / "VALUES"i / "VALUE"i / "VARBINARY"i / "VARCHAR"i / "VARYING"i / "VAR_POP"i / "VAR_SAMP"i
      / "WHENEVER"i / "WHEN"i / "WHERE"i / "WIDTH_BUCKET"i / "WINDOW"i / "WITHIN"i / "WITHOUT"i / "WITH"i
      / "XMLAGG"i / "XMLATTRIBUTES"i / "XMLBINARY"i / "XMLCAST"i / "XMLCOMMENT"i / "XMLCONCAT"i / "XMLDOCUMENT"i / "XMLELEMENT"i / "XMLEXISTS"i / "XMLFOREST"i / "XMLITERATE"i / "XMLNAMESPACES"i /
        "XMLPARSE"i / "XMLPI"i / "XMLQUERY"i / "XMLSERIALIZE"i / "XMLTABLE"i / "XMLTEXT"i / "XMLVALIDATE"i / "XML"i
      / "YEAR"i
  ) !Ident
