import {OrderingCondition, OperationOps, PairingString, PairingCondition,
        JoinString, AggFuncName} from './index'

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

type Ordering = [SqlColumn, OrderingCondition]

export type RelationList = SqlRelation | SqlJoin
type TargetList = SqlColumn[]

export interface TargetClause {
  type: "targetclause"
  spec: PairingCondition
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
  joinType: JoinString
  condition: SqlConditional | ['using', TargetList] | null
  lhs: SqlJoin | SqlRelation
  rhs: SqlJoin | SqlRelation

  constructor(lhs: SqlJoin | SqlRelation,
              rhs: SqlJoin | SqlRelation,
              joinType: JoinString = 'join',
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

export class SqlAggFunction {
  readonly type = AGGFUNCTION_TYPE
  fname: AggFuncName
  expr: SqlOperandType | TargetClause

  constructor(fname: AggFuncName, expr: SqlOperandType | TargetClause) {
    this.fname = fname
    this.expr = expr
  }
}

export class SqlOperation {
  readonly type = OPERATION_TYPE
  op: OperationOps
  lhs: SqlOperandType
  rhs: SqlOperandType

  constructor(op: OperationOps, lhs: SqlOperandType, rhs: SqlOperandType) {
    this.op = op
    this.lhs = lhs
    this.rhs = rhs
  }
}
