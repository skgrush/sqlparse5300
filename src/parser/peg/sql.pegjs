/*
  Initially inspired by grammar of the "Phoenix" SQL layer
    (https://forcedotcom.github.io/phoenix/index.html)

  Primarily based on PostgreSql syntax:
    https://www.postgresql.org/docs/9/static/sql-syntax.html
    https://www.postgresql.org/docs/9/static/sql-select.html
    https://github.com/postgres/postgres/blob/master/src/backend/parser/gram.y
*/

start
  = Statements

Statements
  = _ lhs:Statement rhs:( _ ";" _ Statement )* _ ";"?
  { return rhs.reduce((result, element) => result.concat(element[3]), [lhs]) }

Statement
  = Selectish

Selectish
  = SelectPair
  / Select


SelectPair
  = lhs:Select __
    pairing:$( "UNION"i / "INTERSECT"i / "EXCEPT"i ) __
    spec:( "ALL"i __ / "DISTINCT"i __ )?
    rhs:( Selectish )
  {
    return new Sql.SelectPair(pairing.toLowerCase(),
                             spec && spec[0].toLowerCase(),
                             lhs,
                             rhs)
  }

Select
  = "SELECT"i __ what:TargetClause __
    "FROM"i   __ from:FromClause
    where:(   __ "WHERE"i  __          WhereClause )?
    groupBy:( __ "GROUP"i  __ "BY"i __ GroupByClause )?
    having:(  __ "HAVING"i __          HavingClause )?
    orderBy:( __ "ORDER"i  __ "BY"i __ OrderByClause )?
  {
    return new Sql.Select(what, from, where && where[3],groupBy && groupBy[5],
                         having && having[3], orderBy && orderBy[5])
  }
  / "(" _ sel:Select _ ")" { return sel }

TargetClause
  = spec:$( "DISTINCT"i __ / "ALL"i __ )?
    target:(
      "*"
      / TargetList
    )
  { return {
      'type': Sql.TARGETCLAUSE_TYPE,
      'specifier': spec ? spec.toLowerCase() : null,
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
    )?

RelationList
  = item1:RelationItem _ "," _ items:RelationList
    { return new Sql.Join(item1, items) }
    / Join
    / RelationItem

RelationItem "RelationItem"
  = item:RelationThing __ ( "AS"i __ )? alias:Name
  { return new Sql.Relation(item, alias) }
  / RelationThing

RelationThing
  = "(" _ list:RelationList _ ")"
  { return list }
  / "(" _ join:Join _ ")"
  { return join }
  / tableName:Name
  { return new Sql.Relation(tableName) }

Join
  = item1:RelationItem __
    jtype:JoinType __
    item2:RelationItem
    jcond:(
      __ "ON"i
      __ expr:Condition
      { return expr }
      / __ "USING"i _
        "(" _ list:TargetList _ ")"
        { return ['using', list] }
    )?
  { return new Sql.Join(item1, item2, jtype, jcond) }

TargetList
  = item1:TargetItem _ "," _ items:TargetList
    { return [item1].concat(items) }
    / item:TargetItem
    { return [item] }

TargetItem "TargetItem"
  = table:Name ".*"
  { return new Sql.Column(table, '*', `${table}.*`, null) }
  / op:Operand __ "AS"i __ alias:Name
  { return new Sql.Column(null, op, alias, alias )}
  / op:Operand __ alias:Name
  { return new Sql.Column(null, op, alias, alias )}
  / op:Operand _ "=" _ alias:Name
  { return new Sql.Column(null, op, alias, alias) }
  / op:Operand
  { return (op instanceof Sql.Column) ? op : new Sql.Column(null, op) }

Condition "Condition"
  = lhs:AndCondition rhs:( __ "OR"i __ Condition )?
  { return rhs ? new Sql.Conditional('or', lhs, rhs[3]) : lhs }

AndCondition
  = lhs:InnerCondition rhs:( __ "AND"i __ AndCondition )?
  { return rhs ? new Sql.Conditional('and', lhs, rhs[3]) : lhs }

InnerCondition
  = ( ConditionContains
    / ConditionComp
    / ConditionIn
    / ConditionExists
    / ConditionLike
    / ConditionBetween
    / ConditionNull
//    / Operand
  )
  / "NOT"i __ expr:Condition
  { return new Sql.Conditional('not', expr) }
  / "(" _ expr:Condition _ ")"
  { return expr }

ConditionContains "Conditional-Contains"
  // based on Transact-SQL
  = "CONTAINS" _
    "(" _
      lhs:(
        Operand
        / "(" _ ops:OperandList _ ")"
        { return ops }
      )
      rhs:SQStringLiteral
    ")"
  { return new Sql.Conditional('contains', lhs, rhs) }

ConditionComp "Conditional-Comparison"
  = lhs:Operand _ cmp:Compare _ rhs:Operand
  { return new Sql.Conditional(cmp, lhs, rhs) }

ConditionIn
  = lhs_op:Operand __
    not:( "NOT"i __ )?
    "IN"i _
    "(" _
      rhs_ops:( Selectish / OperandList ) _
    ")"
  { return new Sql.Conditional('in', lhs_op, rhs_ops, not) }

ConditionExists
  = "EXISTS"i _
    "(" _ subquery:Selectish _ ")"
  { return new Sql.Conditional('exists', subquery) }

ConditionLike
  = lhs_op:Operand __
    not:( "NOT"i __ )?
    "LIKE"i __
    rhs_op:Operand
  { return new Sql.Conditional('like', lhs_op, rhs_op, not) }

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
  { return new Sql.Conditional('between', lhs_op, rhs, not) }

ConditionNull
  = lhs:Operand __ "IS"i __
    not:( "NOT"i __ )?
    NullLiteral
  { return new Sql.Conditional('isnull', lhs, null, not) }

Term
  = Literal
    / AggFunction
    / "(" _ op:Operand _ ")" { return op }
    / ColumnRef

ColumnRef
  = tbl:( table:Name "." )? column:Name
    { return new Sql.Column(tbl && tbl[0],
                           column,
                           tbl ? `${tbl[0]}.${column}` : column
                          ) }

AggFunction "aggregate function"
  = AggFunctionAvg
    / AggFunctionCount
    / AggFunctionMax
    / AggFunctionMin
    / AggFunctionSum

AggFunctionAvg
  = "AVG"i _
    "(" _ term:Term _ ")"
  { return new Sql.AggFunction("avg", term) }

AggFunctionCount
  = "COUNT"i _
    "(" _
      targ:TargetClause _
    ")"
  { return new Sql.AggFunction("count", targ) }

AggFunctionMax
  = "MAX"i _
    "(" _
      term:Term _
    ")"
  { return new Sql.AggFunction("max", term) }

AggFunctionMin
  = "MIN"i _
    "(" _
      term:Term _
    ")"
  { return new Sql.AggFunction("min", term) }

AggFunctionSum
  = "SUM"i _
    "(" _
      term:Term _
    ")"
  { return new Sql.AggFunction("sum", term) }

/***** PRIMITIVES *****/

Name
  = DQStringLiteral
    / BTStringLiteral
    / !ReservedWord id:Ident {return id }

Ident "UnquotedIdent"
  = $( [A-Za-z_][A-Za-z0-9_]* )

OperandList
  = lhs:Operand
    rhs:( _ "," _ Operand )*
  {
    if (rhs.length)
      return rhs.reduce((result, element) => result.concat(element[3]), [lhs])
    else
      return lhs
  }

Operand // Summand | makeOperation
  = lhs:Summand
    rhs:( _ "||" _ Summand ) *
  { return reduceIfRHS(lhs, rhs, (lh, rh) => new Sql.Operation("||",
                                                              lh, rh[3])) }
  / Selectish

Summand // Factor | makeOperation
  = lhs:Factor
    rhs:( _ ("+" / "-") _ Factor ) *
  { return reduceIfRHS(lhs, rhs, (lh, rh) => new Sql.Operation(rh[1],
                                                              lh, rh[3])) }

Factor // literal | function | Operand | column | makeOperation
  = lhs:Term
    rhs:( _ ("*" / "/") _ Term ) *
  { return reduceIfRHS(lhs, rhs, (lh, rh) => new Sql.Operation(rh[1],
                                                              lh, rh[3])) }

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
    / ExponentialLiteral
    / BooleanLiteral
    / NullLiteral

BTStringLiteral "backtick string"
  = $( '`' ( [^`] / '``' )+ '`' )

DQStringLiteral "double-quote string"
  = $( '"' ( [^"] / '""' )+ '"' )

SQStringLiteral "single-quote string"
  = lit:$( "'" ( [^'] / "''" )* "'" !SQStringLiteral )
  { return new Sql.Literal('string', lit.slice(1, -1)) }
  / lit:$( ("‘"/"’") ( [^’] )* "’" ) // fancy single-quote
  { return new Sql.Literal('string', lit.slice(1, -1)) }

ExponentialLiteral "exponential"
  = val:$( NumericLiteral "e" IntegerLiteral )
  { return new Sql.Literal('number', parseFloat(val)) }

NumericLiteral "number"
  = IntegerLiteral
    / DecimalLiteral

IntegerLiteral "integer"
  = int:$( "-"? [0-9]+ )
  { return new Sql.Literal('number', parseInt(int)) }

DecimalLiteral "decimal"
  = value:$( "-"? [0-9]+ "." [0-9]+ )
  { return new Sql.Literal('number', parseFloat(value)) }

NullLiteral "null"
  = "NULL"i
  { return new Sql.Literal('null', null) }

BooleanLiteral "boolean"
  = TruePrim
    / FalsePrim

TruePrim
  = "TRUE"i
  { return new Sql.Literal('boolean', true) }

FalsePrim
  = "FALSE"i
  { return new Sql.Literal('boolean', false) }

_ "OptWhitespace"
  = WS* (Comment WS*)* {}

__ "ReqWhitespace"
  = WS+ (Comment WS*)* {}

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
  = $("ABS"i / "ALL"i / "ALLOCATE"i / "ALTER"i / "AND"i / "ANY"i / "ARE"i /
        "ARRAY_AGG"i / "ARRAY"i / "ASENSITIVE"i / "ASYMMETRIC"i / "AS"i /
        "ATOMIC"i / "AT"i / "AUTHORIZATION"i / "AVG"i
      / "BEGIN"i / "BETWEEN"i / "BIGINT"i / "BINARY"i / "BLOB"i / "BOOLEAN"i /
        "BOTH"i / "BY"i
      / "CALLED"i / "CALL"i / "CARDINALITY"i / "CASCADED"i / "CASE"i / "CAST"i /
        "CEILING"i / "CEIL"i / "CHARACTER_LENGTH"i / "CHAR_LENGTH"i /
        "CHARACTER"i / "CHAR"i / "CHECK"i / "CLOB"i / "CLOSE"i / "COALESCE"i /
        "COLLATE"i / "COLLECT"i / "COLUMN"i / "COMMIT"i / "CONDITION"i /
        "CONNECT"i / "CONSTRAINT"i / "CONVERT"i / "CORRESPONDING"i / "CORR"i /
        "COUNT"i / "COVAR_POP"i / "COVAR_SAMP"i / "CREATE"i / "CROSS"i /
        "CUBE"i / "CUME_DIST"i / "CURRENT_CATALOG"i / "CURRENT_DATE"i /
        "CURRENT_DEFAULT_TRANSFORM_GROUP"i / "CURRENT_PATH"i / "CURRENT_ROLE"i /
        "CURRENT_SCHEMA"i / "CURRENT_TIMESTAMP"i / "CURRENT_TIME"i /
        "CURRENT_TRANSFORM_GROUP_FOR_TYPE"i / "CURRENT_USER"i / "CURRENT"i /
        "CURSOR"i / "CYCLE"i
      / "DATALINK"i / "DATE"i / "DAY"i / "DEALLOCATE"i / "DECIMAL"i /
        "DECLARE"i / "DEC"i / "DEFAULT"i / "DELETE"i / "DENSE_RANK"i /
        "DEREF"i / "DESCRIBE"i / "DETERMINISTIC"i / "DISCONNECT"i /
        "DISTINCT"i / "DLNEWCOPY"i / "DLPREVIOUSCOPY"i / "DLURLCOMPLETE"i /
        "DLURLCOMPLETEONLY"i / "DLURLCOMPLETEWRITE"i / "DLURLPATHONLY"i /
        "DLURLPATHWRITE"i / "DLURLPATH"i / "DLURLSCHEME"i / "DLURLSERVER"i /
        "DLVALUE"i / "DOUBLE"i / "DROP"i / "DYNAMIC"i
      / "EACH"i / "ELEMENT"i / "ELSE"i / "END-EXEC"i / "END"i / "ESCAPE"i /
        "EVERY"i / "EXCEPT"i / "EXECUTE"i / "EXEC"i / "EXISTS"i / "EXP"i /
        "EXTERNAL"i / "EXTRACT"i
      / "FALSE"i / "FETCH"i / "FILTER"i / "FIRST_VALUE"i / "FLOAT"i / "FLOOR"i /
        "FOREIGN"i / "FOR"i / "FREE"i / "FROM"i / "FULL"i / "FUNCTION"i /
        "FUSION"i
      / "GET"i / "GLOBAL"i / "GRANT"i / "GROUPING"i / "GROUP"i
      / "HAVING"i / "HOLD"i / "HOUR"i
      / "IDENTITY"i / "IMPORT"i / "INDICATOR"i / "INNER"i / "INOUT"i /
        "INSENSITIVE"i / "INSERT"i / "INTEGER"i / "INTERSECTION"i /
        "INTERSECT"i / "INTERVAL"i / "INTO"i / "INT"i / "IN"i / "IS"i
      / "JOIN"i
      / "LAG"i / "LANGUAGE"i / "LARGE"i / "LAST_VALUE"i / "LATERAL"i /
        "LEADING"i / "LEAD"i / "LEFT"i / "LIKE_REGEX"i / "LIKE"i / "LN"i /
        "LOCALTIMESTAMP"i / "LOCAL"i / "LOCALTIME"i / "LOWER"i
      / "MATCH"i / "MAX_CARDINALITY"i / "MAX"i / "MEMBER"i / "MERGE"i /
        "METHOD"i / "MINUTE"i / "MIN"i / "MODIFIES"i / "MODULE"i / "MOD"i /
        "MONTH"i / "MULTISET"i
      / "NATIONAL"i / "NATURAL"i / "NCHAR"i / "NCLOB"i / "NEW"i / "NONE"i /
        "NORMALIZE"i / "NOT"i / "NO"i / "NTH_VALUE"i / "NTILE"i / "NULLIF"i /
        "NULL"i / "NUMERIC"i
      / "OCCURRENCES_REGEX"i / "OCTET_LENGTH"i / "OFFSET"i / "OF"i / "OLD"i /
        "ONLY"i / "ON"i / "OPEN"i / "ORDER"i / "OR"i / "OUTER"i / "OUT"i /
        "OVERLAPS"i / "OVERLAY"i / "OVER"i
      / "PARAMETER"i / "PARTITION"i / "PERCENTILE_CONT"i / "PERCENTILE_DISC"i /
        "PERCENT_RANK"i / "POSITION_REGEX"i / "POSITION"i / "POWER"i /
        "PRECISION"i / "PREPARE"i / "PRIMARY"i / "PROCEDURE"i
      / "RANGE"i / "RANK"i / "READS"i / "REAL"i / "RECURSIVE"i / "REFERENCES"i /
        "REFERENCING"i / "REF"i / "REGR_AVGX"i / "REGR_AVGY"i / "REGR_COUNT"i /
        "REGR_INTERCEPT"i / "REGR_R2"i / "REGR_SLOPE"i / "REGR_SXX"i /
        "REGR_SXY"i / "REGR_SYY"i / "RELEASE"i / "RESULT"i / "RETURNS"i /
        "RETURN"i / "REVOKE"i / "RIGHT"i / "ROLLBACK"i / "ROLLUP"i / "ROWS"i /
        "ROW_NUMBER"i / "ROW"i
      / "SAVEPOINT"i / "SCOPE"i / "SCROLL"i / "SEARCH"i / "SECOND"i /
        "SELECT"i / "SENSITIVE"i / "SESSION_USER"i / "SET"i / "SIMILAR"i /
        "SMALLINT"i / "SOME"i / "SPECIFICTYPE"i / "SPECIFIC"i /
        "SQLEXCEPTION"i / "SQLSTATE"i / "SQLWARNING"i / "SQL"i / "SQRT"i /
        "START"i / "STATIC"i / "STDDEV_POP"i / "STDDEV_SAMP"i / "SUBMULTISET"i /
        "SUBSTRING_REGEX"i / "SUBSTRING"i / "SUM"i / "SYMMETRIC"i /
        "SYSTEM_USER"i / "SYSTEM"i
      / "TABLESAMPLE"i / "TABLE"i / "THEN"i / "TIMESTAMP"i / "TIMEZONE_HOUR"i /
        "TIMEZONE_MINUTE"i / "TIME"i / "TO"i / "TRAILING"i /
        "TRANSLATE_REGEX"i / "TRANSLATE"i / "TRANSLATION"i / "TREAT"i /
        "TRIGGER"i / "TRIM_ARRAY"i / "TRIM"i / "TRUE"i / "TRUNCATE"i
      / "UESCAPE"i / "UNION"i / "UNIQUE"i / "UNKNOWN"i / "UNNEST"i / "UPDATE"i /
        "UPPER"i / "USER"i / "USING"i
      / "VALUES"i / "VALUE"i / "VARBINARY"i / "VARCHAR"i / "VARYING"i /
        "VAR_POP"i / "VAR_SAMP"i
      / "WHENEVER"i / "WHEN"i / "WHERE"i / "WIDTH_BUCKET"i / "WINDOW"i /
        "WITHIN"i / "WITHOUT"i / "WITH"i
      / "XMLAGG"i / "XMLATTRIBUTES"i / "XMLBINARY"i / "XMLCAST"i /
        "XMLCOMMENT"i / "XMLCONCAT"i / "XMLDOCUMENT"i / "XMLELEMENT"i /
        "XMLEXISTS"i / "XMLFOREST"i / "XMLITERATE"i / "XMLNAMESPACES"i /
        "XMLPARSE"i / "XMLPI"i / "XMLQUERY"i / "XMLSERIALIZE"i / "XMLTABLE"i /
        "XMLTEXT"i / "XMLVALIDATE"i / "XML"i
      / "YEAR"i
  ) !Ident
