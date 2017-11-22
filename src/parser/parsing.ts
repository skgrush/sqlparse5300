
import { parse as RelationParse } from './peg/relations'
import { parse as SqlParse } from './peg/sql'
export { SyntaxError as SqlSyntaxError } from './peg/sql'
import {Sql, Rel, Catalog} from './types'
import {fromSqlSelect, fromSelectPair} from './sqlToRel'

export function parseRelations(input: string, args?): Catalog.Catalog {
  return Catalog.Catalog.fromParse(RelationParse(input, args))
}

export function parseSql(input: string, args?) {
  return SqlParse(input, args)
}

export function sqlToRelationalAlgebra(sqlStatements, catalog: Catalog.Catalog) {
  if (!Array.isArray(sqlStatements))
    throw new Error("Expected SQL statements")
  if (sqlStatements.length > 1)
    throw new Error("Multiple statements not supported")

  const TLStatement = sqlStatements[0]
  if (TLStatement instanceof Sql.Select)
    return fromSqlSelect(TLStatement, catalog)
  else if (TLStatement instanceof Sql.SelectPair)
    return fromSelectPair(TLStatement, catalog)
  else
    throw new Error(`Unknown sqlToRelationalAlgebra arg ${TLStatement}`)
}
