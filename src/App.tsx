import { useEffect, useMemo, useRef, useState } from "react";
import { connectChat } from "./lib/wsChat";
import type { ServerEvent } from "./lib/wsChat";

type ChatLine = { kind: "message" | "system" | "presence" | "error"; text: string; meta?: string };

function cx(...s: Array<string | false | undefined>) {
    return s.filter(Boolean).join(" ");
}

export default function App() {
    const [nick, setNick] = useState(() => localStorage.getItem("nick") || "Gabriel");
    const [room, setRoom] = useState(() => localStorage.getItem("room") || "geral");
    const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");
    const [msg, setMsg] = useState("");
    const [lines, setLines] = useState<ChatLine[]>([{ kind: "system", text: "Conecte, entre numa sala e converse." }]);

    const chatRef = useRef<ReturnType<typeof connectChat> | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const wsUrl = useMemo(() => `ws://localhost:8080/ws?nick=${encodeURIComponent(nick)}`, [nick]);

    const append = (l: ChatLine) =>
        setLines((prev) => {
            const next = [...prev, l];
            return next.length > 400 ? next.slice(next.length - 400) : next;
        });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines.length]);

    function onEvent(ev: ServerEvent) {
        if (ev.type === "message") return append({ kind: "message", text: ev.text, meta: `${ev.from} • ${ev.room}` });
        if (ev.type === "presence")
            return append({
                kind: "presence",
                text: `${ev.from} ${ev.text === "join" ? "entrou" : "saiu"} • ${ev.room}`,
            });
        if (ev.type === "system") return append({ kind: "system", text: ev.text });
        if (ev.type === "error") return append({ kind: "error", text: ev.text });
    }

    function connect() {
        localStorage.setItem("nick", nick);
        localStorage.setItem("room", room);

        chatRef.current?.close();

        chatRef.current = connectChat(
            { nick, url: wsUrl },
            {
                onStatus: (s) => {
                    setStatus(s);
                    if (s === "open") {
                        // entra na sala assim que abriu
                        chatRef.current?.send({ type: "join", room });
                        append({ kind: "system", text: `Conectado. Entrando na sala ${room}...` });
                    }
                    if (s === "closed") {
                        append({ kind: "error", text: "socket fechou (ver console do navegador)" });
                    }
                },
                onEvent,
            }
        );

        append({ kind: "system", text: `Conectando em ${wsUrl}` });
    }


    function disconnect() {
        chatRef.current?.close();
        chatRef.current = null;
        append({ kind: "system", text: "Desconectado." });
    }

    function joinRoom() {
        if (status !== "open") {
            append({ kind: "error", text: "você precisa estar conectado (status open) para isso" });
            return;
        }
        localStorage.setItem("room", room);
        chatRef.current?.send({ type: "join", room });
        append({ kind: "system", text: `Entrando na sala ${room}...` });
    }

    function changeNick() {
        if (status !== "open") {
            append({ kind: "error", text: "você precisa estar conectado (status open) para isso" });
            return;
        }
        localStorage.setItem("nick", nick);
        chatRef.current?.send({ type: "nick", nick });
        append({ kind: "system", text: `Solicitando troca de nick para ${nick}...` });
    }

    function sendMessage() {
        if (status !== "open") {
            append({ kind: "error", text: "você precisa estar conectado (status open) para isso" });
            return;
        }
        const text = msg.trim();
        if (!text) return;
        chatRef.current?.send({ type: "message", text });
        setMsg("");
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-100">
            <div className="mx-auto max-w-5xl px-4 py-6">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="text-2xl font-semibold tracking-tight">chat-oldtimes</div>
                        <div className="text-sm text-zinc-400">frontend (React) falando com backend local</div>
                    </div>

                    <div className="flex items-center gap-2">
            <span
                className={cx(
                    "rounded-full px-3 py-1 text-xs",
                    status === "open" && "bg-emerald-500/15 text-emerald-300",
                    status === "connecting" && "bg-amber-500/15 text-amber-300",
                    status === "closed" && "bg-zinc-700/40 text-zinc-200"
                )}
            >
              {status}
            </span>
                        <button onClick={connect} className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950">
                            Conectar
                        </button>
                        <button onClick={disconnect} className="rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100">
                            Desconectar
                        </button>
                    </div>
                </header>

                <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
                    <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 shadow-sm">
                        <div className="text-sm font-medium text-zinc-200">Config</div>

                        <div className="mt-3 space-y-3">
                            <div>
                                <div className="text-xs text-zinc-400">Nick</div>
                                <div className="mt-1 flex gap-2">
                                    <input
                                        value={nick}
                                        onChange={(e) => setNick(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                    />
                                    <button onClick={changeNick} className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">
                                        OK
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-zinc-400">Sala</div>
                                <div className="mt-1 flex gap-2">
                                    <input
                                        value={room}
                                        onChange={(e) => setRoom(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                    />
                                    <button onClick={joinRoom} className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">
                                        Entrar
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                                Backend: <span className="text-zinc-200">ws://localhost:8080</span>
                            </div>
                        </div>
                    </aside>

                    <main className="rounded-2xl border border-zinc-800 bg-zinc-950/50 shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                            <div className="text-sm font-medium text-zinc-200">Mensagens</div>
                            <div className="text-xs text-zinc-500">Abra 2 abas para testar</div>
                        </div>

                        <div className="h-[58vh] overflow-y-auto px-4 py-4">
                            <div className="space-y-2">
                                {lines.map((l, i) => (
                                    <div
                                        key={i}
                                        className={cx(
                                            "rounded-xl border px-3 py-2 text-sm",
                                            l.kind === "message" && "border-zinc-800 bg-zinc-900/60",
                                            l.kind === "system" && "border-zinc-800 bg-zinc-950/40 text-zinc-300",
                                            l.kind === "presence" && "border-zinc-800 bg-zinc-950/40 text-zinc-400",
                                            l.kind === "error" && "border-red-900/50 bg-red-950/30 text-red-200"
                                        )}
                                    >
                                        {l.meta && <div className="mb-1 text-xs text-zinc-500">{l.meta}</div>}
                                        <div className="whitespace-pre-wrap">{l.text}</div>
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>
                        </div>

                        <div className="border-t border-zinc-800 p-3">
                            <div className="flex gap-2">
                                <input
                                    value={msg}
                                    onChange={(e) => setMsg(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                                    placeholder="Digite e aperte Enter..."
                                />
                                <button onClick={sendMessage} className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-950">
                                    Enviar
                                </button>
                            </div>
                        </div>
                    </main>
                </div>

                <footer className="mt-5 text-xs text-zinc-500">Se não conectar, confirme que o backend Go está rodando em :8080.</footer>
            </div>
        </div>
    );
}