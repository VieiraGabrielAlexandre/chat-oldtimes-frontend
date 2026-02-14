# chat-oldtimes-frontend

Frontend do **chat-oldtimes**.

Interface web em React que conversa em tempo real com o backend em Go usando **WebSocket**.
A proposta é um bate-papo simples estilo “chat antigo”, porém com visual moderno dark.

> O frontend sozinho não faz nada.
> Primeiro você precisa subir o backend.

---

## Requisitos

Você precisa ter instalado:

* Node.js 18+
* NPM
* Go (para rodar o backend)

---

## 1) Rodar o backend (obrigatório)

Entre na pasta do backend (`chat-oldtimes`) e execute:

```
go run .
```

Se estiver certo, aparecerá algo como:

```
chat backend on :8080
```

Teste abrindo no navegador:

```
http://localhost:8080/rooms
```

Se abrir um JSON, o backend está funcionando.

---

## 2) Rodar o frontend

Agora vá para este repositório (`chat-oldtimes-frontend`):

### instalar dependências

```
npm install
```

### iniciar o servidor de desenvolvimento

```
npm run dev
```

Abra no navegador:

```
http://localhost:5173
```

---

## Como usar

1. Clique em **Conectar**
2. Digite um nickname
3. Entre na sala `geral`
4. Abra outra aba do navegador
5. Use outro nickname
6. Converse

As mensagens devem aparecer em tempo real entre as abas.

---

## Como funciona a comunicação

O frontend abre uma conexão WebSocket em:

```
ws://localhost:8080/ws?nick=SEU_NICK
```

Depois envia comandos em JSON.

Entrar em sala:

```
{"type":"join","room":"geral"}
```

Enviar mensagem:

```
{"type":"message","text":"ola"}
```

Trocar nickname:

```
{"type":"nick","nick":"novoNick"}
```

---

## Estrutura

```
src/
  lib/wsChat.ts     -> cliente WebSocket
  App.tsx           -> interface do chat
  main.tsx          -> inicialização do React
  index.css         -> estilos
```

---

## Problemas comuns

**Não conecta**
→ O backend não está rodando.

**“Você precisa estar conectado”**
→ Clique primeiro em **Conectar** antes de entrar na sala.

**Funciona no terminal mas não no navegador**
→ Abra:

```
http://localhost:8080/rooms
```

Se não abrir, o navegador não está alcançando o backend.

---

## Objetivo do projeto

Projeto de estudo para praticar:

* WebSocket
* Comunicação em tempo real
* React + Vite
* Concorrência em Go
* Frontend e backend desacoplados

Simples de entender, simples de rodar, e fácil de evoluir depois.

---