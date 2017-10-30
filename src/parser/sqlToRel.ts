
import * as types from './types'

type ColumnValueType = types.RelColumn | types.RelFunction | string

type RelationLookup = Map<string, types.RelRelation>

/* bubble a join/relation up to the calling function, also returning
   the 'realOperation' that took place */
class BubbleUp<T> {
  realOperation: T
  relationish: types.HighLevelRelationish

  constructor(realOp: T, relationish: types.HighLevelRelationish) {
    this.realOperation = realOp
    this.relationish = relationish
  }
}

class RenameBubbleUp {
  target: ColumnValueType
  output: string

  constructor(target: ColumnValueType, output: string) {
    this.target = target
    this.output = output
  }
}

class ColumnLookup {
  readonly map: Map<string, ColumnValueType[]>
  readonly catalog: types.Catalog
  readonly relations: RelationLookup

  constructor(catalog: types.Catalog, relations: RelationLookup, init?) {
    this.map = new Map(init)
    this.catalog = catalog
    this.relations = relations
  }

  addAlias(name: string, target: ColumnValueType) {
    const cols = this.map.get(name)
    if (!cols)
      this.map.set(name, [target])
    else
      cols.push(target)
  }

  lookup(columnName: string, relationName?: string): ColumnValueType {
    if (relationName) {
      // column references a relation
      if (!this.relations.has(relationName)) {
        throw new Error(`Unknown relation "${relationName}"`)
      }
      const relation = this.relations.get(relationName) as types.RelRelation
      const catRelation = this.catalog.relations.get(relation.name) as types.Relation
      // if(!catRelation)
      //   throw new Error(`${relationName} not in catalog`)
      if (catRelation.columns.has(columnName))
        return new types.RelColumn(relation, columnName)
      else
        throw new Error(`${catRelation.name} doesn't contain ${columnName}`)
    } else {
      // implicit relation reference
      if (this.map.has(columnName)) {
        // already in the map
        const cols = this.map.get(columnName) as ColumnValueType[]
        if (cols.length > 1)
          throw new Error(`Ambiguous column name reference "${columnName}"`)
        else
          return cols[0]
      }
      // not in map; search for columnName
      console.group()
      console.info(`Searching for ${columnName}`)
      for (const val of this.relations.values()) {
        // if (!this.catalog.relations.has(val.name)) {
        //   throw new Error(`${val.name} not in catalog`)
        // }
        const catRel = this.catalog.relations.get(val.name) as types.Relation
        console.info(`${val.name} in catalog, looking for ${columnName}`)
        if (!catRel.columns.has(columnName))
          continue
        console.info(`found`)
        console.groupEnd()
        return new types.RelColumn(val, columnName)
      }
      console.info(`not found`)
      console.groupEnd()
      throw new Error(`Unknown column ${columnName}`)
    }
  }
}

function _joinArgHelper(hs: types.SqlJoin | types.SqlRelation,
                        relations: RelationLookup,
                        columns: ColumnLookup,
                        catalog: types.Catalog,
                        arg: types.SqlJoin,
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
                    catalog: types.Catalog
  ): RenameBubbleUp | ColumnValueType {
  const alias = arg.alias
  let target
  if (arg.target instanceof types.SqlColumn) {
    // column of column; either rename it or return target
    target = fromColumn(arg.target, relations, columns, catalog)
    if (!alias)
      console.warn("Why double column?")
    else if (target instanceof RenameBubbleUp) {
      console.error("Double rename; arg,target =", arg, target)
      throw new Error("Double rename not supported")
    }
  } else if (typeof(arg.target) === 'string') {
    // column based on a name
    target = columns.lookup(arg.target, arg.relation || undefined)
  } else if (arg.target instanceof types.SqlLiteral) {
    target = fromLiteral(arg.target)
  } else if (arg.target instanceof types.SqlAggFunction) {
    target = fromAggFunction(arg.target, relations, columns, catalog)
  } else {
    throw new Error("Unexpected type in column")
  }

  if (alias) {
    columns.addAlias(alias, target)
    return new RenameBubbleUp(target, alias)
  }
  return target
}

function fromTargetList(targetColumns: types.SqlColumn[],
                        relationLookup: RelationLookup,
                        columnLookup: ColumnLookup,
                        catalog: types.Catalog
  ): [ColumnValueType[], RenameBubbleUp[]] {
  console.info("fromTargetList:", targetColumns)
  const renames: RenameBubbleUp[] = []
  const cols = targetColumns.map((colarg) => {
    const col = fromColumn(colarg,
                         relationLookup,
                         columnLookup,
                         catalog)
    if (col instanceof RenameBubbleUp) {
      renames.push(col)
      return col.target
    }
    return col
  })
  return [cols, renames]
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
      if (agg.expr === '*' || (agg.expr as types.TargetClause).targetlist === '*')
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
  if (hs instanceof Array)
    return fromTargetList(hs, rels, cols, cata)[0]
  if (hs instanceof types.SqlConditional)
    return fromConditional(hs, rels, cols, cata)
  else if (hs instanceof types.SqlSelect)
    return fromSqlSelect(hs, cata)
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

function _handleSubquery(arg, lhs, op, relations, columns, catalog) {

  const tmpRhs = (arg.rhs instanceof types.SqlSelectPair)
                  ? fromSelectPair(arg.rhs, catalog)
                  : fromSqlSelect(arg.rhs, catalog)

  if (op === 'in')
    op = 'eq'

  // lhs = check-against
  // rhs = Selectish
  if (!(tmpRhs instanceof types.RelProjection))
    throw new Error("'in' subqueries must select columns")

  const rhsTarget = tmpRhs.columns

  let conditional: types.RelConditional
  if (rhsTarget.length > 1)
    conditional = rhsTarget.reduce((L, R) =>
                    new types.RelConditional(op, L, R), lhs)
  else
    conditional = new types.RelConditional(op, lhs, rhsTarget[0])

  return new BubbleUp<types.RelConditional>(conditional, tmpRhs.args)
}

function fromConditional(arg: types.SqlConditional,
                         relations: RelationLookup,
                         columns: ColumnLookup,
                         catalog: types.Catalog
  ): types.RelConditional | BubbleUp<types.RelConditional> {
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
      break
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

  if (op === 'in' && arg.rhs instanceof Array) {
    const rs = arg.rhs.map((R) =>
          _condArgHelper(R, relations, columns, catalog))
    const cond = new types.RelConditional('in', lhs, rs)
    if (arg.not)
      throw new Error("'not' conditional is not supported")
    return cond
  }
  if (arg.rhs instanceof types.SqlSelect ||
      arg.rhs instanceof types.SqlSelectPair) {
    return _handleSubquery(arg, lhs, op, relations, columns, catalog)
  }
  if (op === 'in') {
    throw new Error("'in' argument should be array or subquery")
  }

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

export function fromSelectPair(selPair: types.SqlSelectPair,
                               catalog: types.Catalog) {
  const lhs = fromSqlSelect(selPair.lhs, catalog)
  let rhs
  if (selPair.rhs instanceof types.SqlSelect)
    rhs = fromSqlSelect(selPair.rhs, catalog)
  else
    rhs = fromSelectPair(selPair.rhs, catalog)

  if (lhs instanceof types.RelProjection &&
      rhs instanceof types.RelProjection) {
    if (lhs.columns.length !== rhs.columns.length)
      throw new Error(`Joining on unequal degrees: ` +
                      `${lhs.columns.length} vs ${rhs.columns.length}`)
    const newLhs = lhs.args
    const newRhs = rhs.args
    const newColumns = lhs.columns
    const args = new types.RelOperation(selPair.pairing, newLhs, newRhs)
    return new types.RelProjection(newColumns, args)
  }

  const operation = new types.RelOperation(selPair.pairing, lhs, rhs)
  return operation
}

function _renameReducer(arg: types.HighLevelRelationish, ren: RenameBubbleUp) {
  return new types.RelRename(ren.target, ren.output, arg)
}

function applyRenameBubbleUps(renames: RenameBubbleUp[],
                              args: types.HighLevelRelationish) {
    return renames.reduce(_renameReducer, args)
  }

export function fromSqlSelect(select: types.SqlSelect, catalog: types.Catalog) {

  // map names to the actual instances
  const relations = new Map()
  const columns = new ColumnLookup(catalog, relations)

  let fromClause: types.HighLevelRelationish
      = fromRelationList(select.from, relations, columns, catalog)

  let targetColumns
  let renames: RenameBubbleUp[] = []
  if (select.what.targetlist === '*')
    targetColumns = '*'
  else {
    [targetColumns, renames] = fromTargetList(select.what.targetlist,
                                              relations,
                                              columns,
                                              catalog)
  }

  // const whereClause = select.where
  //     ? fromConditional(select.where, relations, columns, catalog)
  //     : null
  let whereClause: any = null
  if (select.where) {
    whereClause = fromConditional(select.where, relations, columns, catalog)
    if (whereClause instanceof BubbleUp) {
      fromClause = new types.RelJoin(fromClause, whereClause.relationish, 'cross')
      whereClause = whereClause.realOperation as types.RelConditional
    }
  }

  if (renames.length) {
    fromClause = applyRenameBubbleUps(renames, fromClause)
  }

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
