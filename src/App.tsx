import { useEffect, useMemo, useRef, useState } from "react";
import { connectChat } from "./lib/wsChat";
import type { ServerEvent } from "./lib/wsChat";

type ChatLine = {
    id: string;
    kind: "message" | "system" | "presence" | "error";
    text: string;
    from?: string;
    room?: string;
    at?: string;
};

function uid() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function fmtTime(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function cx(...s: Array<string | false | undefined>) {
    return s.filter(Boolean).join(" ");
}

function GlassCard(props: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_12px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl",
                "before:absolute before:inset-0 before:bg-[radial-gradient(900px_240px_at_20%_0%,rgba(255,255,255,0.10),transparent_60%)] before:opacity-70",
                props.className
            )}
        >
            <div className="relative">{props.children}</div>
        </div>
    );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { className, ...rest } = props;
    return (
        <button
            {...rest}
            className={cx(
                "relative rounded-2xl px-4 py-2.5 text-sm font-medium text-zinc-950",
                "bg-gradient-to-b from-white to-zinc-200 shadow-[0_12px_30px_rgba(0,0,0,0.35)]",
                "hover:from-white hover:to-white active:translate-y-[1px] transition",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                className
            )}
        />
    );
}

function GlowButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "indigo" | "emerald" }) {
    const { className, tone = "indigo", ...rest } = props;

    const toneClasses =
        tone === "emerald"
            ? "from-emerald-300/25 to-emerald-500/10 border-emerald-400/20 text-emerald-50"
            : "from-indigo-300/25 to-indigo-500/10 border-indigo-400/20 text-indigo-50";

    const glow =
        tone === "emerald"
            ? "shadow-[0_14px_40px_rgba(16,185,129,0.18)] hover:shadow-[0_18px_50px_rgba(16,185,129,0.25)]"
            : "shadow-[0_14px_40px_rgba(99,102,241,0.18)] hover:shadow-[0_18px_50px_rgba(99,102,241,0.25)]";

    return (
        <button
            {...rest}
            className={cx(
                "rounded-2xl border bg-gradient-to-b px-4 py-2.5 text-sm font-medium",
                toneClasses,
                "backdrop-blur-xl transition active:translate-y-[1px]",
                glow,
                "disabled:opacity-60 disabled:cursor-not-allowed",
                className
            )}
        />
    );
}

export default function App() {
    const [nick, setNick] = useState(() => localStorage.getItem("nick") || "Gabriel");
    const [room, setRoom] = useState(() => localStorage.getItem("room") || "geral");
    const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");

    const [draft, setDraft] = useState("");
    const [lines, setLines] = useState<ChatLine[]>([
        { id: uid(), kind: "system", text: "Conecte, entre numa sala e comece a conversar." },
    ]);

    const chatRef = useRef<ReturnType<typeof connectChat> | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const wsBase = useMemo(() => "ws://localhost:8080", []);
    const wsUrl = useMemo(() => `${wsBase}/ws?nick=${encodeURIComponent(nick)}`, [wsBase, nick]);

    const quickRooms = useMemo(() => ["geral", "tecnologia", "random", "anime", "musica"], []);
    const isOpen = status === "open";

    function append(l: Omit<ChatLine, "id">) {
        setLines((prev) => {
            const next = [...prev, { id: uid(), ...l }];
            return next.length > 600 ? next.slice(next.length - 600) : next;
        });
    }

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines.length]);

    function onEvent(ev: ServerEvent) {
        if (ev.type === "message") {
            append({ kind: "message", text: ev.text, from: ev.from, room: ev.room, at: ev.at });
            return;
        }
        if (ev.type === "presence") {
            const label = ev.text === "join" ? "entrou" : "saiu";
            append({ kind: "presence", text: `${ev.from} ${label}`, room: ev.room, at: ev.at });
            return;
        }
        if (ev.type === "system") {
            append({ kind: "system", text: ev.text, room: ev.room, at: ev.at });
            return;
        }
        if (ev.type === "error") {
            append({ kind: "error", text: ev.text, at: ev.at });
            return;
        }
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
                        chatRef.current?.send({ type: "join", room });
                        append({ kind: "system", text: `Conectado. Entrando na sala ${room}...` });
                    }
                    if (s === "closed") {
                        append({ kind: "error", text: "Socket fechado. Se foi inesperado, veja o Console do navegador." });
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
        setStatus("closed");
        append({ kind: "system", text: "Desconectado." });
    }

    function joinRoom(nextRoom?: string) {
        const r = (nextRoom ?? room).trim();
        if (!r) return;

        localStorage.setItem("room", r);
        setRoom(r);

        if (!isOpen) {
            append({ kind: "error", text: "Conecte (status open) antes de entrar em uma sala." });
            return;
        }

        chatRef.current?.send({ type: "join", room: r });
        append({ kind: "system", text: `Entrando na sala ${r}...` });
    }

    function changeNick() {
        const n = nick.trim();
        if (!n) return;

        localStorage.setItem("nick", n);
        setNick(n);

        if (!isOpen) {
            append({ kind: "error", text: "Conecte primeiro para trocar o nick." });
            return;
        }

        chatRef.current?.send({ type: "nick", nick: n });
        append({ kind: "system", text: `Solicitando troca de nick para ${n}...` });
    }

    function sendMessage() {
        const text = draft.trim();
        if (!text) return;

        if (!isOpen) {
            append({ kind: "error", text: "Conecte primeiro para enviar mensagens." });
            return;
        }

        chatRef.current?.send({ type: "message", text });
        setDraft("");
    }

    return (
        <div className="min-h-screen text-zinc-100">
            <div className="mx-auto max-w-6xl px-4 py-6">
                {/* Top bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl">
                            <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(220px_120px_at_50%_20%,rgba(255,255,255,0.18),transparent_70%)] opacity-80" />
                            <span className="relative text-lg"></span>
                        </div>
                        <div>
                            <div className="text-xl font-semibold tracking-tight">chat-oldtimes</div>
                            <div className="text-sm text-white/55">um chat realtime com vibe premium</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div
                            className={cx(
                                "rounded-full border px-3 py-1.5 text-xs backdrop-blur-xl",
                                isOpen && "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
                                status === "connecting" && "border-amber-400/20 bg-amber-400/10 text-amber-100",
                                status === "closed" && "border-white/10 bg-white/[0.06] text-white/70"
                            )}
                            title={wsBase}
                        >
                            {status}
                        </div>

                        <PrimaryButton onClick={connect} disabled={status === "connecting"}>
                            Conectar
                        </PrimaryButton>

                        <GlowButton onClick={disconnect} tone="indigo">
                            Desconectar
                        </GlowButton>
                    </div>
                </div>

                {/* Layout */}
                <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
                    {/* Left */}
                    <GlassCard className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-white/85">Perfil</div>
                            <div className="text-xs text-white/45">local</div>
                        </div>

                        <div className="mt-4 space-y-4">
                            {/* Nick */}
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                                <div className="text-xs text-white/55">Nick</div>
                                <div className="mt-2 flex gap-2">
                                    <input
                                        value={nick}
                                        onChange={(e) => setNick(e.target.value)}
                                        placeholder="ex: Gabriel"
                                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/40"
                                    />
                                    <GlowButton onClick={changeNick} tone="indigo" disabled={!isOpen} className="px-3">
                                        OK
                                    </GlowButton>
                                </div>
                            </div>

                            {/* Room */}
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                                <div className="text-xs text-white/55">Sala</div>
                                <div className="mt-2 flex gap-2">
                                    <input
                                        value={room}
                                        onChange={(e) => setRoom(e.target.value)}
                                        placeholder="ex: geral"
                                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                                    />
                                    <GlowButton onClick={() => joinRoom()} tone="emerald" disabled={!isOpen} className="px-4">
                                        Entrar
                                    </GlowButton>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {quickRooms.map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => joinRoom(r)}
                                            disabled={!isOpen}
                                            className={cx(
                                                "rounded-full border px-3 py-1.5 text-xs backdrop-blur-xl transition",
                                                room === r
                                                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                                                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.07]",
                                                !isOpen && "opacity-60"
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/60">
                                Backend: <span className="text-white/85">{wsBase}</span>
                                <div className="mt-1 text-white/45">Abra 2 abas e use nicks diferentes.</div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Right */}
                    <GlassCard>
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <div>
                                <div className="text-sm font-medium text-white/85">Sala: {room}</div>
                                <div className="text-xs text-white/45">Mensagens em tempo real</div>
                            </div>
                            <div className="text-xs text-white/45">Você: <span className="text-white/80">{nick}</span></div>
                        </div>

                        {/* Messages */}
                        <div className="h-[62vh] overflow-y-auto px-5 py-4">
                            <div className="space-y-3">
                                {lines.map((l) => {
                                    const time = fmtTime(l.at);
                                    const mine = l.kind === "message" && l.from === nick;

                                    if (l.kind === "message") {
                                        return (
                                            <div key={l.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                                                <div
                                                    className={cx(
                                                        "max-w-[86%] rounded-[22px] border px-4 py-3 shadow-sm",
                                                        mine
                                                            ? "border-emerald-400/20 bg-gradient-to-b from-emerald-400/12 to-white/[0.03]"
                                                            : "border-white/10 bg-white/[0.04]"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                            <span className={cx("font-medium", mine ? "text-emerald-100" : "text-white/70")}>
                              {l.from}
                            </span>
                                                        <span className="text-white/20">•</span>
                                                        <span>{l.room}</span>
                                                        {time && (
                                                            <>
                                                                <span className="text-white/20">•</span>
                                                                <span>{time}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 whitespace-pre-wrap text-sm text-white/90">{l.text}</div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={l.id} className="flex justify-center">
                                            <div
                                                className={cx(
                                                    "rounded-full border px-3 py-1.5 text-[11px] backdrop-blur-xl",
                                                    l.kind === "error" && "border-red-400/25 bg-red-400/10 text-red-100",
                                                    l.kind === "system" && "border-white/10 bg-white/[0.04] text-white/65",
                                                    l.kind === "presence" && "border-indigo-400/20 bg-indigo-400/10 text-indigo-100"
                                                )}
                                            >
                                                {l.text}
                                                {l.room ? ` • ${l.room}` : ""}
                                                {time ? ` • ${time}` : ""}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>
                        </div>

                        {/* Composer */}
                        <div className="border-t border-white/10 p-4">
                            <div className="flex gap-2">
                                <input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                    disabled={!isOpen}
                                    placeholder={isOpen ? "Digite sua mensagem e aperte Enter..." : "Conecte para conversar"}
                                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/40 disabled:opacity-60"
                                />
                                <GlowButton onClick={sendMessage} tone="emerald" disabled={!isOpen} className="px-6">
                                    Enviar
                                </GlowButton>
                            </div>
                            <div className="mt-2 text-[11px] text-white/45">Enter envia. Shift+Enter não quebra linha (por enquanto).</div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}