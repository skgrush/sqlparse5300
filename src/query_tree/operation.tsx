import * as React from 'react'
import {Rel} from '../parser/types'
import {htmlRelRelation, htmlRelProjection, relJoinHelper, htmlRelRestriction,
        htmlRelRename, getSymbol, htmlRelAggregation
       } from '../parser/relationalText'

// if RelRelation:    just name
// if RelJoin:        ....
// if RelRestriction: SYM _ (conditions)
// if RelProjection:  SYM _ (columns)
// if RelRename:      SYM _ (A / B)
// if RelOperation:   hlr SYM hlr

export class QTOperation {
  symbolName: string
  hlr: Rel.HighLevelRelationish
  html: JSX.Element

  constructor(hlr: Rel.HighLevelRelationish) {
    this.hlr = hlr
  }
}

export class Relation extends QTOperation {
  hlr: Rel.Relation
  constructor(hlr: Rel.Relation) {
    super(hlr)
    this.html = htmlRelRelation(hlr)
  }
}

export class Join extends QTOperation {
  hlr: Rel.Join
  constructor(hlr: Rel.Join) {
    super(hlr)
    this.html = this.generateHTML()
  }

  generateHTML() {
    const [joinSymbol, cond] = relJoinHelper(this.hlr)
    return (
      <span className="RelJoin">
        <span className="operator">{joinSymbol}</span>
        {cond}
      </span>
    )
  }
}

export class Restriction extends QTOperation {
  hlr: Rel.Restriction
  constructor(hlr: Rel.Restriction) {
    super(hlr)
    this.html = htmlRelRestriction(hlr, true)
  }
}

export class Projection extends QTOperation {
  hlr: Rel.Projection
  constructor(hlr: Rel.Projection) {
    super(hlr)
    this.html = htmlRelProjection(hlr, true)
  }
}

export class Rename extends QTOperation {
  hlr: Rel.Rename
  constructor(hlr: Rel.Rename) {
    super(hlr)
    this.html = htmlRelRename(hlr, true)
  }
}

export class Operation extends QTOperation {
  hlr: Rel.Operation
  constructor(hlr: Rel.Operation) {
    super(hlr)
    this.html = this.generateHTML()
  }

  generateHTML() {
    const SYM = getSymbol(this.hlr.op)
    return (
      <span className="operator">{SYM}</span>
    )
  }
}

export class Aggregation extends QTOperation {
  hlr: Rel.Aggregation
  constructor(hlr: Rel.Aggregation) {
    super(hlr)
    this.html = htmlRelAggregation(hlr, true)
  }
}

/*export class From extends Operation {
  constructor() {
    super("From")
  }

  addTarget(data) {
     if(data.lhs && data.rhs) {
       this.addTarget(data.lhs)
       this.addTarget(data.rhs)
       return
     }

     else if(data.lhs || data.rhs) {
       throw new Error('From without both lhs and rhs')
     }

    let arg = data.target.target
    if(data.alias) arg += ` as ${data.alias}`
    this.addArgument(arg)
  }
}*/

/*export class Where extends Operation {
  constructor() {
    super("Where")
  }

  addTarget(data) {
    let lhs = this.getArgument(data.lhs)
    let rhs = this.getArgument(data.rhs)
    this.addArgument(lhs + ` ${data.operation} ` + rhs)
  }

  getArgument(data): string {
    if(data.lhs && data.rhs) {
      let lhs = this.getArgument(data.lhs)
      let rhs = this.getArgument(data.rhs)
      let arg = lhs + ` ${data.operation} ` + rhs
      return arg
    } else if(data.lhs || data.rhs) {
      throw new Error('lhs and rhs not both specified')
    }

    let arg
    if(data.relation) arg = `${data.relation}.${data.target}`
    if(data.relation && data.alias) arg += ` as ${data.alias}`
    if(data.literalType === "number" && data.value) arg = data.value
    if(data.literalType === "string" && data.value) arg = `\'${data.value}\'`

    return arg
  }
}*/
