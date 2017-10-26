
/**
 *
 *
 * "Op"s are symbols OR words; as such they contain whitespace and shouldn't
 *  be wrapped with whitespace.
 * The "functional" Ops (Restrict, Project, Rename) do not provide
 *  left whitespace.
 */



Restriction
  = RestrictOp
      "_(" _ conditions:ThetaCondition _ ")"
      _ "(" _ args:Sets _ ")"
  { return new RelRestriction(conditions, args) }

Projection
  = ProjectOp
      "_(" _ columns:OperandList _ ")"
      _ "(" _ args:Sets _ ")"
  { return new RelProjection(columns, args) }

Rename
  = RenameOp
      "_(" _ output:Name _ "/" _ input:(Name / ColumnRef) _ ")"
      _ "(" _ args:Sets _ ")"
  { return new RelRename(output, input, args) }

Sets
  = Set RelationalOp Sets
  / Set

Set
  = "(" _ Sets _ ")"
  = Name


ThetaCondition
  = lhs:AndCondition rhs:( OpOr ThetaCondition )?
  { return rhs ? [lhs, rhs[0], rhs[1]] : lhs }

AndCondition
  = lhs:Condition rhs:( OpAnd AndCondition )?
  { return rhs ? [lhs, rhs[0], rhs[1]] : lhs }

Condition
  = lhs:Operand rhs:( ThetaOp Condition )?
  { return rhs ? [lhs, rhs[0], rhs[1]] : lhs }

OperandList
  = lhs:Operand
    rhs:( _ "," _ Operand )*
  {
    if (rhs.length)
      return rhs.reduce((result, element) => result.concat(element[3]), [lhs])
    else
      return lhs
  }

Operand
  = lhs:Summand
    rhs:( _ "||" _ Summand ) *
  { return reduceIfRHS(lhs, rhs, (lh, rh) => [lh, "||", rh[3]]) }

Summand
  = lhs:Factor
    rhs:( _ ("+" / "-") _ Factor ) *
  { return reduceIfRHS(lhs, rhs, (lh, rh) => [lh, rh[1], rh[3]]) }

Factor
  = lhs:Term
    rhs:( _ ("*" / "/") _ Term ) *
  { return reduceIfRHS(lhs, rhs, (lh, rh) => [lh, rh[1], rh[3]]) }


Term
  = Literal
    / AggFunction
    / "(" _ op:Operand _ ")" { return op }
    / ColumnRef

ColumnRef
  = tbl:( table:Name "." )? column:Name
    { return makeColumn(tbl && tbl[0], column) }


RestrictOp
  = ("RESTRICT"i __ / "σ" _ )
  { return "restrict" }

ProjectOp
  = ("PROJECT"i __ / "Π" _ )
  { return "project" }

RenameOp
  = ("RENAME"i __ / "ρ" _ )
  { return "rename" }

ThetaOp
  = OpEq / OpNeq / OpLeq / OpGeq / OpLess / OpGreater

OpEq
  = _ "=" _
  { return "eq" }

OpNeq
  = _ ("<>" / "≠") _ // U+2260
  { return "neq" }

OpLeq
  = _ ("<=" / "≤") _ // U+2264
  { return "leq" }

OpGeq
  = _ (">=" / "≥") _ // U+2265
  { return "geq" }

OpLess
  = _ "<" _

OpGreater
  = _ ">" _


OpAnd
  = ( __ "AND"i __ / _ "∧" _) // U+2227
  { return "and" }

OpOr
  = ( __ "OR"i __ / _ "∨" _) // U+2228
  { return "or" }


RelationalOp
  = SetOp
  / OpJoin / OpLJoin / OpRJoin / OpDivide

SetOp
  = OpUnion / OpIntersect / OpProduct / OpDifference

OpDifference
  = _ ( "−" / "-" ) _ // U+2212
  { return "-" }

OpUnion
  = ( __ "UNION"i __ / _ "⋃" _ / _ "∪" _ ) // U+22C3 / U+222A
  { return "union" }

OpIntersect
  = ( __ "INTERSECT"i __ / _ "⋂" _ / _ "∩" _ ) // U+22C2 / U+2229
  { return "intersect" }

OpJoin
  = ( __ "JOIN"i __ / _ "⋈" _ ) // U+22C8
  { return "join" }

OpLJoin
  = ( __ "LEFT"i _ "SEMI"i _ "JOIN"i __ / _ "⋉" _ ) // U+22C9
  { return "ljoin" }

OpRJoin
  = ( __ "RIGHT"i _ "SEMI"i _ "JOIN" __ / _ "⋊" _ ) // U+22CA
  { return "rjoin" }

OpProduct
  = ( __ "CROSS"i (_ "JOIN"i)? __  / _ "⨉" _ / _ "⨯" _ ) // U+2A09 / U+2A2F
  { return "crossjoin" }

OpDivide
  = ( __ "DIVIDE"i __ / _ "/" _ / _ "÷" _ )
  { return "divide" }


Name
  = DQStringLiteral
    / BTStringLiteral
    / !ReservedWord id:Ident {return id }

Ident "UnquotedIdent"
  = $( [A-Za-z_][A-Za-z0-9_]* )

ReservedWord
  = $("UNION"i / "INTERSECTION"i / "INTERSECT"i / "JOIN"i / "LEFT"i / "RIGHT"i
      / "CROSS"i / "OR"i / "AND"i / "RESTRICT"i / "PROJECT"i / "DIVIDE"i
      / "RENAME"i / "SEMI"i)
    !Ident

/* same sql primitives */

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

_ "OptWhitespace"
  = WS* Comment? WS* {}

__ "ReqWhitespace"
  = WS+ Comment? WS* {}
    / WS* Comment? WS+ {}

WS
  = [ \t\n]

Comment "Comment"
  = "/*" ( !"*/" . )* "*/"   {}
    / "--" ( !"\n" . )* "\n" {}
