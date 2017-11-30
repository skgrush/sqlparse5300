
import {Rel, Catalog, PairingString} from './types'
import {involves} from './relAnalysis'

/**
 * arrayExtend(a, b)
 * Appends b elements to a, modifying a in place and returning it.
 */
function arrayExtend<U, V>(a: U[], b: V[]): Array<U|V> {
  Array.prototype.push.apply(a, b)
  return a
}

function inArray<U, V>(thing: U, array: V[]) {
  return (array as Array<U|V>).indexOf(thing) !== -1
}

function recursiveConditionSplit(cond: Rel.Conditional,
                                 op: 'and' | 'or'
  ) {

  if (cond.operation !== op || Array.isArray(cond.rhs))
    return [cond]

  const args: Rel.Conditional[] = []
  for (const hs of [cond.lhs, cond.rhs]) {
    if (!(hs instanceof Rel.Conditional)) {
      console.error("recursiveConditionSplit:", hs, cond, op)
      throw new Error("non-conditional parameter")
    }
    arrayExtend(args, recursiveConditionSplit(hs, op))
  }

  return args
}

/** Transformation Rule #1: Cascade of σ */
function cascadeRestrictions(restr: Rel.Restriction, returnNew = false) {

  if (restr.conditions.operation !== 'and')
    return restr

  const conditions = recursiveConditionSplit(restr.conditions, 'and')
  const topCondition = conditions.pop()
  if (!topCondition) {
    console.error("cascadeRestrictions:", restr, conditions, topCondition)
    throw new Error("Unexpectedly empty conditions")
  }

  let newHLR = restr.args
  for (const cond of conditions) {
    newHLR = new Rel.Restriction(cond, newHLR)
  }

  if (returnNew)
    return new Rel.Restriction(topCondition, newHLR)

  return Object.assign(restr, {
    conditions: topCondition,
    args: newHLR
  })
}

/** Transformation Rule #1: Cascade of σ (reverse) */
function rollupRestrictions(restr: Rel.Restriction, returnNew = false) {

  // doesn't include restr.conditions
  const conditionList: Rel.Conditional[] = []

  let bottomHLR: Rel.HighLevelRelationish = restr.args
  while (bottomHLR instanceof Rel.Restriction) {
    conditionList.push(bottomHLR.conditions)
    bottomHLR = bottomHLR.args
  }

  const newCondition = conditionList.reduce((accumulator, currentValue) => {
    return new Rel.Conditional('and', accumulator, currentValue)
  }, restr.conditions)

  if (returnNew)
    return new Rel.Restriction(newCondition, bottomHLR)

  return Object.assign(restr, {
    conditions: newCondition,
    args: bottomHLR
  })
}

/** Transformation Rule #2: Commutativity of σ */
function commuteRestriction(restr: Rel.Restriction, returnNew = false) {

  if (!(restr.args instanceof Rel.Restriction)) {
    console.error("commuteRestriction:", restr)
    throw new Error("Non-Restriction argument")
  }

  if (returnNew) {
    const inner = new Rel.Restriction(restr.conditions, restr.args.args)
    return new Rel.Restriction(restr.args.conditions, inner)
  }

  [restr.conditions, restr.args.conditions] =
    [restr.args.conditions, restr.conditions]

  return restr
}

/** Transformation Rule #3: Cascade of π */
function condenseProjection(proj: Rel.Projection, returnNew = false) {

  let bottomHLR: Rel.HighLevelRelationish = proj.args
  while (bottomHLR instanceof Rel.Projection) {
    bottomHLR = bottomHLR.args
  }

  if (returnNew)
    return new Rel.Projection(proj.columns, bottomHLR)

  return Object.assign(proj, {
    args: bottomHLR
  })
}

function checkRestProjCommutativity(hlr: Rel.Restriction | Rel.Projection) {
  let condition: Rel.Conditional
  let columns: Array<string|Rel.Column>
  if (hlr instanceof Rel.Restriction) {
    if (!(hlr.args instanceof Rel.Projection)) {
      console.error("cRPC:", hlr, hlr.args)
      throw new Error("invalid Restriction argument")
    }
    condition = hlr.conditions
    columns = hlr.args.columns
  } else if (hlr instanceof Rel.Projection) {
    if (!(hlr.args instanceof Rel.Restriction)) {
      console.error("cRPC:", hlr, hlr.args)
      throw new Error("invalid Projection argument")
    }
    condition = hlr.args.conditions
    columns = hlr.columns
  } else {
    console.error("cRPC:", hlr)
    throw new Error("bad checkRestProjCommutativity argument type")
  }

  const cataColumns = new Set(
    columns.map((c: Rel.Column) => {
      if (typeof c.target === 'string')
        return null
      return c.target
    })
  )

  const [invRels, invCols] = involves(condition)
  for (const col of invCols) {
    if (!cataColumns.has(col))
      return false
  }
  return true
}

/** Transformation Rule #4: Commutating σ with π */
function commuteRestrictionProjection(hlr: Rel.Restriction | Rel.Projection) {
  // no way to perform destructively; always returns new.
  const innerHLR = (hlr.args as Rel.Restriction | Rel.Projection).args

  if (hlr instanceof Rel.Restriction) {
    const columns = (hlr.args as Rel.Projection).columns
    const innerRestr = new Rel.Restriction(hlr.conditions, innerHLR)
    return new Rel.Projection(columns, innerRestr)
  } else if (hlr instanceof Rel.Projection) {
    const conds = (hlr.args as Rel.Restriction).conditions
    const innerProj = new Rel.Projection(hlr.columns, innerHLR)
    return new Rel.Restriction(conds, innerProj)
  } else {
    console.error("cRP:", hlr)
    throw new Error("bad commuteRestrictionProjection argument type")
  }
}

function checkJoinCommutativity(join: Rel.Join) {
  return (join.condition instanceof Rel.Conditional ||
      join.condition === "cross")
}

/** Transformation Rule #5: Commutativity of ⋈ (and ⨉) */
function commuteJoin(join: Rel.Join, returnNew = false) {
  if (returnNew)
    return new Rel.Join(join.rhs, join.lhs, join.condition)
  else
    return Object.assign(join, {
      lhs: join.rhs,
      rhs: join.lhs
    })
}

type restJoinCommType = 'lhs'|'rhs'|'split'|'split-swap'|boolean

function checkRestJoinCommutativity(restr: Rel.Restriction): restJoinCommType {
  if (!(restr.args instanceof Rel.Join))
    return false

  const condition = restr.conditions
  const {lhs, rhs} = restr.args

  // TODO: make more efficient
  const conditionInv = involves(condition)[1]
  const lhsInv = involves(lhs)[1]
  const rhsInv = involves(rhs)[1]

  let condLhsInCommon = 0
  let condRhsInCommon = 0
  conditionInv.forEach((col) => {
    if (lhsInv.has(col))
      condLhsInCommon++
    if (rhsInv.has(col))
      condRhsInCommon++
  })

  if (!condLhsInCommon && !condRhsInCommon) {
    console.log("What! Restriction unrelated to either arg???")
    return true
  } else if (!condRhsInCommon && condLhsInCommon === conditionInv.size)
    return 'lhs'
  else if (!condLhsInCommon && condRhsInCommon === conditionInv.size)
    return 'rhs'

  if (condition.operation !== 'and')
    return false

  const condLeftInv = involves(condition.lhs as Rel.Conditional)[1]
  const condRightInv = involves(condition.rhs as Rel.Conditional)[1]

  let lhsCondLeftInCommon = 0
  let lhsCondRightInCommon = 0
  let rhsCondLeftInCommon = 0
  let rhsCondRightInCommon = 0
  condLeftInv.forEach((col) => {
    if (lhsInv.has(col))
      lhsCondLeftInCommon++
    if (rhsInv.has(col))
      rhsCondLeftInCommon++
  })
  condRightInv.forEach((col) => {
    if (lhsInv.has(col))
      lhsCondRightInCommon++
    if (rhsInv.has(col))
      rhsCondRightInCommon++
  })

  if (!lhsCondRightInCommon && lhsCondLeftInCommon === condLeftInv.size &&
      !rhsCondLeftInCommon && rhsCondRightInCommon === condRightInv.size)
    return 'split'
  if (!lhsCondLeftInCommon && lhsCondRightInCommon === condRightInv.size &&
      !rhsCondRightInCommon && rhsCondLeftInCommon === condLeftInv.size)
    return 'split-swap'

  return false
}

/** Transformation Rule #6: Commuting σ with ⋈ (or ⨉) */
function commuteRestrictionJoin(restr: Rel.Restriction,
                                type: restJoinCommType) {
  // no way to perform destructively; always returns new.
  if (!type)
    throw new Error("commuteRestrictionJoin on type = false")
  if (type === true)
    throw new Error("Ambiguous Commutativity")

  const rCondition = restr.conditions
  const rJoin = restr.args as Rel.Join

  let newLhs
  let newRhs

  if (type === 'split' || type === 'split-swap') {
    let newCondLhs
    let newCondRhs
    if (type === 'split') {
      [newCondLhs, newCondRhs] = [rCondition.lhs, rCondition.rhs]
    } else {
      [newCondLhs, newCondRhs] = [rCondition.rhs, rCondition.lhs]
    }
    newLhs = new Rel.Restriction(newCondLhs, rJoin.lhs)
    newRhs = new Rel.Restriction(newCondRhs, rJoin.rhs)
  } else if (type === 'lhs') {
    newLhs = new Rel.Restriction(rCondition, rJoin.lhs)
    newRhs = rJoin.rhs
  } else if (type === 'rhs') {
    newLhs = rJoin.lhs
    newRhs = new Rel.Restriction(rCondition, rJoin.rhs)
  } else {
    console.error("commuteRestrictionJoin:", restr, type)
    throw new Error("Unexpected 'type' argument")
  }

  return new Rel.Join(newLhs, newRhs, rJoin.condition)
}

/** Transformation Rule #7: Commuting π with ⋈ (or ⨉) */
// TODO

function checkSetCommutativity(op: Rel.Operation) {
  return ((op.lhs instanceof Rel.HLR) &&
          (op.rhs instanceof Rel.HLR) &&
          inArray(op.op, ['union', 'intersect']))
}

/** Transformation Rule #8: Commutativity of set operations */
function commuteSetOperation(op: Rel.PairingOperation, returnNew = false) {
  const lhs = op.lhs
  const rhs = op.rhs

  if (returnNew)
    return new Rel.Operation(op.op, rhs, lhs)

  return Object.assign(op, {
    lhs: rhs,
    rhs: lhs
  })
}

function _joinishType(ish: Rel.Joinish | any) {
  if (ish instanceof Rel.Join) {
    if (ish.condition instanceof Rel.Conditional)
      return 'join'
    else
      return ish.condition
  } else if (ish instanceof Rel.Operation &&
             inArray(ish.op, ['union', 'intersect', 'except'])) {
    return ish.op as PairingString
  }
  return null
}

type JoinishAssociativity = false | 'left' | 'right' | 'both'

/**
 * if 'right' then it can be associated 'right', i.e. clockwise; etc
 */
function checkJoinishAssociativity(ish: Rel.Joinish): JoinishAssociativity {
  const type = _joinishType(ish)

  if (type === 'join')
    // TODO: support theta join associativity
    return false
  if (!type || !inArray(type, ['cross', 'union', 'intersect']))
    return false

  let yes = 0
  if (_joinishType(ish.lhs) === type)
    yes += 1
  if (_joinishType(ish.rhs) === type)
    yes += 2

  switch (yes) {
    case 1: return 'right'
    case 2: return 'left'
    case 3: return 'both'
    default: return false
  }
}

/** Transformation Rule #9: Associativity of ⋈, ×, ∪, and ∩ */
function associateJoinish(ish: Rel.Joinish,
                          assoc: 'left' | 'right', // direction to rotate
                          returnNew = false) {

  const type = _joinishType(ish)
  // TODO: support theta associativity
  if (type === 'join')
    throw new Error("Association of theta joins not yet supported")
  else if (inArray(type, ['left', 'right', 'except', null]))
    throw new Error("Invalid join type for association")

  const [newInnerLhs, newInnerRhs]
    = (assoc === 'left')
      ? [ish.lhs, (ish.rhs as Rel.Joinish).lhs]
      : [(ish.lhs as Rel.Joinish).rhs, ish.rhs]

  const newInner
    = (ish instanceof Rel.Join)
      ? new Rel.Join(newInnerLhs, newInnerRhs, ish.condition)
      : new Rel.Operation(ish.op, newInnerLhs, newInnerRhs)

  const [newLhs, newRhs] =
    (assoc === 'left')
      ? [newInner, (ish.rhs as Rel.Joinish).rhs]
      : [(ish.lhs as Rel.Joinish).lhs, newInner]

  if (returnNew)
    return (ish instanceof Rel.Join)
      ? new Rel.Join(newLhs, newRhs, ish.condition)
      : new Rel.Operation(ish.op, newLhs, newRhs)

  return Object.assign(ish, {
    lhs: newLhs,
    rhs: newRhs
  })
}
