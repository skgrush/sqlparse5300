
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

  restr.conditions = topCondition
  restr.args = newHLR

  return restr
}
