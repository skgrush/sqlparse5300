
export class Catalog {

  static fromParse(relations: Array<[string, Array<[string, string]>]>) {
    const rels = new Map()
    relations.forEach((ele) => {
      const [tname, cols] = ele
      const columnMap = new Map()
      cols.forEach((col) => {
        columnMap.set(col[0], new Column(col[0], col[1]))
      })
      rels.set(tname, new Relation(tname, columnMap))
    })
    return new Catalog(rels)
  }

  relations: Map<string, Relation>

  constructor(relations: Map<string, Relation>) {
    this.relations = relations
  }
}

export class Relation {
  name: string
  columns: Map<string, Column>

  constructor(name: string, columns: Map<string, Column>) {
    this.name = name
    this.columns = columns
  }
}

export class Column {
  name: string
  typ: string

  constructor(name: string, typ: string) {
    this.name = name
    this.typ = typ
  }
}
