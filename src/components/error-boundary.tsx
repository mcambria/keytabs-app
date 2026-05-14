import React from "react";
import { useTabStore } from "@/services/tab-store";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

class EditorErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Editor crashed:", error, info);
  }

  reset = () => this.setState({ error: null });

  deleteCurrentTab = () => {
    useTabStore.getState().deleteCurrentTab();
    this.setState({ error: null });
  };

  reload = () => window.location.reload();

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-ide-text">
        <div className="max-w-lg w-full bg-ide-bg-hover rounded p-6 border border-ide-text-destructive/40">
          <h2 className="text-lg font-medium text-ide-text-destructive mb-2">
            Something went wrong rendering this tab
          </h2>
          <p className="text-sm ide-text-muted mb-4">
            The editor hit an error and stopped rendering to avoid losing the rest of your data.
            The most likely cause is a malformed tab on disk.
          </p>
          <pre className="text-xs bg-ide-bg p-3 rounded overflow-auto max-h-40 mb-4 text-ide-text-muted">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="px-3 py-1.5 rounded bg-ide-bg-hover-hover hover:bg-ide-highlight text-sm"
            >
              Try again
            </button>
            <button
              onClick={this.deleteCurrentTab}
              className="px-3 py-1.5 rounded bg-ide-text-destructive/20 hover:bg-ide-text-destructive/30 text-ide-text-destructive text-sm"
            >
              Delete this tab
            </button>
            <button
              onClick={this.reload}
              className="px-3 py-1.5 rounded bg-ide-bg-hover-hover hover:bg-ide-highlight text-sm"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default EditorErrorBoundary;
