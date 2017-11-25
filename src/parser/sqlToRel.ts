
import {Rel, Sql, Catalog} from './types'

type ColumnValueType = Rel.Column | Rel.RelFunction | string

type RelationLookup = Map<string, Rel.Relation>

/* bubble a join/relation up to the calling function, also returning
   the 'realOperation' that took place */
class RelationBubbleUp<T> {
  realOperation: T
  relationish: Rel.HighLevelRelationish

  constructor(realOp: T, relationish: Rel.HighLevelRelationish) {
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
  readonly map: Map<string, Rel.Column[]>
  readonly catalog: Catalog.Catalog
  readonly relations: RelationLookup

  constructor(catalog: Catalog.Catalog, relations: RelationLookup, init?) {
    this.map = new Map(init)
    this.catalog = catalog
    this.relations = relations
  }

  addAlias(name: string, target: Rel.Column) {
    const cols = this.map.get(name)
    if (!(target instanceof Rel.Column)) {
      target = new Rel.Column(null, target, name)
    }
    if (!cols)
      this.map.set(name, [target])
    else
      cols.push(target)
    return target
  }

  lookup(columnName: string, relationName?: string, as?: string): Rel.Column {
    if (relationName) {
      // column references a relation
      if (!this.relations.has(relationName)) {
        throw new Error(`Unknown relation "${relationName}"`)
      }
      const relation = this.relations.get(relationName) as Rel.Relation
      const catRelation = this.catalog.relations.get(relation.name) as Catalog.Relation
      // if(!catRelation)
      //   throw new Error(`${relationName} not in catalog`)
      if (catRelation.columns.has(columnName))
        return new Rel.Column(relation,
                                   catRelation.columns.get(columnName) as Catalog.Column,
                                   as)
      else
        throw new Error(`${catRelation.name} doesn't contain ${columnName}`)
    } else {
      // implicit relation reference
      if (this.map.has(columnName)) {
        // already in the map
        const cols = this.map.get(columnName) as Rel.Column[]
        if (cols.length > 1)
          throw new Error(`Ambiguous column name reference "${columnName}"`)

        return cols[0].alias(as)

      }
      // not in map; search for columnName
      console.group()
      console.info(`Searching for ${columnName}`)
      for (const val of this.relations.values()) {
        // if (!this.catalog.relations.has(val.name)) {
        //   throw new Error(`${val.name} not in catalog`)
        // }
        const catRel = this.catalog.relations.get(val.name) as Catalog.Relation
        console.info(`${val.name} in catalog, looking for ${columnName}`)
        if (!catRel.columns.has(columnName))
          continue
        console.info(`found`)
        console.groupEnd()
        const col = catRel.columns.get(columnName) as Catalog.Column
        return new Rel.Column(val, col, as)
      }
      console.info(`not found`)
      console.groupEnd()
      throw new Error(`Unknown column ${columnName}`)
    }
  }
}

function _joinArgHelper(hs: Sql.Join | Sql.Relation,
                        relations: RelationLookup,
                        columns: ColumnLookup,
                        catalog: Catalog.Catalog,
                        arg: Sql.Join,
                        side): Rel.Relationish {
  if (hs instanceof Sql.Join)
    return fromJoin(hs, relations, columns, catalog)
  else if (hs instanceof Sql.Relation)
    return fromRelation(hs, relations, columns, catalog) as Rel.Relation
  console.error(`bad join arg ${side}`, arg, "lookup:", relations)
  throw new Error("Bad join argument lhs")
}

function fromJoin(arg: Sql.Join,
                  relations: RelationLookup,
                  columns: ColumnLookup,
                  catalog: Catalog.Catalog): Rel.Join {
  const lhs = _joinArgHelper(arg.lhs, relations, columns, catalog, arg, 'left')
  const rhs = _joinArgHelper(arg.rhs, relations, columns, catalog, arg, 'right')
  let cond: any = null
  if (arg.condition) {
    if (arg.condition instanceof Sql.Conditional)
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

  const J = new Rel.Join(lhs, rhs, cond)
  return J
}

function fromColumn(arg: Sql.Column,
                    relations: RelationLookup,
                    columns: ColumnLookup,
                    catalog: Catalog.Catalog
  ): RenameBubbleUp | ColumnValueType {
  const alias = arg.alias
  let target
  if (arg.target instanceof Sql.Column) {
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
    target = columns.lookup(arg.target,
                            arg.relation || undefined,
                            arg.as || undefined)
  } else if (arg.target instanceof Sql.Literal) {
    target = fromLiteral(arg.target)
  } else if (arg.target instanceof Sql.AggFunction) {
    target = fromAggFunction(arg.target, relations, columns, catalog)
  } else {
    throw new Error("Unexpected type in column")
  }

  if (alias) {
    target = columns.addAlias(alias, target)
    return new RenameBubbleUp(target, alias)
  }
  return target
}

function fromTargetList(targetColumns: Sql.Column[],
                        relationLookup: RelationLookup,
                        columnLookup: ColumnLookup,
                        catalog: Catalog.Catalog
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

function fromRelation(arg: Sql.Relation,
                      relations: RelationLookup,
                      columns: ColumnLookup,
                      catalog: Catalog.Catalog): Rel.Rename | Rel.Relation | Rel.Join {
  if (typeof(arg.target) === 'string') {
    let relat
    if (relations.has(arg.target))
      relat = relations.get(arg.target)
    else if (catalog.relations.has(arg.target)) {
      relat = new Rel.Relation(arg.target)
      relations.set(arg.target, relat)
    } else {
      console.error(`Unknown relation ${arg.target}`, arg, relations)
      throw new Error(`Unknown relation ${arg.target}`)
    }

    if (arg.alias) {
      const ren = new Rel.Rename(relat, arg.alias, relat)
      relations.set(arg.alias, relat)
      return ren
    }
    return relat
  } else if (arg.target instanceof Sql.Relation) {
    const relat = fromRelation(arg.target, relations, columns, catalog) as Rel.Relation
    if (!arg.alias)
      return relat
    const ren = new Rel.Rename(relat, arg.alias, relat)
    relations.set(arg.alias, relat)
    return ren
  } else if (arg.target instanceof Sql.Join) {
    const J = fromJoin(arg.target, relations, columns, catalog)
    if (!arg.alias)
      return J
    else
      throw new Error("Renaming joins not supported ")
    // const ren = new Rel.Rename()
  } else {
    console.error("bad arg.target type", arg, "lookup:", relations)
    throw new Error("bad arg.target type")
  }
}

function fromRelationList(arg: Sql.RelationList,
                          relations: RelationLookup,
                          columns: ColumnLookup,
                          catalog: Catalog.Catalog) {
  if (arg instanceof Sql.Relation)
    return fromRelation(arg, relations, columns, catalog)
  else
    return fromJoin(arg, relations, columns, catalog)
}

function fromLiteral(lit: Sql.Literal) {
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

function fromAggFunction(agg: Sql.AggFunction,
                         rels: RelationLookup,
                         cols: ColumnLookup,
                         cata: Catalog.Catalog) {
  switch (agg.fname) {
    case 'count':
      if (agg.expr === '*' || (agg.expr as Sql.TargetClause).targetlist === '*')
        return new Rel.RelFunction('count', '*')
      else
        throw new Error("Counting columns not supported")
    case 'avg':
    case 'max':
    case 'min':
    case 'sum':
      if (!(agg.expr instanceof Sql.Column))
        throw new Error(`non-column arguments to aggregates not supported`)
      const expr = fromColumn(agg.expr, rels, cols, cata) as Rel.Column
      return new Rel.RelFunction(agg.fname, expr)
    default:
      throw new Error(`Unknown aggregate function ${agg.fname}`)
  }
}

function fromOperation(arg: Sql.Operation,
                       rels: RelationLookup,
                       cols: ColumnLookup,
                       cata: Catalog.Catalog) {
  const lhs = _condArgHelper(arg.lhs, rels, cols, cata)
  const rhs = _condArgHelper(arg.rhs, rels, cols, cata)
  return new Rel.Operation(arg.op, lhs, rhs)
}

/* takes an Operand argument */
function _condArgHelper(hs, rels, cols, cata) {
  if (hs instanceof Array)
    return fromTargetList(hs, rels, cols, cata)[0]
  if (hs instanceof Sql.Conditional)
    return fromConditional(hs, rels, cols, cata)
  else if (hs instanceof Sql.Select)
    return fromSqlSelect(hs, cata)
  // Operand
  else if (hs instanceof Sql.Literal)
    return fromLiteral(hs)
  else if (hs instanceof Sql.AggFunction)
    return fromAggFunction(hs, rels, cols, cata)
  else if (hs instanceof Sql.Column)
    return fromColumn(hs, rels, cols, cata)
  else if (hs instanceof Sql.Operation)
    return fromOperation(hs, rels, cols, cata)
  else
    throw new Error(`Unknown conditional arg type ${hs}`)
}

function _handleSubquery(arg, lhs, op, relations, columns, catalog) {

  const tmpRhs = (arg.rhs instanceof Sql.SelectPair)
                  ? fromSelectPair(arg.rhs, catalog)
                  : fromSqlSelect(arg.rhs, catalog)

  if (op === 'in')
    op = 'eq'

  // lhs = check-against
  // rhs = Selectish
  if (!(tmpRhs instanceof Rel.Projection))
    throw new Error("'in' subqueries must select columns")

  const rhsTarget = tmpRhs.columns

  let conditional: Rel.Conditional
  if (rhsTarget.length > 1)
    conditional = rhsTarget.reduce((L, R) =>
                    new Rel.Conditional(op, L, R), lhs)
  else
    conditional = new Rel.Conditional(op, lhs, rhsTarget[0])

  return new RelationBubbleUp<Rel.Conditional>(conditional, tmpRhs.args)
}

function fromConditional(arg: Sql.Conditional,
                         relations: RelationLookup,
                         columns: ColumnLookup,
                         catalog: Catalog.Catalog
  ): Rel.Conditional | RelationBubbleUp<Rel.Conditional> {
  let binOp = true
  let op: Rel.ThetaOp
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
  let lhs = _condArgHelper(arg.lhs, relations, columns, catalog)
  if (lhs instanceof RenameBubbleUp) {
    lhs = lhs.target
  }

  if (op === 'in' && arg.rhs instanceof Array) {
    const rs = arg.rhs.map((R) => {
      const tcond = _condArgHelper(R, relations, columns, catalog)
      if (tcond instanceof RenameBubbleUp)
        return tcond.target
      return tcond
    })
    const cond = new Rel.Conditional('in', lhs, rs)
    if (arg.not)
      throw new Error("'not' conditional is not supported")
    return cond
  }
  if (arg.rhs instanceof Sql.Select ||
      arg.rhs instanceof Sql.SelectPair) {
    return _handleSubquery(arg, lhs, op, relations, columns, catalog)
  }
  if (op === 'in') {
    throw new Error("'in' argument should be array or subquery")
  }

  if (!binOp)
    throw new Error("unary operators not supported")
  let rhs = _condArgHelper(arg.rhs, relations, columns, catalog)
  if (rhs instanceof RenameBubbleUp)
    rhs = rhs.target

  const condit = new Rel.Conditional(op, lhs, rhs)

  if (arg.not)
    throw new Error("'not' conditional is not supported")
  return condit
}

function fromOrderings(orderings, rels, cols, cata) {
  if (!orderings || !orderings.length)
    return null
  return orderings.map(([col, cond]) => {
    const column = fromColumn(col, rels, cols, cata)
    if (column instanceof RenameBubbleUp)
      return [column.target, cond]
    return [column, cond]
  })
}

export function fromSelectPair(selPair: Sql.SelectPair,
                               catalog: Catalog.Catalog) {
  const lhs = fromSqlSelect(selPair.lhs, catalog)
  let rhs
  if (selPair.rhs instanceof Sql.Select)
    rhs = fromSqlSelect(selPair.rhs, catalog)
  else
    rhs = fromSelectPair(selPair.rhs, catalog)

  if (lhs instanceof Rel.Projection &&
      rhs instanceof Rel.Projection) {
    if (lhs.columns.length !== rhs.columns.length)
      throw new Error(`Joining on unequal degrees: ` +
                      `${lhs.columns.length} vs ${rhs.columns.length}`)
    const newLhs = lhs.args
    const newRhs = rhs.args
    const newColumns = lhs.columns
    const args = new Rel.Operation(selPair.pairing, newLhs, newRhs)
    return new Rel.Projection(newColumns, args)
  }

  const operation = new Rel.Operation(selPair.pairing, lhs, rhs)
  return operation
}

function _renameReducer(arg: Rel.HighLevelRelationish, ren: RenameBubbleUp) {
  return new Rel.Rename(ren.target, ren.output, arg)
}

function applyRenameBubbleUps(renames: RenameBubbleUp[],
                              args: Rel.HighLevelRelationish) {
    return renames.reduce(_renameReducer, args)
  }

export function fromSqlSelect(select: Sql.Select, catalog: Catalog.Catalog) {

  // map names to the actual instances
  const relations: RelationLookup = new Map()
  const columns = new ColumnLookup(catalog, relations)

  let fromClause: Rel.HighLevelRelationish
      = fromRelationList(select.from, relations, columns, catalog)

  let targetColumns: '*' | Array<string|Rel.Column|Rel.RelFunction>
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
      fromClause = new Rel.Join(fromClause, whereClause.relationish, 'cross')
      whereClause = whereClause.realOperation as Rel.Conditional
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
      ? new Rel.Restriction(whereClause, fromClause)
      : fromClause

  const Proj = targetColumns === '*'
      ? Rest
      : new Rel.Projection(targetColumns, Rest)

  return Proj
}
