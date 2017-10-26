
export const LITERAL_TYPE       = "literal"
export const COLUMN_TYPE        = "column"
export const JOIN_TYPE          = "join"
export const RELATION_TYPE      = "relation"
export const CONDITIONAL_TYPE   = "conditional"
export const AGGFUNCTION_TYPE   = "aggfunction"
export const OPERATION_TYPE     = "operation"
export const SELECTCLAUSE_TYPE  = "selectclause"
export const TARGETCLAUSE_TYPE  = "targetclause"

export const REL_RESTRICTION_TYPE = "restriction"
export const REL_PROJECTION_TYPE  = "projection"
export const REL_RENAME_TYPE      = "rename"

export const REL_RELATION_TYPE    = "relrelation"
export const REL_COLUMN_TYPE      = "relcolumn"
export const REL_CONDITIONAL_TYPE = "relconditional"
export const REL_JOIN_TYPE        = "reljoin"
export const REL_FUNCTION_TYPE    = "relfunt"
export const REL_OPERATION_TYPE   = "relop"

export class Catalog {

  static fromParse(relations: Array<[string, Array<[string, string]>]>) {
    const rels = new Map()
    relations.forEach((ele) => {
      const [tname, cols] = ele
      const columnMap = new Map()
      cols.forEach((col) => {
        columnMap.set(col[0], new Column(col[0], col[1]))
      })
      rels.set(tname, new Relation(tname, columnMap))
    })
    return new Catalog(rels)
  }

  relations: Map<string, Relation>

  constructor(relations: Map<string, Relation>) {
    this.relations = relations
  }
}

export class Relation {
  name: string
  columns: Map<string, Column>

  constructor(name: string, columns: Map<string, Column>) {
    this.name = name
    this.columns = columns
  }
}

export class Column {
  name: string
  typ: string

  constructor(name: string, typ: string) {
    this.name = name
    this.typ = typ
  }
}

export type JOINSTRING = "join"       // "," | "JOIN" | "CROSS JOIN"
                       | "equi"       // "INNER JOIN" | "JOIN ... USING"
                       | "natural"    // "NATURAL JOIN"
                       | "leftouter"  // "LEFT [OUTER] JOIN"
                       | "rightouter" // "RIGHT [OUTER] JOIN"
                       | "fullouter"  // "FULL [OUTER] JOIN"

type OrderingCondition = "asc" | "desc" | "<" | ">"
type Ordering = [SqlColumn, OrderingCondition]

export type RelationList = SqlRelation | SqlJoin
type TargetList = SqlColumn[]

export interface TargetClause {
  type: "targetclause"
  spec: "distinct" | "all" | null
  target: "*" | TargetList
}

export class SqlLiteral {
  static readonly type = LITERAL_TYPE
  literalType: 'string' | 'number' | 'boolean' | 'null'
  value: string | number | boolean | null

  constructor(literalType: 'string' | 'number' | 'boolean' | 'null',
              value: string | number | boolean | null) {
    this.literalType = literalType
    this.value = value
  }
}

export class SqlSelect {
  static readonly SELECTCLAUSE_TYPE
  what: TargetClause
  from: RelationList
  where: SqlConditional | null
  groupBy: TargetList | null
  having: SqlConditional | null
  orderBy: Ordering[] | null

  constructor(what: TargetClause,
              from: RelationList,
              where: SqlConditional | null,
              groupBy: TargetList | null,
              having: SqlConditional | null,
              orderBy: Ordering[] | null) {
    this.what = what
    this.from = from
    this.where = where
    this.groupBy = groupBy
    this.having = having
    this.orderBy = orderBy
  }
}

export type SqlOperandType = SqlLiteral | SqlAggFunction | SqlColumn |
                      SqlOperation | string

export class SqlColumn {
  static readonly type = COLUMN_TYPE
  relation: string | null
  target: SqlOperandType
  alias: string | null

  constructor(relation: string | null,
              target: SqlOperandType,
              alias: string | null = null) {
    this.relation = relation
    this.target = target
    this.alias = alias || null
  }
}

export class SqlJoin {
  static readonly type = JOIN_TYPE
  joinType: JOINSTRING
  condition: SqlConditional | ['using', TargetList] | null
  lhs: SqlJoin | SqlRelation
  rhs: SqlJoin | SqlRelation

  constructor(lhs: SqlJoin | SqlRelation,
              rhs: SqlJoin | SqlRelation,
              joinType: JOINSTRING = 'join',
              condition: SqlConditional | ['using', TargetList] | null = null
  ) {
    this.lhs = lhs
    this.rhs = rhs
    this.joinType = joinType || 'join'
    this.condition = condition || null
  }
}

export class SqlRelation {
  static readonly type = RELATION_TYPE
  target: SqlRelation | SqlJoin | string
  alias: string | null

  constructor(target: SqlRelation | SqlJoin | string,
              alias: string | null = null) {
    this.target = target
    this.alias = alias || null
  }
}

export type SqlConditionalOp = 'or' | 'and' | 'not' | 'in' | 'exists' |
                               'like' | 'between' | 'isnull' | '<>' |
                               '<=' | '>=' | '=' | '<' | '>' | '!='

export class SqlConditional {
  static readonly type = CONDITIONAL_TYPE
  operation: SqlConditionalOp
  lhs: SqlConditional | SqlOperandType
  rhs: SqlConditional | SqlOperandType | null
  not: boolean

  constructor(operation: SqlConditionalOp,
              lhs: SqlConditional | SqlOperandType,
              rhs: SqlConditional | SqlOperandType | null = null,
              not: boolean = false) {
    this.operation = operation
    this.lhs = lhs
    this.rhs = rhs || null
    this.not = not
  }
}

export type AggFuncName = 'avg' | 'count' | 'max' | 'min' | 'sum'

export class SqlAggFunction {
  static readonly type = AGGFUNCTION_TYPE
  fname: AggFuncName
  expr: SqlOperandType | TargetClause

  constructor(fname: AggFuncName, expr: SqlOperandType | TargetClause) {
    this.fname = fname
    this.expr = expr
  }
}

export type SqlOperationOps = '||' | '+' | '-' | '*' | '/'

export class SqlOperation {
  static readonly type = OPERATION_TYPE
  op: SqlOperationOps
  lhs: SqlOperandType
  rhs: SqlOperandType

  constructor(op: SqlOperationOps, lhs: SqlOperandType, rhs: SqlOperandType) {
    this.op = op
    this.lhs = lhs
    this.rhs = rhs
  }
}

/*** RELATIONAL ALGEBRA ***/
// literals are strings

export type RelRelationish = RelRelation | RelJoin
export type RelOperandType = RelOperation | string | RelColumn

export class RelOperation {
  static readonly type = REL_OPERATION_TYPE
  op: SqlOperationOps | 'union' | 'intersect' | 'except'
  lhs: RelOperandType | HighLevelRelationish
  rhs: RelOperandType | HighLevelRelationish

  constructor(op: SqlOperationOps | 'union' | 'intersect' | 'except',
              lhs: RelOperandType | HighLevelRelationish,
              rhs: RelOperandType | HighLevelRelationish) {
    this.op = op
    this.lhs = lhs
    this.rhs = rhs
  }
}

export class RelColumn {
  static readonly type = REL_COLUMN_TYPE
  relation: RelRelation
  name: string

  constructor(relation: RelRelation, name: string) {
    this.relation = relation
    this.name = name
  }
}

export class RelFunction {
  static readonly type = REL_FUNCTION_TYPE
  fname: AggFuncName
  expr: '*' | RelColumn // TODO: support correct args

  constructor(fname: AggFuncName, expr: '*' | RelColumn) {
    this.fname = fname
    this.expr = expr
  }
}

export type ThetaOp = 'eq' | 'neq' | 'leq' | 'geq' | '<' | '>' | 'and' | 'or' |
                      'in'

export class RelConditional {
  static readonly type = REL_CONDITIONAL_TYPE
  operation: ThetaOp
  lhs: RelOperandType | RelConditional
  rhs: RelOperandType | RelConditional

  constructor(op: ThetaOp, lhs: RelOperandType | RelConditional,
              rhs: RelOperandType | RelConditional) {
    this.operation = op
    this.lhs = lhs
    this.rhs = rhs
  }
}

type HighLevelRelationish = RelRelationish | RelRestriction | RelProjection | RelRename

export class RelRestriction {
  static readonly type = REL_RESTRICTION_TYPE
  conditions: RelConditional
  args: HighLevelRelationish

  constructor(conditions: RelConditional, args: HighLevelRelationish) {
    this.conditions = conditions
    this.args = args
  }
}

export class RelProjection {
  static readonly type = REL_PROJECTION_TYPE
  columns: RelColumn[]
  args: HighLevelRelationish

  constructor(columns: RelColumn[], args: HighLevelRelationish) {
    this.columns = columns
    this.args = args
  }
}

export class RelRename {
  static readonly type = REL_RENAME_TYPE
  input: RelRelation | RelColumn | RelFunction | string
  output: string
  args: RelRelationish | null

  constructor(input: RelRelation | RelColumn | RelFunction | string,
              output: string,
              args: RelRelationish | null) {
    this.input = input
    this.output = output
    this.args = args
  }
}

export class RelRelation {
  static readonly type = REL_RELATION_TYPE
  name: string

  constructor(name: string) {
    this.name = name
  }
}

export type RelJoinCond = "cross" | "left" | "right" | RelConditional

// cross
// natural (no condition)
// theta join (with condition)
// semi (left and right)
export class RelJoin {
  static readonly type = REL_JOIN_TYPE
  lhs: RelRelationish
  rhs: RelRelationish
  condition: RelJoinCond

  constructor(lhs: RelRelationish, rhs: RelRelationish, cond: RelJoinCond) {
    this.lhs = lhs
    this.rhs = rhs
    this.condition = cond
  }
}
