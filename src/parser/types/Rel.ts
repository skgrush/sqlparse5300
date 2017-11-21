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

export type RelRelationish = RelRelation | RelJoin
// literals are strings
export type RelOperandType = RelOperation | string | RelColumn

export class RelOperation {
  readonly type = OPERATION_TYPE
  op: OperationOps | PairingString
  lhs: RelOperandType | HighLevelRelationish
  rhs: RelOperandType | HighLevelRelationish

  constructor(op: OperationOps | PairingString,
              lhs: RelOperandType | HighLevelRelationish,
              rhs: RelOperandType | HighLevelRelationish) {
    this.op = op
    this.lhs = lhs
    this.rhs = rhs
  }
}

type ColumnValueType = Catalog.Column | RelFunction | string

export class RelColumn {
  readonly type = COLUMN_TYPE
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
  readonly type = FUNCTION_TYPE
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
  readonly type = CONDITIONAL_TYPE
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
  readonly type = RESTRICTION_TYPE
  conditions: RelConditional
  args: HighLevelRelationish

  constructor(conditions: RelConditional, args: HighLevelRelationish) {
    this.conditions = conditions
    this.args = args
  }
}

export class RelProjection {
  readonly type = PROJECTION_TYPE
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
  readonly type = RENAME_TYPE
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
  readonly type = RELATION_TYPE
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
  readonly type = JOIN_TYPE
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
