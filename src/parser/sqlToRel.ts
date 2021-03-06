
import {Rel, Sql, Catalog, OrderingCondition} from './types'

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
  target: Rel.Columnish
  output: string

  constructor(target: Rel.Columnish, output: string) {
    if (!(target instanceof Rel.Column))
      console.log("Rename of non-column!", target, output)
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

  addAlias(name: string, target: Rel.Column): Rel.Column {
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
      // -console.group()
      // -console.info(`Searching for ${columnName}`)
      for (const val of this.relations.values()) {
        // if (!this.catalog.relations.has(val.name)) {
        //   throw new Error(`${val.name} not in catalog`)
        // }
        const catRel = this.catalog.relations.get(val.name) as Catalog.Relation
        // -console.info(`${val.name} in catalog, looking for ${columnName}`)
        if (!catRel.columns.has(columnName))
          continue
        // -console.info(`found`)
        // -console.groupEnd()
        const col = catRel.columns.get(columnName) as Catalog.Column
        return new Rel.Column(val, col, as)
      }
      // -console.info(`not found`)
      // -console.groupEnd()
      throw new Error(`Unknown column ${columnName}`)
    }
  }
}

function _joinArgHelper(hs: Sql.Join | Sql.Relation,
                        relations: RelationLookup,
                        columns: ColumnLookup,
                        catalog: Catalog.Catalog,
                        arg: Sql.Join,
                        side): Rel.Relation | Rel.Join {
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
      cond = fromConditional(relations, columns, catalog, arg.condition)
    else if (Array.isArray(arg.condition) && arg.condition.length === 2)
      cond = fromTargetList(relations, columns, catalog, arg.condition[1])
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

function fromColumn(relations: RelationLookup,
                    columns: ColumnLookup,
                    catalog: Catalog.Catalog,
                    arg: Sql.Column,
                    relHint?: Rel.HighLevelRelationish
  ): RenameBubbleUp | Rel.Columnish {
  const alias = arg.alias
  let target
  if (arg.target instanceof Sql.Column) {
    // column of column; either rename it or return target
    target = fromColumn(relations, columns, catalog, arg.target, relHint)
    if (!alias)
      console.log("Why double column?")
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
    target = fromAggFunction(relations, columns, catalog, arg.target, relHint)
  } else {
    throw new Error("Unexpected type in column")
  }

  if (alias) {
    target = columns.addAlias(alias, target)
    return new RenameBubbleUp(target, alias)
  }
  return target
}

function fromTargetList(relationLookup: RelationLookup,
                        columnLookup: ColumnLookup,
                        catalog: Catalog.Catalog,
                        targetColumns: Sql.Column[],
                        relHint?: Rel.HighLevelRelationish
  ): [Rel.Columnish[], RenameBubbleUp[]] {
  console.info("fromTargetList:", targetColumns)
  const renames: RenameBubbleUp[] = []
  const cols = targetColumns.map((colarg) => {
    const col = fromColumn(relationLookup,
                           columnLookup,
                           catalog,
                           colarg,
                           relHint)
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
      relat = new Rel.Relation(arg.target,
                    catalog.relations.get(arg.target) as Catalog.Relation)
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

function fromAggFunction(rels: RelationLookup,
                         cols: ColumnLookup,
                         cata: Catalog.Catalog,
                         agg: Sql.AggFunction,
                         relHint?: Rel.HighLevelRelationish) {
  switch (agg.fname) {
    case 'count':
      if (agg.expr === '*' || (agg.expr as Sql.TargetClause).targetlist === '*')
        return new Rel.RelFunction('count', '*', relHint)
      else
        throw new Error("Counting columns not supported")
    case 'avg':
    case 'max':
    case 'min':
    case 'sum':
      if (!(agg.expr instanceof Sql.Column))
        throw new Error(`non-column arguments to aggregates not supported`)
      const expr = fromColumn(rels, cols, cata, agg.expr, relHint)
      if (!(expr instanceof Rel.Column)) {
        console.log("Anomalous AggFunction expr:", expr, "agg:", agg)
        return new Rel.RelFunction(agg.fname,
                                   expr as any as Rel.Column,
                                   relHint)
      }
      return new Rel.RelFunction(agg.fname, expr, relHint)
    default:
      throw new Error(`Unknown aggregate function ${agg.fname}`)
  }
}

function fromOperation(rels: RelationLookup,
                       cols: ColumnLookup,
                       cata: Catalog.Catalog,
                       arg: Sql.Operation,
                       relHint?: Rel.HighLevelRelationish) {
  const lhs = _condArgHelper(rels, cols, cata, arg.lhs, relHint)
  const rhs = _condArgHelper(rels, cols, cata, arg.rhs, relHint)
  return new Rel.Operation(arg.op, lhs, rhs)
}

/* takes an Operand argument */
function _condArgHelper(rels: RelationLookup,
                        cols: ColumnLookup,
                        cata: Catalog.Catalog,
                        hs: Sql.Conditional | Sql.OperandType,
                        relHint?: Rel.HighLevelRelationish) {
  if (hs instanceof Array)
    return fromTargetList(rels, cols, cata, hs, relHint)[0]
  if (hs instanceof Sql.Conditional)
    return fromConditional(rels, cols, cata, hs, relHint)
  else if (hs instanceof Sql.Select)
    return fromSqlSelect(hs, cata)
  // Operand
  else if (hs instanceof Sql.Literal)
    return fromLiteral(hs)
  else if (hs instanceof Sql.AggFunction)
    return fromAggFunction(rels, cols, cata, hs, relHint)
  else if (hs instanceof Sql.Column)
    return fromColumn(rels, cols, cata, hs, relHint)
  else if (hs instanceof Sql.Operation)
    return fromOperation(rels, cols, cata, hs, relHint)
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

function fromConditional(relations: RelationLookup,
                         columns: ColumnLookup,
                         catalog: Catalog.Catalog,
                         arg: Sql.Conditional,
                         relHint?: Rel.HighLevelRelationish
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
  let lhs = _condArgHelper(relations, columns, catalog, arg.lhs, relHint)
  if (lhs instanceof RenameBubbleUp) {
    lhs = lhs.target
  }

  if (op === 'in' && arg.rhs instanceof Array) {
    const rs = arg.rhs.map((R) => {
      const tcond = _condArgHelper(relations, columns, catalog, R, relHint)
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

  if (!binOp || !arg.rhs)
    throw new Error("unary operators not supported")
  let rhs = _condArgHelper(relations, columns, catalog, arg.rhs, relHint)
  if (rhs instanceof RenameBubbleUp)
    rhs = rhs.target

  const condit = new Rel.Conditional(op, lhs, rhs)

  if (arg.not)
    throw new Error("'not' conditional is not supported")
  return condit
}

function fromOrdering(rels: RelationLookup,
                      cols: ColumnLookup,
                      cata: Catalog.Catalog,
                      ordering: Sql.Ordering
  ): Rel.Ordering {
  const [col, cond] = ordering
  let column = fromColumn(rels, cols, cata, col)
  if (column instanceof RenameBubbleUp)
    column = column.target
  if (column instanceof Rel.RelFunction)
    throw new Error("Ordering by function is not supported")
  return [column, cond]
}

function fromOrderings(orderings: Sql.Ordering[] | null,
                       rels: RelationLookup,
                       cols: ColumnLookup,
                       cata: Catalog.Catalog): Rel.Ordering[] | null {
  if (!orderings || !orderings.length)
    return null
  return orderings.map(fromOrdering.bind(null, rels, cols, cata))
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
    [targetColumns, renames] = fromTargetList(relations,
                                              columns,
                                              catalog,
                                              select.what.targetlist,
                                              fromClause
                                             )
  }

  let whereClause: Rel.Conditional|null = null
  if (select.where) {
    const tmpCond = fromConditional(relations, columns, catalog, select.where,
                                    fromClause)
    if (tmpCond instanceof RelationBubbleUp) {
      fromClause = new Rel.Join(fromClause, tmpCond.relationish, 'cross')
      whereClause = tmpCond.realOperation as Rel.Conditional
    } else {
      whereClause = tmpCond
    }
  }

  // let groupBy: Array<string|Rel.Column|Rel.RelFunction>|null = null
  if (select.groupBy) {

    const gList = fromTargetList(relations, columns, catalog, select.groupBy)
    if (gList[1].length)
      console.warn("Ignored rename(s) of GROUP BY clause")
    const groupBy = gList[0] as Rel.Column[]

    const groupByNames: string[] = []
    groupBy.forEach((g) => {
      if (!(g instanceof Rel.Column))
        throw new Error("Cannot group-by non-column")

      let foundIdx = -1
      for (let i = 0; i < renames.length; i++) {
        const ren = renames[i]
        if (ren.target instanceof Rel.Column && ren.target.target === g.target) {
          foundIdx = i
          groupByNames.push(ren.output)
          renames.splice(foundIdx, 1)
          break
        }
      }
      if (foundIdx < 0) {
        if (g.as)
          groupByNames.push(g.as)
        else {
          console.error("Bad column:", g)
          throw new Error("Un 'as'd Column")
        }
      }
    })

    if (targetColumns === '*')
      throw new Error("Group-By on '*' selection unsupported")

    const functs: Rel.RelFunction[] = []
    const aggRenames = groupByNames.slice()
    targetColumns.forEach((col, colIdx) => {
      if (typeof col === 'string')
        throw new Error("Group-By on literals unsupported")

      if (col instanceof Rel.Column && col.target instanceof Rel.RelFunction) {
        const target = col.target
        const colname = col.as
        console.log(`col:`, col, renames)
        if (colname) {
          aggRenames[colIdx] = colname
          for (let i = 0; i < renames.length; i++) {
            const ren = renames[i]
            if (ren.target instanceof Rel.Column
                && ren.target.target instanceof Rel.RelFunction) {
              if (ren.target.target === target && ren.output === colname) {
                console.log("Found it!", i)
                renames.splice(i, 1)
                break
              }
            }
          }
        }
        console.log(renames)
        col = col.target
      }

      if (col instanceof Rel.RelFunction) {
        functs.push(col)
        const gFunctName = col.getName()
        let foundIdx = -1
        for (let i = 0; i < renames.length; i++) {
          const ren = renames[i]
          if (ren.target instanceof Rel.RelFunction
              && ren.target.getName() === gFunctName) {
            foundIdx = i
            aggRenames[colIdx] = ren.output
            renames.splice(foundIdx, 1)
            break
          }
        }
        if (foundIdx < 0 && !aggRenames[colIdx])
          aggRenames[colIdx] = gFunctName

      } else if (col instanceof Rel.Column) {
        if (!col.as)
          throw new Error("Un 'as'd column")
        if (groupByNames.indexOf(col.as) === -1) {
          throw new Error(`GroupBy confusion; didn't find "${col.as}"`)
        }
      } else {
        console.error("targetColumns:", targetColumns)
        throw new Error("Unexpected argument in targetColumns")
      }
    })

    fromClause = new Rel.Aggregation(groupBy, functs, fromClause, aggRenames)

    // TODO: implement HAVING with aggregate-condition support
    if (select.having) {

      const havingCond = fromConditional(relations, columns, catalog,
                                      select.having, fromClause)
      if (!(havingCond instanceof Rel.Conditional))
        throw new Error("Unexpected type from fromConditional; RelationBubbleUp?")

      fromClause = new Rel.Restriction(havingCond, fromClause)
    }

  } else if (select.having)
    console.warn("Ignored HAVING clause without GROUP BY clause")

  const orderBy = fromOrderings(select.orderBy, relations, columns, catalog)

  if (renames.length) {
    fromClause = applyRenameBubbleUps(renames, fromClause)
  }

  const Restrict = whereClause
      ? new Rel.Restriction(whereClause, fromClause)
      : fromClause

  const Project = targetColumns === '*'
      ? Restrict
      : new Rel.Projection(targetColumns as Array<string|Rel.Column>, Restrict)

  return Project
}
