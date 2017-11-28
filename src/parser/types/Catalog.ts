
type NameTypePair = [string, string]
type RelnameColsPair = [string, NameTypePair[]]
type ColumnMap = Map<string, Column>

export class Catalog {

  static fromParse(relations: RelnameColsPair[]) {
    const rels = new Map()
    relations.forEach((ele) => {
      const [tname, cols] = ele
      const columnMap = new Map() as ColumnMap
      const newRelation = new Relation(tname, columnMap)
      cols.forEach(Column.fromNameTypePair.bind(null, columnMap, newRelation))
      rels.set(tname, newRelation)
    })
    return new Catalog(rels)
  }

  readonly relations: Map<string, Relation>

  constructor(relations: Map<string, Relation>) {
    this.relations = relations
  }
}

export class Relation {
  readonly name: string
  readonly columns: ColumnMap

  constructor(name: string, columns: ColumnMap) {
    this.name = name
    this.columns = columns
  }
}

export class Column {

  static fromNameTypePair(columnMap: ColumnMap,
                          newRelation: Relation,
                          col: NameTypePair): Column {
    const newCol = new Column(col[0], col[1], newRelation)
    columnMap.set(col[0], newCol)
    return newCol
  }

  readonly name: string
  readonly typ: string
  readonly relation: Relation

  constructor(name: string, typ: string, relation: Relation) {
    this.name = name
    this.typ = typ
    this.relation = relation
  }
}
