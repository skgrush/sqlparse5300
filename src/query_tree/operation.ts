
export default
class Operation {
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
