import * as React from "react"
import * as ReactDOM from "react-dom"

import './styles/tests.scss'

import Main from './Main'

import {involves} from './parser/relAnalysis'
import {selectResults} from './parser/tests'
Object.assign(window, {
  involves,
  selectResults,
  mainResult: [null, null]
})

ReactDOM.render(
  React.createElement(Main),
  document.getElementById("content")
)
