
import { parse as RelationParse } from './peg/relations'
import { parse as SqlParse } from './peg/sql'
import * as types from './types'
import {fromSqlSelect, fromSelectPair} from './sqlToRel'

export function parseRelations(input: string): types.Catalog {
  return RelationParse(input, undefined)
}

export function parseSql(input: string) {
  const sql = SqlParse(input, undefined)
}

export function sqlToRelationalAlgebra(sqlStatements, catalog: types.Catalog) {
  if (!Array.isArray(sqlStatements))
    throw new Error("Expected SQL statements")
  if (sqlStatements.length > 1)
    throw new Error("Multiple statements not supported")

  const TLStatement = sqlStatements[0]
  if (TLStatement instanceof types.SqlSelect)
    return fromSqlSelect(TLStatement, catalog)
  else if (Array.isArray(TLStatement) && TLStatement.length === 4)
    return fromSelectPair(TLStatement as any, catalog)
}
