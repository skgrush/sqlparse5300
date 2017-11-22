import {OperationOps, PairingString, AggFuncName} from './index'
import * as Catalog from './Catalog'

export const RESTRICTION_TYPE = "restriction"
export const PROJECTION_TYPE  = "projection"
export const RENAME_TYPE      = "rename"

export const RELATION_TYPE    = "relrelation"
export const COLUMN_TYPE      = "relcolumn"
export const CONDITIONAL_TYPE = "relconditional"
export const JOIN_TYPE        = "reljoin"
export const FUNCTION_TYPE    = "relfunt"
export const OPERATION_TYPE   = "relop"

export type Relationish = Relation | Join
// literals are strings
export type OperandType = Operation | string | Column

export class Operation {
  readonly type = OPERATION_TYPE
  op: OperationOps | PairingString
  lhs: OperandType | HighLevelRelationish
  rhs: OperandType | HighLevelRelationish

  constructor(op: OperationOps | PairingString,
              lhs: OperandType | HighLevelRelationish,
              rhs: OperandType | HighLevelRelationish) {
    this.op = op
    this.lhs = lhs
    this.rhs = rhs
  }
}

type ColumnValueType = Catalog.Column | RelFunction | string

export class Column {
  readonly type = COLUMN_TYPE
  relation: Relation | null
  target: ColumnValueType
  as: string | null

  constructor(relation: Relation | null,
              target: ColumnValueType,
              As: string | null = null) {
    this.relation = relation
    this.target = target
    this.as = As || null
  }

  alias(alias?: string) {
    if (!alias)
      return this
    return new Column(this.relation, this.target, alias)
  }
}

export class RelFunction {
  readonly type = FUNCTION_TYPE
  fname: AggFuncName
  expr: '*' | Column // TODO: support correct args

  constructor(fname: AggFuncName, expr: '*' | Column) {
    this.fname = fname
    this.expr = expr
  }
}

export type ThetaOp = 'eq' | 'neq' | 'leq' | 'geq' | '<' | '>' | 'and' | 'or' |
                      'in'

export class Conditional {
  readonly type = CONDITIONAL_TYPE
  operation: ThetaOp
  lhs: OperandType | Conditional
  rhs: OperandType | Conditional | OperandType[]

  constructor(op: ThetaOp, lhs: OperandType | Conditional,
              rhs: OperandType | Conditional | OperandType[]) {
    this.operation = op
    this.lhs = lhs
    this.rhs = rhs
  }
}

export type HighLevelRelationish = Relationish | Restriction | Projection | Rename | Operation

export class Restriction {
  readonly type = RESTRICTION_TYPE
  conditions: Conditional
  args: HighLevelRelationish

  constructor(conditions: Conditional, args: HighLevelRelationish) {
    this.conditions = conditions
    this.args = args
  }
}

export class Projection {
  readonly type = PROJECTION_TYPE
  columns: Column[]
  args: HighLevelRelationish

  constructor(columns: Column[], args: HighLevelRelationish) {
    this.columns = columns
    this.args = args
  }
}

type _RenameInputType = Relation | Column | RelFunction |
                           Rename | string

export class Rename {
  readonly type = RENAME_TYPE
  input: _RenameInputType
  output: string
  args: HighLevelRelationish

  constructor(input: _RenameInputType,
              output: string,
              args: HighLevelRelationish) {
    this.input = input
    this.output = output
    this.args = args
  }
}

export class Relation {
  readonly type = RELATION_TYPE
  name: string

  constructor(name: string) {
    this.name = name
  }
}

export type JoinCond = "cross" | "left" | "right" | Conditional

// cross
// natural (no condition)
// theta join (with condition)
// semi (left and right)
export class Join {
  readonly type = JOIN_TYPE
  lhs: HighLevelRelationish
  rhs: HighLevelRelationish
  condition: JoinCond

  constructor(lhs: HighLevelRelationish,
              rhs: HighLevelRelationish,
              cond: JoinCond) {
    this.lhs = lhs
    this.rhs = rhs
    this.condition = cond
  }
}
