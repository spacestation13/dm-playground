import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center rounded border border-slate-800 bg-slate-900 p-6 text-sm text-[var(--editor-text)]">
          <div>
            <div className="text-base font-semibold text-[var(--editor-text)]">
              Something went wrong.
            </div>
            <div className="mt-2 text-xs text-[var(--editor-text)]">
              {this.state.message ?? 'Unknown error'}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
