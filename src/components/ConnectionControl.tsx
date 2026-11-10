import type { Status } from '../lib/device'

const statusLabel: Record<Status, string> = {
  disconnected: '연결 안 됨',
  connecting: '연결 중…',
  connected: '연결됨',
  error: '연결 실패, 다시 시도',
}

type Props = {
  status: Status
  onConnect: () => void
  onDisconnect: () => void
}

export function ConnectionControl({ status, onConnect, onDisconnect }: Props) {
  const connected = status === 'connected'
  return (
    <div className="control-row">
      <div>
        <p className="t-label">센서</p>
        <p className={`t-label connection-status status-${status}`} role="status">
          <span aria-hidden="true" />
          {statusLabel[status]}
        </p>
      </div>
      <button
        className={`action-button ${connected ? 'secondary' : ''}`}
        disabled={status === 'connecting'}
        onClick={connected ? onDisconnect : onConnect}
        type="button"
      >
        {connected ? '연결 끊기' : '센서 연결'}
      </button>
    </div>
  )
}
