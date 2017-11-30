
import {Rel, Catalog} from './types'

type RelationSet = Set<Catalog.Relation>
type ColumnSet = Set<Catalog.Column>
type InvolvementTuple = [RelationSet, ColumnSet]

type IterableTuple<T = any, U = T> = [Iterable<T>, Iterable<U>]

export function isJoinCondition(cond: Rel.Conditional,
                                left: InvolvementTuple,
                                right: InvolvementTuple) {
  if (typeof cond.lhs === 'string' || typeof cond.rhs === 'string' ||
      cond.operation === 'or' || cond.operation === 'and' ||
      cond.operation === 'in' || Array.isArray(cond.rhs))
    return false

  const condLhs = involves(cond.lhs)[0]
  const condRhs = involves(cond.rhs)[0]

  const condLhs_left_exclusive = new Set()
  const condLhs_right_exclusive = new Set()
  const condRhs_left_exclusive = new Set()
  const condRhs_right_exclusive = new Set()
  condLhs.forEach((rel) => {
    if (left[0].has(rel) && !right[0].has(rel) && !condRhs.has(rel))
      condLhs_left_exclusive.add(rel)
    else if (right[0].has(rel) && !left[0].has(rel) && !condLhs.has(rel))
      condLhs_right_exclusive.add(rel)
  })
  condRhs.forEach((rel) => {
    if (left[0].has(rel) && !right[0].has(rel) && !condLhs.has(rel))
      condRhs_left_exclusive.add(rel)
    else if (right[0].has(rel) && !left[0].has(rel) && !condRhs.has(rel))
      condRhs_right_exclusive.add(rel)
  })

  if (condLhs_left_exclusive.size && condRhs_right_exclusive.size &&
      !condLhs_right_exclusive.size && !condRhs_left_exclusive.size)
    return 'join'
  if (!condLhs_left_exclusive.size && !condRhs_right_exclusive.size &&
      condLhs_right_exclusive.size && condRhs_left_exclusive.size)
    return 'join-swap'

  return false
}

/**
 * Set([A, B]) = _union([A], [B])
 *
 * let x = new Set([A])
 * _union(x, Set([B]))
 * x == Set([A, B])
 */
function _union<T>(base: Iterable<T> | null,
                   ...args: Array<Iterable<T>>): Set<T> {
  let newSet: Set<T>
  if (!base)
    newSet = new Set<T>()
  else if (!(base instanceof Set))
    newSet = new Set<T>(base)
  else
    newSet = base

  for (const arg of args) {
    for (const b of arg) {
      newSet.add(b)
    }
  }
  return newSet
}

function _unionZip(base: InvolvementTuple, arg: IterableTuple): void
function _unionZip<T, U>(base: [Set<T>, Set<U>], arg: IterableTuple<T, U>): void {
  _union(base[0], arg[0])
  _union(base[1], arg[1])
}

function newInvolvementTuple(relations: Iterable<Catalog.Relation> = [],
                             columns: Iterable<Catalog.Column> = []
  ): InvolvementTuple {
  return [
    new Set(relations),
    new Set(columns)
  ]
}

type Involvable = Rel.HighLevelRelationish | Rel.Column | Rel.Conditional |
                  Rel.RelFunction

export function involves(involved: Involvable): InvolvementTuple {
  if (involved instanceof Rel.HLR)
    switch (involved.type) {
      case Rel.HLRTypeString.Aggregation:
        return involves_Aggregation(involved as Rel.Aggregation)
      case Rel.HLRTypeString.Restriction:
        return involves_Restriction(involved as Rel.Restriction)
      case Rel.HLRTypeString.Projection:
        return involves_Projection(involved as Rel.Projection)
      case Rel.HLRTypeString.Rename:
        return involves_Rename(involved as Rel.Rename)
      case Rel.HLRTypeString.Relation:
        return involves_Relation(involved as Rel.Relation)
      case Rel.HLRTypeString.Join:
        return involves_Join(involved as Rel.Join)
      case Rel.HLRTypeString.Operation:
        return involves_Operation(involved as Rel.Operation)

      default:
        console.info("Unexpected HLR", involved.type)
        throw new Error(`Unexpected Rel.HLRTypeString "${involved.type}"`)
    }
  else if (involved instanceof Rel.Column)
    return involves_Column(involved)
  else if (involved instanceof Rel.Conditional)
    return involves_Conditional(involved)
  else if (involved instanceof Rel.RelFunction) {
    // TODO: is this one needed?
    throw new Error("involves_Function() not implemented")
  } else {
    console.error("involved:", involved)
    throw new Error("Unexpected type to involves()")
  }
}

function involves_Operand(operand: Rel.OperandType|Rel.HighLevelRelationish
  ): null|InvolvementTuple {
  if (typeof operand === 'string')
    return null
  else if (operand instanceof Rel.Column)
    return involves_Column(operand)
  else if (operand instanceof Rel.HLR) {
    return involves(operand as Rel.HighLevelRelationish)
  }
  console.error("involves_Operand", operand)
  throw new Error("Unexpected argument to involves_Operand")
}

function involves_Operation(op: Rel.Operation): InvolvementTuple {
  const invTuple = newInvolvementTuple()

  const lhsInv = involves_Operand(op.lhs)
  const rhsInv = involves_Operand(op.rhs)

  if (lhsInv) _unionZip(invTuple, lhsInv)
  if (rhsInv) _unionZip(invTuple, rhsInv)

  return invTuple
}

function involves_Relation(relation: Rel.Relation): InvolvementTuple {
  const invTuple = newInvolvementTuple([relation.target])
  // TODO: should this add all of the relation's columns too??
  return invTuple
}

function involves_Function(funct: Rel.RelFunction): InvolvementTuple {
  const invTuple = newInvolvementTuple()
  const {fname, expr} = funct

  if (expr === '*') {
    if (!funct.hlr)
      throw new Error("RelFunction of '*' with no hlr-hint")
    _unionZip(invTuple, involves(funct.hlr))
  } else if (expr instanceof Rel.Column)
    _unionZip(invTuple, involves_Column(expr))
  else {
    console.error("involves_Function", funct)
    throw new Error("Unexpected argument to involves_Function")
  }

  return invTuple
}

function involves_Column(col: Rel.Column): InvolvementTuple {
  const invTuple = newInvolvementTuple()
  const target = col.target

  if (col.relation)
    invTuple[0].add(col.relation.target)

  if (target instanceof Catalog.Column)
    invTuple[1].add(target)
  else if (target instanceof Rel.RelFunction) {
    involves_Function(target)
  } else if (typeof target === 'string') {
    // don't do anything
  } else
    throw new Error("Unexpected argument to involves_Column")

  return invTuple
}

function involves_Join(join: Rel.Join): InvolvementTuple {
  const invTuple = newInvolvementTuple()

  const lhsInv = involves_Operand(join.lhs)
  const rhsInv = involves_Operand(join.rhs)
  const conInv = join.condition instanceof Rel.Conditional
                  ? involves_Conditional(join.condition)
                  : null

  if (lhsInv) _unionZip(invTuple, lhsInv)
  if (rhsInv) _unionZip(invTuple, rhsInv)
  if (conInv) _unionZip(invTuple, conInv)

  return invTuple
}

function involves_Conditional(conditional: Rel.Conditional): InvolvementTuple {
  const invTuple = newInvolvementTuple()

  const {lhs, rhs} = conditional

  if (lhs instanceof Rel.Conditional)
    _unionZip(invTuple, involves_Conditional(lhs))
  else if (lhs instanceof Rel.RelFunction)
    _unionZip(invTuple, involves_Function(lhs))
  else {
    const inv = involves_Operand(lhs)
    if (inv) _unionZip(invTuple, inv)
  }

  if (rhs instanceof Rel.Conditional)
    _unionZip(invTuple, involves_Conditional(rhs))
  else if (rhs instanceof Rel.RelFunction)
    _unionZip(invTuple, involves_Function(rhs))
  else if (Array.isArray(rhs))
    for (const operand of rhs) {
      const inv = involves_Operand(operand)
      if (inv) _unionZip(invTuple, inv)
    }
  else {
    const inv = involves_Operand(rhs)
    if (inv) _unionZip(invTuple, inv)
  }

  return invTuple
}

function involves_Restriction(restriction: Rel.Restriction): InvolvementTuple {
  const invTuple = newInvolvementTuple()

  _unionZip(invTuple, involves_Conditional(restriction.conditions))
  _unionZip(invTuple, involves(restriction.args))

  return invTuple
}

function involves_Projection(projection: Rel.Projection): InvolvementTuple {
  const invTuple = newInvolvementTuple()

  projection.columns.forEach((col) => {
    if (col instanceof Rel.Column)
      _unionZip(invTuple, involves_Column(col))
    else {
      // TODO: col is a literal; should we do anything?
    }
  })

  // TODO: should the Column involvement be reset?
  const invArgs = involves(projection.args)
  // if (column involvement should be reset)
  //   invArgs[1].clear()
  _unionZip(invTuple, invArgs)

  return invTuple
}

function involves_Rename(ren: Rel.Rename): InvolvementTuple {
  // const invTuple = newInvolvementTuple()
  // TODO: Do we really need to do anything with ren.input?? Assuming not
  return involves(ren.args)
}

function involves_Aggregation(agg: Rel.Aggregation): InvolvementTuple {
  const invTuple = newInvolvementTuple()

  agg.attributes.forEach((col) => _unionZip(invTuple, involves_Column(col)))
  // TODO: do anything with agg.functions ?
  _unionZip(invTuple, involves(agg.relation))

  return invTuple
}
