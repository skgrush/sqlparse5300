import * as React from 'react'

import * as types from './types'

export function getSymbol(input: string) {
  switch (input) {
    // passthroughs
    case '||':
    case '+':
    case '-':
    case '*':
    case '/':
    case '<':
    case '>':
      return input

    case 'restriction':
      return "σ"
    case 'projection':
      return "Π"
    case 'rename':
      return "ρ"
    case 'rename-divider':
      return "∕"

    case 'union':
      return "∪"
    case 'intersect':
      return "∩"
    case 'except':
      return "−"

    case 'join':
      return "⋈"
    case 'left':
    case 'ljoin':
      return "⋉"
    case 'right':
    case 'rjoin':
      return "⋊"
    case 'cross':
    case 'crossjoin':
      return "⨉"
    case 'divide':
      return "÷"

    case 'eq':
      return "="
    case 'neq':
      return "≠"
    case 'leq':
      return "≤"
    case 'geq':
      return "≥"
    case 'and':
      return "∧"
    case 'or':
      return "∨"
    case 'in':
      return "∊"
    default:
      throw new Error(`Unknown symbol name "${input}"`)
  }
}

export function htmlRelRestriction(res: types.RelRestriction) {
  const SYM = getSymbol('restriction')
  const COND = htmlRelConditional(res.conditions)
  const ARGS = htmlHLR(res.args)
  return (
    <span className="RelRestriction">
      <span className="operator">{SYM}</span>
      <sub className="condition">
        {COND}
      </sub>
      (
        <span className="HLR">
          {ARGS}
        </span>
      )
    </span>
  )
}

export function htmlRelProjection(res: types.RelProjection) {
  const SYM = getSymbol('projection')
  const COLUMNS: Array<string|HTMLSpanElement> = []
  res.columns.forEach((col, idx) => {
    if (idx > 0)
      COLUMNS.push(",")
    COLUMNS.push(htmlRelColumn(col, idx))
  })
  const ARGS = htmlHLR(res.args)
  return (
    <span className="RelProjection">
      <span className="operator">{SYM}</span>
      <sub className="columns">
        {COLUMNS}
      </sub>
      (
        <span className="HLR">
          {ARGS}
        </span>
      )
    </span>
  )
}

export function htmlRelColumn(col: types.RelColumn, iter?: number) {
  const RELNAME = getName(col.relation)
  const NAME = col.name

  return (
    <span className="RelColumn" key={iter}>
      <span className="relation-name">{RELNAME}</span>
      .
      <span className="column-name">{NAME}</span>
    </span>
  )
}

export function htmlRelFunction(funct: types.RelFunction) {
  const NAME = funct.fname.toUpperCase()
  const EXPR = funct.expr === '*'
          ? '*'
          : htmlRelColumn(funct.expr)

  return (
    <span className="RelFunction">
      <span className="function-name">{NAME}</span>
      (
        {EXPR}
      )
    </span>
  )
}

export function getName(thing) {
  if (typeof(thing) === 'string')
    return thing
  if (thing instanceof types.RelRelation)
    return thing.name
  if (thing instanceof types.RelColumn)
    return thing.name
  if (thing instanceof types.RelFunction)
    return htmlRelFunction(thing as types.RelFunction)
  throw new Error("unexpected thing to getName")
}

export function htmlRelRename(ren: types.RelRename) {
  const SYM = getSymbol('rename')
  const INPUT = getName(ren.input)
  const OUTPUT = ren.output
  const ARGS = htmlHLR(ren.args as types.HighLevelRelationish)

  return (
    <span className="RelRename">
      <span className="operator">{SYM}</span>
      <sub className="condition">
        {OUTPUT} {getSymbol('rename-divider')} {INPUT}
      </sub>
      (
        <span className="HLR">
          {ARGS}
        </span>
      )
    </span>
  )
}

export function htmlRelRelation(rel: types.RelRelation) {
  const NAME = rel.name
  return (
    <span className="RelRelation">
      {NAME}
    </span>
  )
}

export function htmlRelJoin(join: types.RelJoin) {
  let joinSymbol
  let cond
  if (typeof(join.condition) === 'string') {
    joinSymbol = getSymbol(join.condition)
    cond = null
  } else if (join.condition instanceof types.RelConditional) {
    joinSymbol = getSymbol('join')
    cond = htmlRelConditional(join.condition)
  } else {
    throw new Error(`unknown RelJoin condition ${join.condition}`)
  }
  const LHS = htmlHLR(join.lhs)
  const RHS = htmlHLR(join.rhs)

  return (
    <span className="RelJoin">
      {LHS}
      <span className="operator">{joinSymbol}</span>
      {
        cond && (
          <sub className="condition">
            {cond}
          </sub>
        )
      }
      {RHS}
    </span>
  )
}

function _htmlRelOperandOrHLR(operandOrHLR: types.RelOperandType | types.HighLevelRelationish) {
  try {
    return htmlRelOperand(operandOrHLR as types.RelOperandType)
  } catch (ex) {
    if (ex.message === "Unexpected operand type") {
      return htmlHLR(operandOrHLR as types.HighLevelRelationish)
    }
  }
}

export function htmlRelOperation(op: types.RelOperation) {
  const OPSYM = getSymbol(op.op)
  const LHS = _htmlRelOperandOrHLR(op.lhs)
  const RHS = _htmlRelOperandOrHLR(op.rhs)

  return (
    <span className="RelOperation">
      {LHS}
      <span className="operator">{OPSYM}</span>
      {RHS}
    </span>
  )
}

export function htmlRelOperand(operand: types.RelOperandType) {
  if (typeof(operand) === 'string')
    return operand
  if (operand instanceof types.RelOperation)
    return htmlRelOperation(operand)
  if (operand instanceof types.RelColumn)
    return htmlRelColumn(operand)
  throw new Error("Unexpected operand type")
}

export function htmlRelConditional(cond: types.RelConditional) {
  const OPSYM = getSymbol(cond.operation)
  const LHS = cond.lhs instanceof types.RelConditional
          ? htmlRelConditional(cond.lhs)
          : htmlRelOperand(cond.lhs)
  const RHS = cond.rhs instanceof types.RelConditional
          ? htmlRelConditional(cond.rhs)
          : ( cond.rhs instanceof Array
              ? cond.rhs.map(htmlRelOperand)
              : htmlRelOperand(cond.rhs)
            )

  return (
    <span className="RelConditional">
      <span className="lhs">
        {LHS}
      </span>
      <span className="operator">{OPSYM}</span>
      <span className="rhs">
        {RHS}
      </span>
    </span>
  )
}

export function htmlHLR(hlr: types.HighLevelRelationish) {
  if (hlr instanceof types.RelRestriction)
    return htmlRelRestriction(hlr)
  if (hlr instanceof types.RelProjection)
    return htmlRelProjection(hlr)
  if (hlr instanceof types.RelRename)
    return htmlRelRename(hlr)
  if (hlr instanceof types.RelOperation)
    return htmlRelOperation(hlr)
  if (hlr instanceof types.RelRelation)
    return htmlRelRelation(hlr)
  if (hlr instanceof types.RelJoin)
    return htmlRelJoin(hlr)
  throw new Error("Unknown type passed to htmlHLR")
}
