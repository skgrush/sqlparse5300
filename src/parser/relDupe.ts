
import {Rel, Catalog, PairingString} from './types'

type Copiable = string | Catalog.Relation | Catalog.Column

type Dupable = Rel.HighLevelRelationish | Rel.Column | Rel.Conditional |
               Rel.RelFunction | Rel.PairingOperation | Copiable

export default function dupe(thing: Dupable) {
  if (thing instanceof Rel.HLR)
    switch (thing.type) {
      case Rel.HLRTypeString.Aggregation:
        return dupe_Aggregation(thing as Rel.Aggregation)
      case Rel.HLRTypeString.Restriction:
        return dupe_Restriction(thing as Rel.Restriction)
      case Rel.HLRTypeString.Projection:
        return dupe_Projection(thing as Rel.Projection)
      case Rel.HLRTypeString.Rename:
        return dupe_Rename(thing as Rel.Rename)
      case Rel.HLRTypeString.Relation:
        return dupe_Relation(thing as Rel.Relation)
      case Rel.HLRTypeString.Join:
        return dupe_Join(thing as Rel.Join)
      case Rel.HLRTypeString.Operation:
        return dupe_Operation(thing as Rel.Operation)

      default:
        console.info("Unexpected HLR", thing.type)
        throw new Error(`Unexpected Rel.HLRTypeString "${thing.type}"`)
    }
  else if (thing instanceof Rel.Column)
    return dupe_Column(thing)
  else if (thing instanceof Rel.Conditional)
    return dupe_Conditional(thing)
  else if (thing instanceof Rel.RelFunction)
    return dupe_Function(thing)
  else if (typeof thing === 'string' ||
           thing instanceof Catalog.Column ||
           thing instanceof Catalog.Relation)
    return thing
  else
    throw new Error("Unexpected type to dupe()")
}

function dupe_Operation(op: Rel.Operation) {
  return new Rel.Operation(
    op.op,
    dupe(op.lhs),
    dupe(op.rhs)
  )
}

function dupe_Column(column: Rel.Column) {
  return new Rel.Column(
    column.relation && dupe(column.relation),
    dupe(column.target),
    column.as
  )
}

function dupe_Function(funct: Rel.RelFunction) {
  return new Rel.RelFunction(
    funct.fname,
    dupe(funct.expr),
    funct.hlr && dupe(funct.hlr)
  )
}

function dupe_Aggregation(agg: Rel.Aggregation) {
  return new Rel.Aggregation(
    agg.attributes.map(dupe),
    agg.functions.map(dupe),
    dupe(agg.relation),
    agg.renames.slice()
  )
}

function dupe_Conditional(cond: Rel.Conditional) {
  return new Rel.Conditional(
    cond.operation,
    dupe(cond.lhs),
    Array.isArray(cond.rhs) ? cond.rhs.map(dupe) : dupe(cond.rhs)
  )
}

function dupe_Restriction(restr: Rel.Restriction) {
  return new Rel.Restriction(
    dupe(restr.conditions),
    dupe(restr.args)
  )
}

function dupe_Projection(proj: Rel.Projection) {
  return new Rel.Projection(
    proj.columns.map(dupe),
    dupe(proj.args)
  )
}

function dupe_Rename(ren: Rel.Rename) {
  const input = dupe(ren.input)
  return new Rel.Rename(
    input,
    ren.output,
    ren.args === ren.input
      ? input as Rel.HighLevelRelationish
      : dupe(ren.args)
  )
}

function dupe_Relation(rel: Rel.Relation) {
  return new Rel.Relation(rel.name, rel.target)
}

function dupe_Join(join: Rel.Join) {
  return new Rel.Join(
    dupe(join.lhs),
    dupe(join.rhs),
    dupe(join.condition)
  )
}
