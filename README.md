# MediScan

MediScan es una PWA mobile-first hecha con Next.js 14, TypeScript, Tailwind CSS y OpenRouter. Permite fotografiar o subir una imagen de un estudio médico y recibir una explicación educativa en español antes de la consulta.

## Requisitos

- Node.js 18.17 o superior
- Una API key de OpenRouter

## Instalación

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

En Windows PowerShell, si no usás `cp`:

```powershell
Copy-Item .env.local.example .env.local
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Configurar OpenRouter

1. Entrá en [OpenRouter Keys](https://openrouter.ai/settings/keys).
2. Creá una nueva API key.
3. Abrí `.env.local`.
4. Reemplazá el valor:

```env
OPENROUTER_API_KEY=sk-or-tu_api_key
```

El endpoint usado por la app es `POST /api/analyze` y llama a `https://openrouter.ai/api/v1/chat/completions` con el modelo `anthropic/claude-sonnet-4` (Claude Sonnet 4).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## PWA

La app incluye `manifest.json`, iconos en `public/icons` y service worker generado por `next-pwa`. La UI queda disponible offline después de la primera carga; el análisis con IA requiere conexión.

## Aviso médico

MediScan ofrece información orientativa y educativa. No reemplaza el diagnóstico, tratamiento ni seguimiento de un profesional médico.
