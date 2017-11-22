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

type Ordering = [Column, OrderingCondition]

export type RelationList = Relation | Join
type TargetList = Column[]

export interface TargetClause {
  type: "targetclause"
  spec: PairingCondition
  targetlist: "*" | TargetList
}

export class Literal {
  readonly type = LITERAL_TYPE
  literalType: 'string' | 'number' | 'boolean' | 'null'
  value: string | number | boolean | null

  constructor(literalType: 'string' | 'number' | 'boolean' | 'null',
              value: string | number | boolean | null) {
    this.literalType = literalType
    this.value = value
  }
}

export type Selectish = Select | SelectPair

export class SelectPair {
  readonly type = SELECTPAIR_TYPE
  pairing: PairingString
  condition: PairingCondition
  lhs: Select
  rhs: Selectish

  constructor(pairing: PairingString,
              condition: PairingCondition,
              lhs: Select,
              rhs: Selectish) {
    this.pairing = pairing
    this.condition = condition || null
    this.lhs = lhs
    this.rhs = rhs
  }
}

export class Select {
  readonly SELECTCLAUSE_TYPE
  what: TargetClause
  from: RelationList
  where: Conditional | null
  groupBy: TargetList | null
  having: Conditional | null
  orderBy: Ordering[] | null

  constructor(what: TargetClause,
              from: RelationList,
              where: Conditional | null,
              groupBy: TargetList | null,
              having: Conditional | null,
              orderBy: Ordering[] | null) {
    this.what = what
    this.from = from
    this.where = where
    this.groupBy = groupBy
    this.having = having
    this.orderBy = orderBy
  }
}

export type OperandType = Literal | AggFunction | Column |
                      Operation | string

export class Column {
  readonly type = COLUMN_TYPE
  relation: string | null
  target: OperandType
  as: string | null
  alias: string | null

  constructor(relation: string | null,
              target: OperandType,
              As: string | null = null,
              alias: string | null = null) {
    this.relation = relation
    this.target = target
    this.as = As || null
    this.alias = alias || null
  }
}

export class Join {
  readonly type = JOIN_TYPE
  joinType: JoinString
  condition: Conditional | ['using', TargetList] | null
  lhs: Join | Relation
  rhs: Join | Relation

  constructor(lhs: Join | Relation,
              rhs: Join | Relation,
              joinType: JoinString = 'join',
              condition: Conditional | ['using', TargetList] | null = null
  ) {
    this.lhs = lhs
    this.rhs = rhs
    this.joinType = joinType || 'join'
    this.condition = condition || null
  }
}

export class Relation {
  readonly type = RELATION_TYPE
  target: Relation | Join | string
  alias: string | null

  constructor(target: Relation | Join | string,
              alias: string | null = null) {
    this.target = target
    this.alias = alias || null
  }
}

export type ConditionalOp = 'or' | 'and' | 'not' | 'in' | 'exists' | 'like' |
                            'between' | 'isnull' | '<>' | 'contains' |
                            '<=' | '>=' | '=' | '<' | '>' | '!='

export class Conditional {
  readonly type = CONDITIONAL_TYPE
  operation: ConditionalOp
  lhs: Conditional | OperandType
  rhs: Conditional | OperandType | null
  not: boolean

  constructor(operation: ConditionalOp,
              lhs: Conditional | OperandType,
              rhs: Conditional | OperandType | null = null,
              not: boolean = false) {
    if (operation === 'in' && lhs instanceof Array && lhs.length === 1)
      lhs = lhs[0]
    this.operation = operation
    this.lhs = lhs
    this.rhs = rhs || null
    this.not = not
  }
}

export class AggFunction {
  readonly type = AGGFUNCTION_TYPE
  fname: AggFuncName
  expr: OperandType | TargetClause

  constructor(fname: AggFuncName, expr: OperandType | TargetClause) {
    this.fname = fname
    this.expr = expr
  }
}

export class Operation {
  readonly type = OPERATION_TYPE
  op: OperationOps
  lhs: OperandType
  rhs: OperandType

  constructor(op: OperationOps, lhs: OperandType, rhs: OperandType) {
    this.op = op
    this.lhs = lhs
    this.rhs = rhs
  }
}
