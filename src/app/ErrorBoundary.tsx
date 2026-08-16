import { Component, type ReactNode } from 'react'
import { paintCrash } from './crashScreen'

interface Props {
  children: ReactNode
}

// React swallows render errors by unmounting the tree, which is precisely how
// you end up staring at a white screen. This hands them to the crash screen.
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    paintCrash(error, 'react-render')
  }

  render() {
    // paintCrash has taken over #root by now; rendering nothing avoids a
    // second React pass fighting it for the same node.
    if (this.state.failed) return null
    return this.props.children
  }
}
