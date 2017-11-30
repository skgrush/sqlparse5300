import {OperationOps, PairingString, AggFuncName, OrderingCondition
        } from './index'
import * as Catalog from './Catalog'

// literals are strings
export type OperandType = string | Operation | Column
export type Ordering = [Column | string, OrderingCondition]
export type ColumnValueType = Catalog.Column | RelFunction | string
export type Columnish = Column | RelFunction | string
export type Joinish = Join | PairingOperation
export type HighLevelRelationish = Relation | Join | Restriction | Projection |
                                   Rename | Operation | Aggregation

/* enumerated strings attached to class instances.
 * Useful for JSON output.
 * CAN be used for quick comparison, but **instanceof should be prefered**.
 */
export const enum TypeString {
  Aggregation = "aggregation",
  Restriction = "restriction",
  Projection = "projection",
  Rename = "rename",
  Relation = "relation",
  Column = "column",
  Conditional = "conditional",
  Join = "join",
  Function = "funct",
  Operation = "op"
}

export const enum HLRTypeString {
  Aggregation = TypeString.Aggregation,
  Restriction = TypeString.Restriction,
  Projection = TypeString.Projection,
  Rename = TypeString.Rename,
  Relation = TypeString.Relation,
  Join = TypeString.Join,
  Operation = TypeString.Operation
}

export abstract class HLR {
  readonly abstract type: HLRTypeString

  constructor() {}
}

export class Operation extends HLR {
  readonly type = HLRTypeString.Operation
  op: OperationOps | PairingString
  lhs: OperandType | HighLevelRelationish
  rhs: OperandType | HighLevelRelationish

  constructor(op: OperationOps | PairingString,
              lhs: OperandType | HighLevelRelationish,
              rhs: OperandType | HighLevelRelationish) {
    super()
    this.op = op
    this.lhs = lhs
    this.rhs = rhs
  }
}

export interface PairingOperation extends Operation {
  op: PairingString
  lhs: HighLevelRelationish
  rhs: HighLevelRelationish
}

export class Column {
  readonly type = TypeString.Column
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
  readonly type = TypeString.Function
  fname: AggFuncName
  expr: '*' | Column // TODO: support correct args
  hlr?: HighLevelRelationish

  constructor(fname: AggFuncName,
              expr: '*' | Column,
              hlr?: HighLevelRelationish) {
    this.fname = fname
    this.expr = expr
    if (hlr)
      this.hlr = hlr
  }

  getName(): string {
    if (this.expr === '*')
      return `${this.fname}_*`
    else if (this.expr.as)
      return `${this.fname}_${this.expr.as}`
    else {
      console.error("Failure to name RelFunction", this)
      throw new Error("Couldn't produce name for RelFunction")
    }
  }
}

export class Aggregation extends HLR {
  readonly type = HLRTypeString.Aggregation
  attributes: Column[]
  functions: RelFunction[]
  relation: HighLevelRelationish
  renames: string[]

  constructor(attributes: Column[], functions: RelFunction[],
              relation: HighLevelRelationish, renames: string[]) {
    super()
    this.attributes = attributes
    this.functions = functions
    this.relation = relation
    this.renames = renames

    if (renames.length &&
        renames.length !== (attributes.length + functions.length)) {
      const [rl, al, fl] = [renames.length, attributes.length, functions.length]
      console.error("Bad number of renames;", renames, attributes, functions)
      throw new Error(`Bad number of renames; ${rl} != ${al} + ${fl}`)
    }
  }
}

export type ThetaOp = 'eq' | 'neq' | 'leq' | 'geq' | '<' | '>' | 'and' | 'or' |
                      'in'
export type ConditionalArgumentType = OperandType | RelFunction | Conditional

export class Conditional {
  readonly type = TypeString.Conditional
  operation: ThetaOp
  lhs: ConditionalArgumentType
  rhs: ConditionalArgumentType | OperandType[]

  constructor(op: ThetaOp,
              lhs: ConditionalArgumentType,
              rhs: ConditionalArgumentType | OperandType[]) {
    this.operation = op.toLowerCase() as ThetaOp
    this.lhs = lhs
    this.rhs = rhs
  }
}

export class Restriction extends HLR {
  readonly type = HLRTypeString.Restriction
  conditions: Conditional
  args: HighLevelRelationish

  constructor(conditions: Conditional, args: HighLevelRelationish) {
    super()
    this.conditions = conditions
    this.args = args
  }
}

export class Projection extends HLR {
  readonly type = HLRTypeString.Projection
  columns: Array<string|Column>
  args: HighLevelRelationish

  constructor(columns: Array<string|Column>, args: HighLevelRelationish) {
    super()
    this.columns = columns
    this.args = args
  }
}

type _RenameInputType = Relation | Column | RelFunction |
                           Rename | string

export class Rename extends HLR {
  readonly type = HLRTypeString.Rename
  input: _RenameInputType
  output: string
  args: HighLevelRelationish

  constructor(input: _RenameInputType,
              output: string,
              args: HighLevelRelationish) {
    super()
    this.input = input
    this.output = output
    this.args = args
  }
}

export class Relation extends HLR {
  static fromCata(target: Catalog.Relation): Relation {
    return new Relation(target.name, target)
  }

  readonly type = HLRTypeString.Relation
  readonly name: string
  readonly target: Catalog.Relation

  constructor(name: string, target: Catalog.Relation) {
    super()
    this.name = name
    this.target = target
  }
}

export type JoinCond = "cross" | "left" | "right" | Conditional

// cross
// natural (no condition)
// theta join (with condition)
// semi (left and right)
export class Join extends HLR {
  readonly type = HLRTypeString.Join
  lhs: HighLevelRelationish
  rhs: HighLevelRelationish
  condition: JoinCond

  constructor(lhs: HighLevelRelationish,
              rhs: HighLevelRelationish,
              cond: JoinCond) {
    super()
    this.lhs = lhs
    this.rhs = rhs
    this.condition = cond
  }
}
