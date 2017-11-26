
import {Rel, Catalog} from './types'

/*

HLR:

*/

type RelationSet = Set<Catalog.Relation>
type ColumnSet = Set<Catalog.Column>
type InvolvementTuple = [RelationSet, ColumnSet]

type IterableTuple<T = any, U = T> = [Iterable<T>, Iterable<U>]

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
