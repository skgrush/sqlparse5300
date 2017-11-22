
import * as Rel from './Rel'
import * as Sql from './Sql'
import * as Catalog from './Catalog'

export {Rel, Sql, Catalog}

export type JoinString = "join"       // "," | "JOIN" | "CROSS JOIN"
                       | "equi"       // "INNER JOIN" | "JOIN ... USING"
                       | "natural"    // "NATURAL JOIN"
                       | "leftouter"  // "LEFT [OUTER] JOIN"
                       | "rightouter" // "RIGHT [OUTER] JOIN"
                       | "fullouter"  // "FULL [OUTER] JOIN"

export type OrderingCondition = "asc" | "desc" | "<" | ">"

export type PairingString = 'union' | 'intersect' | 'except'
export type PairingCondition = 'all' | 'distinct' | null

export type OperationOps = '||' | '+' | '-' | '*' | '/'

export type AggFuncName = 'avg' | 'count' | 'max' | 'min' | 'sum'

/**
 * IFF rhs is non-empty, run reduce using f on rhs initialized by lhs.
 * Else return lhs
 */
export function reduceIfRHS(lhs: any, rhs: any[], f: (L, R) => any) {
  if (rhs.length)
    return rhs.reduce(f, lhs)
  return lhs
}
