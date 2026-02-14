import { useEffect, useMemo, useRef, useState } from "react";
import { connectChat } from "./lib/wsChat";
import type { ServerEvent } from "./lib/wsChat";
import {
    IconConnect,
    IconDisconnect,
    IconDoorEnter,
    IconMessage,
    IconPalette,
    IconSend,
    IconSparkles,
    IconUser,
    IconUsers,
} from "./components/Icons";

type ChatLine = {
    id: string;
    kind: "message" | "system" | "presence" | "error";
    text: string;
    from?: string;
    room?: string;
    at?: string;
};

type Theme = {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    gradient: string;
    glow: string;
};

const THEMES: Theme[] = [
    {
        id: "ocean",
        name: "Oceano",
        primary: "from-blue-400/25 to-cyan-500/10 border-blue-400/20 text-blue-50",
        secondary: "from-cyan-300/25 to-blue-500/10 border-cyan-400/20 text-cyan-50",
        gradient: "radial-gradient(1200px 600px at 10% 10%, rgba(14, 165, 233, 0.20), transparent 60%), radial-gradient(900px 520px at 85% 18%, rgba(6, 182, 212, 0.16), transparent 55%)",
        glow: "shadow-[0_14px_40px_rgba(14,165,233,0.18)] hover:shadow-[0_18px_50px_rgba(14,165,233,0.25)]",
    },
    {
        id: "sunset",
        name: "Pôr do Sol",
        primary: "from-orange-400/25 to-pink-500/10 border-orange-400/20 text-orange-50",
        secondary: "from-pink-300/25 to-orange-500/10 border-pink-400/20 text-pink-50",
        gradient: "radial-gradient(1200px 600px at 10% 10%, rgba(251, 146, 60, 0.20), transparent 60%), radial-gradient(900px 520px at 85% 18%, rgba(236, 72, 153, 0.16), transparent 55%)",
        glow: "shadow-[0_14px_40px_rgba(251,146,60,0.18)] hover:shadow-[0_18px_50px_rgba(251,146,60,0.25)]",
    },
    {
        id: "forest",
        name: "Floresta",
        primary: "from-emerald-400/25 to-teal-500/10 border-emerald-400/20 text-emerald-50",
        secondary: "from-teal-300/25 to-emerald-500/10 border-teal-400/20 text-teal-50",
        gradient: "radial-gradient(1200px 600px at 10% 10%, rgba(16, 185, 129, 0.20), transparent 60%), radial-gradient(900px 520px at 85% 18%, rgba(20, 184, 166, 0.16), transparent 55%)",
        glow: "shadow-[0_14px_40px_rgba(16,185,129,0.18)] hover:shadow-[0_18px_50px_rgba(16,185,129,0.25)]",
    },
    {
        id: "lavender",
        name: "Lavanda",
        primary: "from-purple-400/25 to-violet-500/10 border-purple-400/20 text-purple-50",
        secondary: "from-violet-300/25 to-purple-500/10 border-violet-400/20 text-violet-50",
        gradient: "radial-gradient(1200px 600px at 10% 10%, rgba(168, 85, 247, 0.20), transparent 60%), radial-gradient(900px 520px at 85% 18%, rgba(139, 92, 246, 0.16), transparent 55%)",
        glow: "shadow-[0_14px_40px_rgba(168,85,247,0.18)] hover:shadow-[0_18px_50px_rgba(168,85,247,0.25)]",
    },
    {
        id: "rose",
        name: "Rosa",
        primary: "from-rose-400/25 to-pink-500/10 border-rose-400/20 text-rose-50",
        secondary: "from-pink-300/25 to-rose-500/10 border-pink-400/20 text-pink-50",
        gradient: "radial-gradient(1200px 600px at 10% 10%, rgba(244, 63, 94, 0.20), transparent 60%), radial-gradient(900px 520px at 85% 18%, rgba(236, 72, 153, 0.16), transparent 55%)",
        glow: "shadow-[0_14px_40px_rgba(244,63,94,0.18)] hover:shadow-[0_18px_50px_rgba(244,63,94,0.25)]",
    },
];

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

function GlowButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; classes?: string }) {
    const { className, variant = "primary", classes = "", ...rest } = props;

    return (
        <button
            {...rest}
            className={cx(
                "rounded-2xl border bg-gradient-to-b px-4 py-2.5 text-sm font-medium",
                variant === "primary" ? classes : "from-white/10 to-white/5 border-white/10 text-white/90",
                "backdrop-blur-xl transition-all duration-200 active:translate-y-[1px] active:scale-[0.98]",
                variant === "primary" && "hover:scale-[1.02]",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                className
            )}
        />
    );
}

function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; active?: boolean; classes?: string }) {
    const { className, active, children, classes = "", ...rest } = props;

    return (
        <button
            {...rest}
            className={cx(
                "group relative grid h-10 w-10 place-items-center rounded-[14px] border transition-all duration-200",
                active
                    ? `${classes} backdrop-blur-xl scale-100`
                    : "border-white/10 bg-white/[0.06] hover:bg-white/[0.09] hover:border-white/15 hover:scale-105 active:scale-95",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                className
            )}
        >
            {children}
        </button>
    );
}

export default function App() {
    const [nick, setNick] = useState(() => localStorage.getItem("nick") || "Gabriel");
    const [room, setRoom] = useState(() => localStorage.getItem("room") || "geral");
    const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("theme");
        return THEMES.find((t) => t.id === saved) || THEMES[0];
    });

    const [draft, setDraft] = useState("");
    const [lines, setLines] = useState<ChatLine[]>([
        { id: uid(), kind: "system", text: "Bem-vindo! Conecte-se para começar a conversar." },
    ]);

    const chatRef = useRef<ReturnType<typeof connectChat> | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const wsBase = useMemo(() => "ws://localhost:8080", []);
    const wsUrl = useMemo(() => `${wsBase}/ws?nick=${encodeURIComponent(nick)}`, [wsBase, nick]);

    const quickRooms = useMemo(() => ["geral", "tecnologia", "random", "anime", "musica"], []);
    const isOpen = status === "open";

    useEffect(() => {
        localStorage.setItem("theme", theme.id);
        document.body.style.background = `${theme.gradient}, linear-gradient(180deg, #05060a 0%, #070812 45%, #04050a 100%)`;
    }, [theme]);

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
            <div className="mx-auto max-w-7xl px-4 py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-white/[0.06] backdrop-blur-xl">
                            <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(220px_120px_at_50%_20%,rgba(255,255,255,0.18),transparent_70%)] opacity-80" />
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="relative">
                                <path
                                    d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-white/90"
                                />
                            </svg>
                        </div>
                        <div>
                            <div className="text-xl font-semibold tracking-tight">chat-oldtimes</div>
                            <div className="text-sm text-white/55">conversa em tempo real</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div
                            className={cx(
                                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur-xl transition-all duration-300",
                                isOpen && "border-emerald-400/30 bg-emerald-400/15 text-emerald-100",
                                status === "connecting" && "border-amber-400/30 bg-amber-400/15 text-amber-100",
                                status === "closed" && "border-white/10 bg-white/[0.06] text-white/70"
                            )}
                            title={wsBase}
                        >
                            <div className={cx(
                                "h-1.5 w-1.5 rounded-full transition-all duration-300",
                                isOpen && "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                                status === "connecting" && "bg-amber-400 animate-pulse",
                                status === "closed" && "bg-white/40"
                            )} />
                            {status}
                        </div>

                        <PrimaryButton onClick={connect} disabled={status === "connecting"} className="flex items-center gap-1.5">
                            <IconConnect size={16} />
                            Conectar
                        </PrimaryButton>

                        <GlowButton onClick={disconnect} variant="secondary">
                            <div className="flex items-center gap-1.5">
                                <IconDisconnect size={16} />
                                Sair
                            </div>
                        </GlowButton>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[400px_1fr]">
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IconUser size={18} className="text-white/70" />
                                <div className="text-sm font-medium text-white/85">Perfil</div>
                            </div>
                            <div className="text-xs text-white/45">local</div>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className="group rounded-[20px] border border-white/10 bg-white/[0.04] p-4 transition-all hover:bg-white/[0.06]">
                                <div className="mb-2 flex items-center gap-2 text-xs text-white/55">
                                    <IconUser size={14} />
                                    <span>Seu apelido</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={nick}
                                        onChange={(e) => setNick(e.target.value)}
                                        placeholder="ex: Gabriel"
                                        className={cx(
                                            "w-full rounded-[16px] border bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition-all duration-200",
                                            "border-white/10 focus:border-opacity-40",
                                            theme.primary.includes("blue") && "focus:border-blue-400/40",
                                            theme.primary.includes("orange") && "focus:border-orange-400/40",
                                            theme.primary.includes("emerald") && "focus:border-emerald-400/40",
                                            theme.primary.includes("purple") && "focus:border-purple-400/40",
                                            theme.primary.includes("rose") && "focus:border-rose-400/40"
                                        )}
                                    />
                                    <GlowButton
                                        onClick={changeNick}
                                        variant="primary"
                                        classes={theme.primary}
                                        disabled={!isOpen}
                                        className="px-4"
                                    >
                                        OK
                                    </GlowButton>
                                </div>
                            </div>

                            <div className="group rounded-[20px] border border-white/10 bg-white/[0.04] p-4 transition-all hover:bg-white/[0.06]">
                                <div className="mb-2 flex items-center gap-2 text-xs text-white/55">
                                    <IconUsers size={14} />
                                    <span>Sala de conversa</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={room}
                                        onChange={(e) => setRoom(e.target.value)}
                                        placeholder="ex: geral"
                                        className={cx(
                                            "w-full rounded-[16px] border bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition-all duration-200",
                                            "border-white/10 focus:border-opacity-40",
                                            theme.secondary.includes("cyan") && "focus:border-cyan-400/40",
                                            theme.secondary.includes("pink") && "focus:border-pink-400/40",
                                            theme.secondary.includes("teal") && "focus:border-teal-400/40",
                                            theme.secondary.includes("violet") && "focus:border-violet-400/40",
                                            theme.secondary.includes("rose") && "focus:border-rose-400/40"
                                        )}
                                    />
                                    <GlowButton
                                        onClick={() => joinRoom()}
                                        variant="primary"
                                        classes={theme.secondary}
                                        disabled={!isOpen}
                                        className="flex items-center gap-1.5 px-4"
                                    >
                                        <IconDoorEnter size={16} />
                                    </GlowButton>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {quickRooms.map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => joinRoom(r)}
                                            disabled={!isOpen}
                                            className={cx(
                                                "rounded-full border px-3 py-1.5 text-xs backdrop-blur-xl transition-all duration-200",
                                                room === r
                                                    ? `${theme.secondary} shadow-lg`
                                                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:scale-105 active:scale-95",
                                                !isOpen && "opacity-60"
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                                <div className="mb-3 flex items-center gap-2 text-xs text-white/55">
                                    <IconPalette size={14} />
                                    <span>Tema de cores</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {THEMES.map((t) => (
                                        <IconButton
                                            key={t.id}
                                            onClick={() => setTheme(t)}
                                            active={theme.id === t.id}
                                            classes={t.primary}
                                            title={t.name}
                                            className="h-12 w-12"
                                        >
                                            <div className={cx(
                                                "h-6 w-6 rounded-full transition-transform duration-200",
                                                t.primary.includes("blue") && "bg-gradient-to-br from-blue-400 to-cyan-500",
                                                t.primary.includes("orange") && "bg-gradient-to-br from-orange-400 to-pink-500",
                                                t.primary.includes("emerald") && "bg-gradient-to-br from-emerald-400 to-teal-500",
                                                t.primary.includes("purple") && "bg-gradient-to-br from-purple-400 to-violet-500",
                                                t.primary.includes("rose") && "bg-gradient-to-br from-rose-400 to-pink-500",
                                                theme.id === t.id && "scale-110"
                                            )} />
                                        </IconButton>
                                    ))}
                                </div>
                                <div className="mt-2 text-center text-xs text-white/45">{theme.name}</div>
                            </div>

                            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-xs text-white/60">
                                <div className="flex items-center gap-2 text-white/70">
                                    <IconSparkles size={14} />
                                    <span className="font-medium">Dica</span>
                                </div>
                                <div className="mt-2 text-white/55">
                                    Abra 2 abas com nicks diferentes e converse em tempo real!
                                </div>
                                <div className="mt-2 text-white/40 text-[11px]">
                                    Backend: {wsBase}
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className={cx(
                                    "grid h-10 w-10 place-items-center rounded-[14px] border backdrop-blur-xl transition-all duration-300",
                                    theme.secondary
                                )}>
                                    <IconMessage size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white/90">#{room}</div>
                                    <div className="text-xs text-white/45">conversa em tempo real</div>
                                </div>
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70">
                                <span className="text-white/45">você:</span> <span className="text-white/85">{nick}</span>
                            </div>
                        </div>

                        <div className="h-[62vh] overflow-y-auto px-6 py-5 scroll-smooth">
                            <div className="space-y-3">
                                {lines.map((l) => {
                                    const time = fmtTime(l.at);
                                    const mine = l.kind === "message" && l.from === nick;

                                    if (l.kind === "message") {
                                        return (
                                            <div
                                                key={l.id}
                                                className={cx(
                                                    "flex animate-[fadeIn_0.3s_ease-out]",
                                                    mine ? "justify-end" : "justify-start"
                                                )}
                                            >
                                                <div
                                                    className={cx(
                                                        "group max-w-[86%] rounded-[20px] border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-[1.02]",
                                                        mine
                                                            ? `${theme.secondary} shadow-lg`
                                                            : "border-white/10 bg-white/[0.06] hover:bg-white/[0.08]"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                                                        <IconUser size={12} className="opacity-60" />
                                                        <span className={cx("font-medium", mine ? "text-white/90" : "text-white/70")}>
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
                                                    <div className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/90">{l.text}</div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={l.id} className="flex justify-center animate-[fadeIn_0.3s_ease-out]">
                                            <div
                                                className={cx(
                                                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] backdrop-blur-xl transition-all duration-200 hover:scale-105",
                                                    l.kind === "error" && "border-red-400/30 bg-red-400/15 text-red-100",
                                                    l.kind === "system" && "border-white/10 bg-white/[0.06] text-white/70",
                                                    l.kind === "presence" && `${theme.primary}`
                                                )}
                                            >
                                                {l.kind === "presence" && <IconUsers size={12} />}
                                                <span>{l.text}</span>
                                                {l.room && <span className="text-white/30">• {l.room}</span>}
                                                {time && <span className="text-white/30">• {time}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>
                        </div>

                        <div className="border-t border-white/10 p-5">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                        disabled={!isOpen}
                                        placeholder={isOpen ? "Digite sua mensagem..." : "Conecte-se para conversar"}
                                        className={cx(
                                            "w-full rounded-[18px] border bg-black/20 pl-4 pr-4 py-3.5 text-sm text-white outline-none transition-all duration-200",
                                            "border-white/10 disabled:opacity-60",
                                            isOpen && "focus:border-opacity-40",
                                            theme.secondary.includes("cyan") && "focus:border-cyan-400/40",
                                            theme.secondary.includes("pink") && "focus:border-pink-400/40",
                                            theme.secondary.includes("teal") && "focus:border-teal-400/40",
                                            theme.secondary.includes("violet") && "focus:border-violet-400/40",
                                            theme.secondary.includes("rose") && "focus:border-rose-400/40"
                                        )}
                                    />
                                </div>
                                <GlowButton
                                    onClick={sendMessage}
                                    variant="primary"
                                    classes={cx(theme.secondary, theme.glow)}
                                    disabled={!isOpen}
                                    className="flex items-center gap-2 px-6"
                                >
                                    <IconSend size={16} />
                                    <span>Enviar</span>
                                </GlowButton>
                            </div>
                            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/40">
                                <IconSparkles size={12} />
                                <span>Pressione Enter para enviar sua mensagem</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
