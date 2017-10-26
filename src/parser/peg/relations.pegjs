
start
  = Relations

Relations
  = lhs:Relation
    rhs:( _ Relations )*
  { return rhs.reduce((l, r) => l.concat(r[1]), [lhs]) }

Relation
  = table:Name
    _ "(" _
      cols:Columns
    _ ")"
  { return [table, cols] }

Columns
  = lhs:Column rhs:( _ "," _ Column )*
  { return rhs.reduce((l,r) => l.concat(r[1]), [lhs]) }

Column
  = name:Name _ ":" _ typ:Ident
  { return [name, typ] }


/* sql primitives */

Name
  = DQStringLiteral
    / BTStringLiteral
    / Ident

Ident "UnquotedIdent"
  = $( [A-Za-z_][A-Za-z0-9_]* )

BTStringLiteral "backtick string"
  = $( '`' ( [^`] / '``' )+ '`' )

DQStringLiteral "double-quote string"
  = $( '"' ( [^"] / '""' )+ '"' )

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
