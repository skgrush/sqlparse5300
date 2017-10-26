
import * as types from './types'

type RelationLookup = Map<string, types.RelRelation>
type ColumnLookup = Map<string, types.RelColumn | types.RelFunction | string>

function _joinArgHelper(hs,
                        relations,
                        columns,
                        catalog,
                        arg,
                        side): types.RelRelationish {
  if (hs instanceof types.SqlJoin)
    return fromJoin(hs, relations, columns, catalog)
  else if (hs instanceof types.SqlRelation)
    return fromRelation(hs, relations, columns, catalog) as types.RelRelation
  console.error(`bad join arg ${side}`, arg, "lookup:", relations)
  throw new Error("Bad join argument lhs")
}

function fromJoin(arg: types.SqlJoin,
                  relations: RelationLookup,
                  columns: ColumnLookup,
                  catalog: types.Catalog): types.RelJoin {
  const lhs = _joinArgHelper(arg.lhs, relations, columns, catalog, arg, 'left')
  const rhs = _joinArgHelper(arg.rhs, relations, columns, catalog, arg, 'right')
  let cond: any = null
  if (arg.condition) {
    if (arg.condition instanceof types.SqlConditional)
      cond = fromConditional(arg.condition, relations, columns, catalog)
    else if (Array.isArray(arg.condition) && arg.condition.length === 2)
      cond = fromTargetList(arg.condition[1], relations, columns, catalog)
    else {
      console.error("bad conditional", arg, "lookup:", relations)
      throw new Error("bad conditional")
    }
  } else {
    switch (arg.joinType) {
      case "join":
      case null:
        cond = "cross"
        break
      case "leftouter":
        cond = "left"
        break
      case "rightouter":
        cond = "right"
        break
      case "fullouter":
        throw new Error("full outer join not supported")
      // case "natural" | "equi" | null:
    }
  }

  const J = new types.RelJoin(lhs, rhs, cond)
  return J
}

function fromColumn(arg: types.SqlColumn,
                    relations: RelationLookup,
                    columns: ColumnLookup,
                    catalog: types.Catalog): types.RelColumn | types.RelRename | types.RelFunction | string {
  const alias = arg.alias
  if (typeof(arg.target) === 'string') {
    let relat
    if (arg.relation) {
      if (!relations.has(arg.relation)) {
        throw new Error(`Unknown relation "${arg.relation}"`)
      }
      relat = relations.get(arg.relation)
    } else {
      if (columns.has(arg.target)) {
        const col = columns.get(arg.target) as types.RelColumn
        if (alias) {
          const ren = new types.RelRename(col, alias, col)
          columns.set(alias, col)
          return ren
        }
        return col
      }
      for (const [kee, val] of relations.entries()) {
        if (!catalog.relations.has(kee))
          continue
        else if ((catalog.relations.get(kee) as types.Relation).columns.has(arg.target)) {
          relat = relations.get(kee)
          break
        }
      }
    }
    if (!relat)
      throw new Error(`Unknown column ${arg.target}`)

    const col2 = new types.RelColumn(relat, arg.target)
    if (alias) {
      const ren = new types.RelRename(col2, alias, col2)
      columns.set(alias, col2)
      return ren
    }
    return col2
  } else if (arg.target instanceof types.SqlLiteral) {
    const lit = fromLiteral(arg.target)
    if (alias) {
      const ren = new types.RelRename(lit, alias, null)
      columns.set(alias, lit)
      return ren
    }
    return lit
  } else if (arg.target instanceof types.SqlAggFunction) {
    const agg = fromAggFunction(arg.target, relations, columns, catalog)
    if (alias) {
      const ren = new types.RelRename(agg, alias, null)
      columns.set(alias, agg)
      return ren
    }
    return agg
  } else {
    throw new Error("Unexpected type in column")
  }
}

function fromTargetList(arg: types.SqlColumn[],
                        relations: RelationLookup,
                        columns: ColumnLookup,
                        catalog: types.Catalog) {
  return arg.map((colarg) => fromColumn(colarg, relations, columns, catalog))
}

function fromRelation(arg: types.SqlRelation,
                      relations: RelationLookup,
                      columns: ColumnLookup,
                      catalog: types.Catalog): types.RelRename | types.RelRelation | types.RelJoin {
  if (typeof(arg.target) === 'string') {
    let relat
    if (relations.has(arg.target))
      relat = relations.get(arg.target)
    else if (catalog.relations.has(arg.target)) {
      relat = new types.RelRelation(arg.target)
      relations.set(arg.target, relat)
    } else {
      console.error(`Unknown relation ${arg.target}`, arg, relations)
      throw new Error(`Unknown relation ${arg.target}`)
    }

    if (arg.alias) {
      const ren = new types.RelRename(relat, arg.alias, relat)
      relations.set(arg.alias, relat)
      return ren
    }
    return relat
  } else if (arg.target instanceof types.SqlRelation) {
    const relat = fromRelation(arg.target, relations, columns, catalog) as types.RelRelation
    if (!arg.alias)
      return relat
    const ren = new types.RelRename(relat, arg.alias, relat)
    relations.set(arg.alias, relat)
    return ren
  } else if (arg.target instanceof types.SqlJoin) {
    const J = fromJoin(arg.target, relations, columns, catalog)
    if (!arg.alias)
      return J
    else
      throw new Error("Renaming joins not supported ")
    // const ren = new types.RelRename()
  } else {
    console.error("bad arg.target type", arg, "lookup:", relations)
    throw new Error("bad arg.target type")
  }
}

function fromRelationList(arg: types.RelationList,
                          relations: RelationLookup,
                          columns: ColumnLookup,
                          catalog: types.Catalog) {
  if (arg instanceof types.SqlRelation)
    return fromRelation(arg, relations, columns, catalog)
  else
    return fromJoin(arg, relations, columns, catalog)
}

function fromLiteral(lit: types.SqlLiteral) {
  switch (lit.literalType) {
    case 'string':
      return `'${lit.value}'`
    case 'number':
    case 'boolean':
    case 'null':
      return String(lit.value)
    default:
      throw new Error(`Unknown literal type ${lit.literalType} for ${lit.value}`)
  }
}

function fromAggFunction(agg: types.SqlAggFunction,
                         rels: RelationLookup,
                         cols: ColumnLookup,
                         cata: types.Catalog) {
  switch (agg.fname) {
    case 'count':
      if (agg.expr === '*' || (agg.expr as any).target === '*')
        return new types.RelFunction('count', '*')
      else
        throw new Error("Counting columns not supported")
    case 'avg':
    case 'max':
    case 'min':
    case 'sum':
      if (!(agg.expr instanceof types.SqlColumn))
        throw new Error(`non-column arguments to aggregates not supported`)
      const expr = fromColumn(agg.expr, rels, cols, cata) as types.RelColumn
      return new types.RelFunction(agg.fname, expr)
    default:
      throw new Error(`Unknown aggregate function ${agg.fname}`)
  }
}

function fromOperation(arg: types.SqlOperation,
                       rels: RelationLookup,
                       cols: ColumnLookup,
                       cata: types.Catalog) {
  const lhs = _condArgHelper(arg.lhs, rels, cols, cata)
  const rhs = _condArgHelper(arg.rhs, rels, cols, cata)
  return new types.RelOperation(arg.op, lhs, rhs)
}

/* takes an Operand argument */
function _condArgHelper(hs, rels, cols, cata) {
  if (hs instanceof types.SqlConditional)
    return fromConditional(hs, rels, cols, cata)
  // Operand
  else if (hs instanceof types.SqlLiteral)
    return fromLiteral(hs)
  else if (hs instanceof types.SqlAggFunction)
    return fromAggFunction(hs, rels, cols, cata)
  else if (hs instanceof types.SqlColumn)
    return fromColumn(hs, rels, cols, cata)
  else if (hs instanceof types.SqlOperation)
    return fromOperation(hs, rels, cols, cata)
  else
    throw new Error(`Unknown conditional arg type ${hs}`)
}

function fromConditional(arg: types.SqlConditional,
                         relations: RelationLookup,
                         columns: ColumnLookup,
                         catalog: types.Catalog) {
  let binOp = true
  let op: types.ThetaOp
  switch (arg.operation) {
    case 'not':
    case 'isnull':
    case 'exists':
      binOp = false
      // break
    /* binary ops */
    case 'like':
    case 'between':
      throw new Error(`"${arg.operation}" condition not yet supported`)

    case 'or':
    case 'and':
    case 'in':
    case '<':
    case '>':
      op = arg.operation
    case '<>':
    case '!=':
      op = 'neq'
      break
    case '<=':
      op = 'leq'
      break
    case '>=':
      op = 'geq'
      break
    case '=':
      op = 'eq'
      break
    default:
      throw new Error(`Unknown op "${arg.operation}"`)
  }
  const lhs = _condArgHelper(arg.lhs, relations, columns, catalog)
  if (!binOp)
    throw new Error("unary operators not supported")
  const rhs = _condArgHelper(arg.rhs, relations, columns, catalog)

  const condit = new types.RelConditional(op, lhs, rhs)

  if (arg.not)
    throw new Error("'not' conditional is not supported")
  return condit
}

function fromOrderings(orderings, rels, cols, cata) {
  if (!orderings || !orderings.length)
    return null
  return orderings.map(([col, cond]) => {
    return [fromColumn(col, rels, cols, cata), cond]
  })
}

type SelectPairType = [ types.SqlSelect,
                        'union' | 'intersect' | 'except',
                        'all' | 'distinct' | null,
                        types.SqlSelect | [any, string, string, any]
                      ]

export function fromSelectPair(selPair: SelectPairType, catalog: types.Catalog) {
  const [left, op, spec, right] = selPair
  const lhs = fromSqlSelect(left, catalog)
  let rhs
  if (right instanceof types.SqlSelect)
    rhs = fromSqlSelect(right, catalog)
  else
    rhs = fromSelectPair(right as SelectPairType, catalog)

  const operation = new types.RelOperation(op, lhs, rhs)
}

export function fromSqlSelect(select: types.SqlSelect, catalog: types.Catalog) {

  // map names to the actual instances
  const relations = new Map()
  const columns = new Map()

  const fromClause = fromRelationList(select.from, relations, columns, catalog)

  let targetColumns
  if (select.what.targetlist === '*')
    targetColumns = '*'
  else {
    targetColumns = fromTargetList(select.what.targetlist, relations, columns, catalog)
  }

  const whereClause = select.where
      ? fromConditional(select.where, relations, columns, catalog)
      : null

  const groupBy = select.groupBy
      ? fromTargetList(select.groupBy, relations, columns, catalog)
      : null

  const having = select.having
      ? fromConditional(select.having, relations, columns, catalog)
      : null

  const orderBy = fromOrderings(select.orderBy, relations, columns, catalog)

  const Rest = whereClause
      ? new types.RelRestriction(whereClause, fromClause)
      : fromClause

  const Proj = targetColumns === '*'
      ? Rest
      : new types.RelProjection(targetColumns, Rest)

  return Proj
}
