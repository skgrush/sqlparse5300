import * as React from 'react'

import {Rel, Sql, Catalog} from './types'

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

export function htmlARGS(args: Rel.HighLevelRelationish, noargs = false) {
  if (noargs) {
    return null
  } else {
    const ARGS = htmlHLR(args)
    return (
      <span className="args">
        (
          <span className="HLR">
            {ARGS}
          </span>
        )
      </span>
    )
  }
}

export function htmlRelRestriction(res: Rel.Restriction, noargs = false) {
  const SYM = getSymbol('restriction')
  const COND = htmlRelConditional(res.conditions)
  const ARGS = htmlARGS(res.args, noargs)
  return (
    <span className="RelRestriction">
      <span className="operator">{SYM}</span>
      <sub className="condition">
        {COND}
      </sub>
      {ARGS}
    </span>
  )
}

export function htmlRelProjection(res: Rel.Projection, noargs = false) {
  const SYM = getSymbol('projection')
  const COLUMNS: Array<string|HTMLSpanElement> = []
  res.columns.forEach((col, idx) => {
    if (idx > 0)
      COLUMNS.push(",")
    if (col instanceof Rel.Column)
      COLUMNS.push(htmlRelColumn(col, idx))
    else if ((col as any) instanceof Rel.RelFunction)
      COLUMNS.push(htmlRelFunction(col, idx))
    else
      COLUMNS.push(col)
  })
  const ARGS = htmlARGS(res.args, noargs)
  return (
    <span className="RelProjection">
      <span className="operator">{SYM}</span>
      <sub className="columns">
        {COLUMNS}
      </sub>
      {ARGS}
    </span>
  )
}

export function htmlRelColumn(col: Rel.Column, iter?: number) {

  if (col.as) {
    return (
      <span className="RelColumn" key={iter}>
        <span className="column-as">{col.as}</span>
      </span>
    )
  }

  if (!col.relation) {
    return (
      <span className="RelColumn" key={iter}>
        <span className="column-name">{getName(col.target)}</span>
      </span>
    )
  }

  return (
    <span className="RelColumn" key={iter}>
      <span className="relation-name">{getName(col.relation)}</span>
      .
      <span className="column-name">{getName(col.target)}</span>
    </span>
  )
}

export function htmlRelFunction(funct: Rel.RelFunction, idx?) {
  const NAME = funct.fname.toUpperCase()
  const EXPR = funct.expr === '*'
          ? '*'
          : htmlRelColumn(funct.expr)

  return (
    <span className="RelFunction" key={idx}>
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
  if (thing instanceof Rel.Relation)
    return thing.name
  if (thing instanceof Rel.Column)
    return thing.as || htmlRelColumn(thing)
  if (thing instanceof Rel.RelFunction)
    return htmlRelFunction(thing as Rel.RelFunction)
  if (thing instanceof Catalog.Column)
    return thing.name
  console.info("getName", thing)
  throw new Error("unexpected thing to getName")
}

export function htmlRelRename(ren: Rel.Rename, noargs = false) {
  const SYM = getSymbol('rename')
  const INPUT = getName(ren.input)
  const OUTPUT = ren.output
  const ARGS = htmlARGS(ren.args, noargs)

  return (
    <span className="RelRename">
      <span className="operator">{SYM}</span>
      <sub className="condition">
        {OUTPUT} {getSymbol('rename-divider')} {INPUT}
      </sub>
      {ARGS}
    </span>
  )
}

export function htmlRelRelation(rel: Rel.Relation) {
  const NAME = rel.name
  return (
    <span className="RelRelation">
      {NAME}
    </span>
  )
}

export function relJoinHelper(join: Rel.Join): [string, JSX.Element | null] {
  if (typeof(join.condition) === 'string') {
    return [getSymbol(join.condition), null]
  } else if (join.condition instanceof Rel.Conditional) {
    let cond = htmlRelConditional(join.condition)
    if (cond) {
      cond = (
        <sub className="condition">
          {cond}
        </sub>
      )
    }
    return [getSymbol('join'), cond]
  } else {
    throw new Error(`unknown RelJoin condition ${join.condition}`)
  }
}

export function htmlRelJoin(join: Rel.Join) {
  const [joinSymbol, cond] = relJoinHelper(join)
  const LHS = htmlHLR(join.lhs)
  const RHS = htmlHLR(join.rhs)

  return (
    <span className="RelJoin">
      {LHS}
      <span className="operator">{joinSymbol}</span>
      {cond}
      {RHS}
    </span>
  )
}

export function htmlRelOperation(op: Rel.Operation) {
  const OPSYM = getSymbol(op.op)
  const LHS = htmlRelOperand(op.lhs as any)
  const RHS = htmlRelOperand(op.rhs as any)

  return (
    <span className="RelOperation">
      {LHS}
      <span className="operator">{OPSYM}</span>
      {RHS}
    </span>
  )
}

export function htmlRelOperand(operand: Rel.OperandType) {
  if (typeof(operand) === 'string')
    return operand
  if (operand instanceof Rel.RelFunction)
    return htmlRelFunction(operand)
  if (operand instanceof Rel.Operation)
    return htmlRelOperation(operand)
  if (operand instanceof Rel.Column)
    return htmlRelColumn(operand)
  // throw new Error("Unexpected operand type")
  return htmlHLR(operand)
}

export function htmlRelConditional(cond: Rel.Conditional) {
  const OPSYM = getSymbol(cond.operation)
  const LHS = cond.lhs instanceof Rel.Conditional
          ? htmlRelConditional(cond.lhs)
          : htmlRelOperand(cond.lhs)
  const RHS = cond.rhs instanceof Rel.Conditional
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

export function htmlHLR(hlr: Rel.HighLevelRelationish) {
  if (hlr instanceof Rel.Restriction)
    return htmlRelRestriction(hlr)
  if (hlr instanceof Rel.Projection)
    return htmlRelProjection(hlr)
  if (hlr instanceof Rel.Rename)
    return htmlRelRename(hlr)
  if (hlr instanceof Rel.Operation)
    return htmlRelOperation(hlr)
  if (hlr instanceof Rel.Relation)
    return htmlRelRelation(hlr)
  if (hlr instanceof Rel.Join)
    return htmlRelJoin(hlr)
  console.error("unknown HLR:", hlr)
  throw new Error("Unknown type passed to htmlHLR")
}
