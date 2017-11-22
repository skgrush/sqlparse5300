import * as React from "react"

import {Catalog} from '../parser/types'
import TestCase from './TestCase'
import {selectTests} from "../parser/tests"

export function getTestName(testStr: string) {
  if (testStr.startsWith('--'))
    return testStr.split("\n", 1)[0].slice(2).trim()
  return ''
}

interface TestsProps {
  catalog: Catalog.Catalog | null
}

interface TestsState {
  catalog: Catalog.Catalog | null
  doRun: boolean
  queryNames: string[]
}

export default class Tests extends React.Component<TestsProps, TestsState> {
  constructor(props) {
    super(props)
    this.state = {
      catalog: props.catalog,
      doRun: false,
      queryNames: selectTests.map(getTestName)
    }

    this.run = this.run.bind(this)
  }

  componentWillReceiveProps(nextProps: TestsProps) {
    const catalog = nextProps.catalog
    if (catalog !== this.props.catalog)
      this.setState({
        catalog,
        doRun: false
      })
  }

  run(e?) {
    if (e) e.preventDefault()
    if (this.state.catalog)
      this.setState({
        doRun: true
      })
  }

  render() {
    return (
      <div id="tests-div">
        <h2>Test Cases</h2>
        <button
          onClick={this.run}
          disabled={!this.state.catalog}
        >Run Tests</button>
        <nav id="tests-nav">
          <ol>
            {
              this.state.queryNames.map((qName, idx) => {
                const anchor = `#q${idx}`
                return (
                  <li key={anchor}>
                    <a href={anchor}>{qName || anchor}</a>
                  </li>
                )
              })
            }
          </ol>
        </nav>
        <div id="tests-list">
          {
            selectTests.map((testStr, idx) => (
              <TestCase
                queryInputText={testStr}
                catalog={this.state.catalog}
                doRun={this.state.doRun}
                key={idx}
                anchor={`q${idx}`}
                name={this.state.queryNames[idx] || undefined}
              />
            ))
          }
        </div>
      </div>
    )
  }
}
