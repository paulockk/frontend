# Projeto Estoque Desktop

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

O Electron carrega o servidor Vite no desenvolvimento e `dist/index.html` no aplicativo empacotado. A interface usa rotas com hash para manter dashboard e estoque funcionando com o carregamento local. O preload expõe somente a leitura da versão do aplicativo, com isolamento de contexto e Node.js desabilitado no renderer.
