import * as React from 'react'
import * as types from '../parser/types'
import {htmlRelRelation, htmlRelProjection, relJoinHelper, htmlRelRestriction,
        htmlRelRename, getSymbol } from '../parser/relationalText'

// if RelRelation:    just name
// if RelJoin:        ....
// if RelRestriction: SYM _ (conditions)
// if RelProjection:  SYM _ (columns)
// if RelRename:      SYM _ (A / B)
// if RelOperation:   hlr SYM hlr

export class QTOperation {
  symbolName: string
  hlr: types.HighLevelRelationish
  html: JSX.Element

  constructor(hlr: types.HighLevelRelationish) {
    this.hlr = hlr
  }
}

export class Relation extends QTOperation {
  hlr: types.RelRelation
  constructor(hlr: types.RelRelation) {
    super(hlr)
    this.html = htmlRelRelation(hlr)
  }
}

export class Join extends QTOperation {
  hlr: types.RelJoin
  constructor(hlr: types.RelJoin) {
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
  hlr: types.RelRestriction
  constructor(hlr: types.RelRestriction) {
    super(hlr)
    this.html = htmlRelRestriction(hlr, true)
  }
}

export class Projection extends QTOperation {
  hlr: types.RelProjection
  constructor(hlr: types.RelProjection) {
    super(hlr)
    this.html = htmlRelProjection(hlr, true)
  }
}

export class Rename extends QTOperation {
  hlr: types.RelRename
  constructor(hlr: types.RelRename) {
    super(hlr)
    this.html = htmlRelRename(hlr, true)
  }
}

export class Operation extends QTOperation {
  hlr: types.RelOperation
  constructor(hlr: types.RelOperation) {
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
