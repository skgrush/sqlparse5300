
import {Rel} from './types'

/**
 * arrayExtend(a, b)
 * Appends b elements to a, modifying a in place and returning it.
 */
function arrayExtend<U, V>(a: U[], b: V[]): Array<U|V> {
  Array.prototype.push.apply(a, b)
  return a
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
function cascadeRestrictions(restr: Rel.Restriction,
                             returnNew = false): Rel.Restriction {

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
function rollupRestrictions(restr: Rel.Restriction,
                            returnNew = false): Rel.Restriction {

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
