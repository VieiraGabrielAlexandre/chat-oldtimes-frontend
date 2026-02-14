export type ClientCommand =
    | { type: "join"; room: string }
    | { type: "message"; text: string }
    | { type: "nick"; nick: string }
    | { type: "ping" };

export type ServerEvent =
    | { type: "system"; text: string; at?: string; room?: string }
    | { type: "error"; text: string; at?: string }
    | { type: "presence"; room: string; from: string; text: "join" | "leave"; at?: string }
    | { type: "message"; room: string; from: string; text: string; at?: string };

type Handlers = {
  onEvent: (ev: ServerEvent) => void;
  onStatus: (s: "connecting" | "open" | "closed") => void;
};

export function connectChat(params: { nick: string; url?: string }, handlers: Handlers) {
  const url = params.url ?? `ws://localhost:8080/ws?nick=${encodeURIComponent(params.nick)}`;
  const ws = new WebSocket(url);

  handlers.onStatus("connecting");

  ws.onerror = () => {
    handlers.onEvent({ type: "error", text: "websocket error (veja o Console do navegador)" });
  };

  ws.onopen = () => handlers.onStatus("open");
  ws.onclose = () => handlers.onStatus("closed");

  ws.onmessage = (e) => {
    try {
      handlers.onEvent(JSON.parse(e.data) as ServerEvent);
    } catch {
      handlers.onEvent({ type: "error", text: "evento inválido (json parse falhou)" });
    }
  };

  const send = (cmd: ClientCommand) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(cmd));
  };

  const close = () => ws.close();

  return { send, close };
}
