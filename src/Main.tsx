import * as React from "react"

import QueryInput from './components/QueryInput'
import RelationsInput from './components/RelationsInput'

console.log("Main.tsx execution")

export interface MainState {
  relationsInputText: string
  queryInputText: string
}

export default class Main extends React.Component<any, MainState> {
  constructor(props: any) {
    super(props)
    this.state = {
      relationsInputText: "",
      queryInputText: ""
    }

    this.onRelationsInputUpdate = this.onRelationsInputUpdate.bind(this)
    this.onQueryInputUpdate = this.onQueryInputUpdate.bind(this)
  }

  onRelationsInputUpdate(text: string): void {
    this.setState({relationsInputText: text})
  }

  onQueryInputUpdate(text: string): void {
    this.setState({queryInputText: text})
  }

  render() {
    return (
      <main id="main">
        <RelationsInput onUpdate={this.onRelationsInputUpdate} />
        <QueryInput onUpdate={this.onQueryInputUpdate} />

      </main>
    )
  }
}
