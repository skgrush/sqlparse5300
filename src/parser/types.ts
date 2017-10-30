
export const LITERAL_TYPE       = "literal"
export const COLUMN_TYPE        = "column"
export const JOIN_TYPE          = "join"
export const RELATION_TYPE      = "relation"
export const CONDITIONAL_TYPE   = "conditional"
export const AGGFUNCTION_TYPE   = "aggfunction"
export const OPERATION_TYPE     = "operation"
export const SELECTCLAUSE_TYPE  = "selectclause"
export const TARGETCLAUSE_TYPE  = "targetclause"
export const SELECTPAIR_TYPE    = "selectpair"

export const REL_RESTRICTION_TYPE = "restriction"
export const REL_PROJECTION_TYPE  = "projection"
export const REL_RENAME_TYPE      = "rename"

export const REL_RELATION_TYPE    = "relrelation"
export const REL_COLUMN_TYPE      = "relcolumn"
export const REL_CONDITIONAL_TYPE = "relconditional"
export const REL_JOIN_TYPE        = "reljoin"
export const REL_FUNCTION_TYPE    = "relfunt"
export const REL_OPERATION_TYPE   = "relop"

/**
 * IFF rhs is non-empty, run reduce using f on rhs initialized by lhs.
 * Else return lhs
 */
export function reduceIfRHS(lhs: any, rhs: any[], f: (L, R) => any) {
  if (rhs.length)
    return rhs.reduce(f, lhs)
  return lhs
}

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
  targetlist: "*" | TargetList
}

export class SqlLiteral {
  readonly type = LITERAL_TYPE
  literalType: 'string' | 'number' | 'boolean' | 'null'
  value: string | number | boolean | null

  constructor(literalType: 'string' | 'number' | 'boolean' | 'null',
              value: string | number | boolean | null) {
    this.literalType = literalType
    this.value = value
  }
}

export type SqlSelectish = SqlSelect | SqlSelectPair
export type PairingString = 'union' | 'intersect' | 'except'
export type PairingCondition = 'all' | 'distinct' | null

export class SqlSelectPair {
  readonly type = SELECTPAIR_TYPE
  pairing: PairingString
  condition: PairingCondition
  lhs: SqlSelect
  rhs: SqlSelectish

  constructor(pairing: PairingString,
              condition: PairingCondition,
              lhs: SqlSelect,
              rhs: SqlSelectish) {
    this.pairing = pairing
    this.condition = condition || null
    this.lhs = lhs
    this.rhs = rhs
  }
}

export class SqlSelect {
  readonly SELECTCLAUSE_TYPE
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
  readonly type = COLUMN_TYPE
  relation: string | null
  target: SqlOperandType
  as: string | null
  alias: string | null

  constructor(relation: string | null,
              target: SqlOperandType,
              As: string | null = null,
              alias: string | null = null) {
    this.relation = relation
    this.target = target
    this.as = As || null
    this.alias = alias || null
  }
}

export class SqlJoin {
  readonly type = JOIN_TYPE
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
  readonly type = RELATION_TYPE
  target: SqlRelation | SqlJoin | string
  alias: string | null

  constructor(target: SqlRelation | SqlJoin | string,
              alias: string | null = null) {
    this.target = target
    this.alias = alias || null
  }
}

export type SqlConditionalOp = 'or' | 'and' | 'not' | 'in' | 'exists' | 'like' |
                               'between' | 'isnull' | '<>' | 'contains' |
                               '<=' | '>=' | '=' | '<' | '>' | '!='

export class SqlConditional {
  readonly type = CONDITIONAL_TYPE
  operation: SqlConditionalOp
  lhs: SqlConditional | SqlOperandType
  rhs: SqlConditional | SqlOperandType | null
  not: boolean

  constructor(operation: SqlConditionalOp,
              lhs: SqlConditional | SqlOperandType,
              rhs: SqlConditional | SqlOperandType | null = null,
              not: boolean = false) {
    if (operation === 'in' && lhs instanceof Array && lhs.length === 1)
      lhs = lhs[0]
    this.operation = operation
    this.lhs = lhs
    this.rhs = rhs || null
    this.not = not
  }
}

export type AggFuncName = 'avg' | 'count' | 'max' | 'min' | 'sum'

export class SqlAggFunction {
  readonly type = AGGFUNCTION_TYPE
  fname: AggFuncName
  expr: SqlOperandType | TargetClause

  constructor(fname: AggFuncName, expr: SqlOperandType | TargetClause) {
    this.fname = fname
    this.expr = expr
  }
}

export type SqlOperationOps = '||' | '+' | '-' | '*' | '/'

export class SqlOperation {
  readonly type = OPERATION_TYPE
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
  readonly type = REL_OPERATION_TYPE
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

type ColumnValueType = Column | RelFunction | string

export class RelColumn {
  readonly type = REL_COLUMN_TYPE
  relation: RelRelation | null
  target: ColumnValueType
  as: string | null

  constructor(relation: RelRelation | null,
              target: ColumnValueType,
              As: string | null = null) {
    this.relation = relation
    this.target = target
    this.as = As || null
  }

  alias(alias?: string) {
    if (!alias)
      return this
    return new RelColumn(this.relation, this.target, alias)
  }
}

export class RelFunction {
  readonly type = REL_FUNCTION_TYPE
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
  readonly type = REL_CONDITIONAL_TYPE
  operation: ThetaOp
  lhs: RelOperandType | RelConditional
  rhs: RelOperandType | RelConditional | RelOperandType[]

  constructor(op: ThetaOp, lhs: RelOperandType | RelConditional,
              rhs: RelOperandType | RelConditional | RelOperandType[]) {
    this.operation = op
    this.lhs = lhs
    this.rhs = rhs
  }
}

export type HighLevelRelationish = RelRelationish | RelRestriction | RelProjection | RelRename | RelOperation

export class RelRestriction {
  readonly type = REL_RESTRICTION_TYPE
  conditions: RelConditional
  args: HighLevelRelationish

  constructor(conditions: RelConditional, args: HighLevelRelationish) {
    this.conditions = conditions
    this.args = args
  }
}

export class RelProjection {
  readonly type = REL_PROJECTION_TYPE
  columns: RelColumn[]
  args: HighLevelRelationish

  constructor(columns: RelColumn[], args: HighLevelRelationish) {
    this.columns = columns
    this.args = args
  }
}

type _RelRenameInputType = RelRelation | RelColumn | RelFunction |
                           RelRename | string

export class RelRename {
  readonly type = REL_RENAME_TYPE
  input: _RelRenameInputType
  output: string
  args: HighLevelRelationish

  constructor(input: _RelRenameInputType,
              output: string,
              args: HighLevelRelationish) {
    this.input = input
    this.output = output
    this.args = args
  }
}

export class RelRelation {
  readonly type = REL_RELATION_TYPE
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
  readonly type = REL_JOIN_TYPE
  lhs: HighLevelRelationish
  rhs: HighLevelRelationish
  condition: RelJoinCond

  constructor(lhs: HighLevelRelationish,
              rhs: HighLevelRelationish,
              cond: RelJoinCond) {
    this.lhs = lhs
    this.rhs = rhs
    this.condition = cond
  }
}
