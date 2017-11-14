import * as React from "react"
import * as ReactDOM from "react-dom"

import * as d3 from 'd3'
import {testResults} from './parser/tests'

Object.assign(
  window,
  {
    d3,
    testResults
  }
)

import './styles/tests.scss'

import Main from './Main'

ReactDOM.render(
  React.createElement(Main),
  document.getElementById("content")
)
