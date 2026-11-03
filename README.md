# Stockflow Desktop

Aplicação React + Vite executável no navegador e como desktop via Electron.

## Desenvolvimento web

```bash
npm run dev
```

## Desenvolvimento desktop

```bash
npm run desktop:dev
```

## Gerar instalador Windows

```bash
npm run desktop:dist
```

O instalador será salvo em `release`. Para apenas gerar a pasta sem instalador, use `npm run desktop:package`.

O Electron carrega o servidor Vite no desenvolvimento e `dist/index.html` no aplicativo empacotado. A interface usa rotas com hash para manter dashboard e estoque funcionando com o carregamento local. O preload mantém isolamento de contexto e Node.js desabilitado no renderer, expondo somente ações específicas de backup e leitura da versão do aplicativo.
O instalador inclui a API local e SQLite; o cliente não precisa instalar Node.js, PostgreSQL ou Docker. O Electron inicia a API automaticamente em 127.0.0.1, usa um protocolo local seguro para a interface e mantém contextIsolation ativo e nodeIntegration desativado.

## Primeiro uso e dados

Na primeira abertura, crie o administrador pela tela inicial. Produtos, lotes, vendas, perfis e demais dados ficam em %APPDATA%/Stockflow/stockflow.db. Fechar ou atualizar o aplicativo não remove esse arquivo. Migrations SQLite pendentes são aplicadas ao iniciar.

Em Configurações → Backup local, exporte uma cópia .db para uma pasta escolhida ou restaure um backup válido. A restauração pede confirmação e mantém uma cópia dos dados atuais antes de substituir o banco.

## Desenvolvimento e migrations

Para desktop, execute npm run desktop:dev na pasta frontend. O script compila o backend e prepara uma cópia empacotável antes de iniciar Vite e Electron. Para atualizar o esquema local, gere e revise uma migration SQLite pelo projeto invenza-backend com npm run db:generate; mantenha o SQL em src/db/migrations-sqlite versionado.

As migrations históricas do PostgreSQL foram preservadas, mas dados do PostgreSQL não são convertidos automaticamente. Preserve um backup do banco anterior e planeje uma importação separada se precisar levar dados existentes ao SQLite. Esta versão usa um banco local por computador e não sincroniza máquinas diferentes.

O instalador NSIS é gerado por npm run desktop:dist e fica em release. Para validar a distribuição, instale em um Windows sem Node.js e confirme primeiro acesso, persistência após reabrir, backup/restauração e funcionamento com a internet desligada.
