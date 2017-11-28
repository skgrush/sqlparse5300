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

    case 'aggregation':
      return "ℑ" // U+2111
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

export function htmlRelAggregation(agg: Rel.Aggregation, noargs = false) {
  let attrs: JSX.Element | null = null
  if (agg.attributes && agg.attributes.length)
    attrs = (
      <sub className="columns">
        (
          {htmlColumnList(agg.attributes)}
        )
      </sub>
    )

  const aggregJsx = (
    <span className="RelAggregation">
      {attrs}
      <span className="operator">{getSymbol('aggregation')}</span>
      <sub className="functions">
        {htmlColumnList(agg.functions)}
      </sub>
      {htmlARGS(agg.relation, noargs)}
    </span>
  )

  if (agg.renames.length)
    return htmlRelRenameAggregate(agg.renames, aggregJsx)
  else
    return aggregJsx
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
  const ARGS = htmlARGS(res.args, noargs)
  return (
    <span className="RelProjection">
      <span className="operator">{SYM}</span>
      <sub className="columns">
        {htmlColumnList(res.columns)}
      </sub>
      {ARGS}
    </span>
  )
}

export function htmlColumnList(cols: Array<string|Rel.Column|Rel.RelFunction>
  ): Array<string|JSX.Element> {
  const columns: Array<string|JSX.Element> = []
  cols.forEach((col, idx) => {
    if (idx > 0)
      columns.push(",")
    if (col instanceof Rel.Column)
      columns.push(htmlRelColumn(col, idx))
    else if (col instanceof Rel.RelFunction)
      columns.push(htmlRelFunction(col, idx))
    else
      columns.push(col)
  })
  return columns
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

export function htmlRelRenameAggregate(renames: string[], aggregJsx: JSX.Element) {
  const SYM = getSymbol('rename')
  const OUTPUT = htmlColumnList(renames)
  return (
    <span className="RelRename RelRename-aggregation">
      <span className="operator">{SYM}</span>
      <sub className="condition">
        {OUTPUT}
      </sub>
      (
        {aggregJsx}
      )
    </span>
  )
}

export function htmlRelRename(ren: Rel.Rename, noargs = false) {
  const SYM = getSymbol('rename')
  const INPUT = getName(ren.input)
  const OUTPUT = ren.output
  const ARGS = htmlARGS(ren.args, noargs)

  // R as S  =>  ρ_S (R)
  if (ren.input === ren.args && ren.input instanceof Rel.Relation)
    return (
      <span className="RelRename RelRename-unary">
        <span className="operator">{SYM}</span>
        <sub className="condition">
          {OUTPUT}
        </sub>
        {ARGS}
      </span>
    )

  // R.a as b  =>  ρ_{b∕R.a}(R)
  // R as S  =>  ρ_{S∕R}(...)
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
  const LHS = htmlRelOperand(op.lhs)
  const RHS = htmlRelOperand(op.rhs)

  return (
    <span className="RelOperation">
      {LHS}
      <span className="operator">{OPSYM}</span>
      {RHS}
    </span>
  )
}

export function htmlRelOperand(operand: Rel.OperandType|Rel.HighLevelRelationish) {
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

  let lhs
  let rhs

  if (cond.lhs instanceof Rel.Conditional)
    lhs = htmlRelConditional(cond.lhs)
  else if (cond.lhs instanceof Rel.RelFunction)
    lhs = htmlRelFunction(cond.lhs)
  else
    lhs = htmlRelOperand(cond.lhs)

  if (cond.rhs instanceof Rel.Conditional)
    rhs = htmlRelConditional(cond.rhs)
  else if (Array.isArray(cond.rhs))
    rhs = cond.rhs.map(htmlRelOperand)
  else if (cond.rhs instanceof Rel.RelFunction)
    rhs = htmlRelFunction(cond.rhs)
  else
    rhs = htmlRelOperand(cond.rhs)

  return (
    <span className="RelConditional">
      <span className="lhs">
        {lhs}
      </span>
      <span className="operator">{OPSYM}</span>
      <span className="rhs">
        {rhs}
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
  if (hlr instanceof Rel.Aggregation)
    return htmlRelAggregation(hlr)
  console.error("unknown HLR:", hlr)
  throw new Error("Unknown type passed to htmlHLR")
}
