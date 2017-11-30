import * as React from 'react'

const ReactDOMServer = require('react-dom/server')

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

export function svgRelAggregation(agg: Rel.Aggregation) {
  let attrs: JSX.Element | null = null
  if (agg.attributes && agg.attributes.length)
    attrs = (
      <tspan baselineShift="sub" className="columns">
        (
          {svgColumnList(agg.attributes)}
        )
      </tspan>
    )

  const aggregJsx = (
    <tspan className="RelAggregation">
      {attrs}
      <tspan className="operator">{getSymbol('aggregation')}</tspan>
      <tspan baselineShift="sub" className="functions">
        {svgColumnList(agg.functions)}
      </tspan>
    </tspan>
  )

  if (agg.renames.length)
    return svgRelRenameAggregate(agg.renames, aggregJsx)
  else
    return aggregJsx
}

export function svgRelRestriction(res: Rel.Restriction) {
  const SYM = getSymbol('restriction')
  const COND = svgRelConditional(res.conditions)
  return (
    <tspan className="RelRestriction">
      <tspan className="operator">{SYM}</tspan>
      <tspan baselineShift="sub" className="condition">
        {COND}
      </tspan>
    </tspan>
  )
}

export function svgRelProjection(res: Rel.Projection) {
  const SYM = getSymbol('projection')
  return (
    <tspan className="RelProjection">
      <tspan className="operator">{SYM}</tspan>
      <tspan baselineShift="sub" className="columns">
        {svgColumnList(res.columns)}
      </tspan>
    </tspan>
  )
}

export function svgColumnList(cols: Rel.Columnish[]
  ): Array<string|JSX.Element> {
  const columns: Array<string|JSX.Element> = []
  cols.forEach((col, idx) => {
    if (idx > 0)
      columns.push(",")
    if (col instanceof Rel.Column)
      columns.push(svgRelColumn(col, idx))
    else if (col instanceof Rel.RelFunction)
      columns.push(svgRelFunction(col, idx))
    else
      columns.push(col)
  })
  return columns
}

export function svgRelColumn(col: Rel.Column, iter?: number) {

  if (col.as) {
    return (
      <tspan className="RelColumn" key={iter}>
        <tspan className="column-as">{col.as}</tspan>
      </tspan>
    )
  }

  if (!col.relation) {
    return (
      <tspan className="RelColumn" key={iter}>
        <tspan className="column-name">{svgGetName(col.target)}</tspan>
      </tspan>
    )
  }

  return (
    <tspan className="RelColumn" key={iter}>
      <tspan className="relation-name">{svgGetName(col.relation)}</tspan>
      .
      <tspan className="column-name">{svgGetName(col.target)}</tspan>
    </tspan>
  )
}

export function svgRelFunction(funct: Rel.RelFunction, idx?) {
  const NAME = funct.fname.toUpperCase()
  const EXPR = funct.expr === '*'
          ? '*'
          : svgRelColumn(funct.expr)

  return (
    <tspan className="RelFunction" key={idx}>
      <tspan className="function-name">{NAME}</tspan>
      (
        {EXPR}
      )
    </tspan>
  )
}

export function svgGetName(thing) {
  if (typeof(thing) === 'string')
    return thing
  if (thing instanceof Rel.Relation)
    return thing.name
  if (thing instanceof Rel.Column)
    return thing.as || svgRelColumn(thing)
  if (thing instanceof Rel.RelFunction)
    return svgRelFunction(thing)
  if (thing instanceof Catalog.Column)
    return thing.name
  console.info("svgGetName", thing)
  throw new Error("unexpected thing to svgGetName")
}

export function svgRelRenameAggregate(renames: string[], aggregJsx: JSX.Element) {
  const SYM = getSymbol('rename')
  const OUTPUT = svgColumnList(renames)
  return (
    <tspan className="RelRename RelRename-aggregation">
      <tspan className="operator">{SYM}</tspan>
      <tspan baselineShift="sub" className="condition">
        {OUTPUT}
      </tspan>
      (
        {aggregJsx}
      )
    </tspan>
  )
}

export function svgRelRename(ren: Rel.Rename) {
  const SYM = getSymbol('rename')
  const INPUT = svgGetName(ren.input)
  const OUTPUT = ren.output

  // R as S  =>  ρ_S (R)
  if (ren.input === ren.args && ren.input instanceof Rel.Relation)
    return (
      <tspan className="RelRename RelRename-unary">
        <tspan className="operator">{SYM}</tspan>
        <tspan baselineShift="sub" className="condition">
          {OUTPUT}
        </tspan>
      </tspan>
    )

  // R.a as b  =>  ρ_{b∕R.a}(R)
  // R as S  =>  ρ_{S∕R}(...)
  return (
    <tspan className="RelRename">
      <tspan className="operator">{SYM}</tspan>
      <tspan baselineShift="sub" className="condition">
        {OUTPUT} {getSymbol('rename-divider')} {INPUT}
      </tspan>
    </tspan>
  )
}

export function svgRelRelation(rel: Rel.Relation) {
  const NAME = rel.name
  return (
    <tspan className="RelRelation">
      {NAME}
    </tspan>
  )
}

export function svgRelJoinHelper(join: Rel.Join): [string, JSX.Element | null] {
  if (typeof(join.condition) === 'string') {
    return [getSymbol(join.condition), null]
  } else if (join.condition instanceof Rel.Conditional) {
    let cond = svgRelConditional(join.condition)
    if (cond) {
      cond = (
        <tspan baselineShift="sub" className="condition">
          {cond}
        </tspan>
      )
    }
    return [getSymbol('join'), cond]
  } else {
    throw new Error(`unknown RelJoin condition ${join.condition}`)
  }
}

export function svgRelJoin(join: Rel.Join) {
  const [joinSymbol, cond] = svgRelJoinHelper(join)
  const LHS = svgHLR(join.lhs)
  const RHS = svgHLR(join.rhs)

  return (
    <tspan className="RelJoin">
      {LHS}
      <tspan className="operator">{joinSymbol}</tspan>
      {cond}
      {RHS}
    </tspan>
  )
}

export function svgRelOperation(op: Rel.Operation) {
  const OPSYM = getSymbol(op.op)
  const LHS = svgRelOperand(op.lhs)
  const RHS = svgRelOperand(op.rhs)

  return (
    <tspan className="RelOperation">
      {LHS}
      <tspan className="operator">{OPSYM}</tspan>
      {RHS}
    </tspan>
  )
}

export function svgRelOperand(operand: Rel.OperandType|Rel.HighLevelRelationish) {
  if (typeof(operand) === 'string')
    return operand
  if (operand instanceof Rel.RelFunction)
    return svgRelFunction(operand)
  if (operand instanceof Rel.Operation)
    return svgRelOperation(operand)
  if (operand instanceof Rel.Column)
    return svgRelColumn(operand)
  // throw new Error("Unexpected operand type")
  return svgHLR(operand)
}

export function svgRelConditional(cond: Rel.Conditional) {
  const OPSYM = getSymbol(cond.operation)

  let lhs
  let rhs

  if (cond.lhs instanceof Rel.Conditional)
    lhs = svgRelConditional(cond.lhs)
  else if (cond.lhs instanceof Rel.RelFunction)
    lhs = svgRelFunction(cond.lhs)
  else
    lhs = svgRelOperand(cond.lhs)

  if (cond.rhs instanceof Rel.Conditional)
    rhs = svgRelConditional(cond.rhs)
  else if (Array.isArray(cond.rhs))
    rhs = cond.rhs.map(svgRelOperand)
  else if (cond.rhs instanceof Rel.RelFunction)
    rhs = svgRelFunction(cond.rhs)
  else
    rhs = svgRelOperand(cond.rhs)

  return (
    <tspan className="RelConditional">
      <tspan className="lhs">
        {lhs}
      </tspan>
      <tspan className="operator">{OPSYM}</tspan>
      <tspan className="rhs">
        {rhs}
      </tspan>
    </tspan>
  )
}

export function svgHLR(hlr: Rel.HighLevelRelationish) {
  if (hlr instanceof Rel.Restriction)
    return svgRelRestriction(hlr)
  if (hlr instanceof Rel.Projection)
    return svgRelProjection(hlr)
  if (hlr instanceof Rel.Rename)
    return svgRelRename(hlr)
  if (hlr instanceof Rel.Operation)
    return svgRelOperation(hlr)
  if (hlr instanceof Rel.Relation)
    return svgRelRelation(hlr)
  if (hlr instanceof Rel.Join)
    return svgRelJoin(hlr)
  if (hlr instanceof Rel.Aggregation)
    return svgRelAggregation(hlr)
  console.error("unknown HLR:", hlr)
  throw new Error("Unknown type passed to svgHLR")
}

export function getSVGString(hlr: Rel.HighLevelRelationish) {
  const svg = (
    <text className="svg-hlr">{svgHLR(hlr)}</text>
  )

  return ReactDOMServer.renderToStaticMarkup(svg)
}

(window as any).getSVGString = getSVGString
