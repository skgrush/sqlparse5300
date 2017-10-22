import * as React from "react"

export interface QueryInputProps {
  onUpdate: (text: string) => void
}

export default class QueryInput extends React.Component<QueryInputProps, any> {
  render() {
    return (
      <div id="query-input-wrapper">
        <textarea id="query-input" />
      </div>
    )
  }
}
