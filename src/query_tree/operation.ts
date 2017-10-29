
export class Operation {
  name: string
  //TODO: better define this type
  arguments: string[] = []

  constructor(name: string) {
    this.name = name
  }

  addArgument(arg: string) {
    this.arguments.push(arg)
  }
}

export class Projection extends Operation {
  constructor() {
    super("Project")
  }

  addTarget(data) {
    let { relation, target, alias} = data
    let arg: string = `${relation} ${target}`
    if(alias)
      arg += ` as ${alias}`

    this.addArgument(arg)
  }
}

export class From extends Operation {
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

    let arg = data.target
    if(data.alias) arg += ` as ${data.alias}`
    this.addArgument(arg)
  }
}

export class Where extends Operation {
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
    if(data.value) arg = data.value
    
    return arg
  }
}
