# MediScan

## Descripción del proyecto

MediScan es una PWA mobile-first para ayudar a pacientes a entender recetas médicas, medicamentos y estudios clínicos antes de consultar con un profesional. La aplicación permite fotografiar o subir una imagen, analizar el contenido con OCR y modelos multimodales, y devolver una explicación educativa en lenguaje claro, con soporte de idioma y controles de accesibilidad desde la pantalla principal.

El proyecto está construido con Next.js, TypeScript, Tailwind CSS, Auth.js, Prisma y OpenRouter. Incluye rutas para analizar imágenes médicas, interpretar envases o prospectos de medicamentos, consultar farmacias cercanas y preparar una experiencia de usuario orientada a móvil. Su diseño no intenta reemplazar al médico: la app organiza información visible en el documento o imagen, explica términos complejos y mantiene el aviso de seguridad como parte del flujo.

MediScan está pensado para personas que reciben documentación médica difícil de entender, adultos mayores, cuidadores o usuarios que necesitan una primera lectura en su idioma. La arquitectura separa UI, traducciones, accesibilidad, análisis de IA y configuración de autenticación para poder iterar sobre nuevos tipos de documentos, planes, pagos o integraciones sin mezclar la lógica médica con la presentación.

## Funcionalidades principales

- Subida o captura de imágenes de recetas, estudios y documentos médicos.
- Análisis educativo mediante OpenRouter y modelo multimodal.
- Soporte para medicamentos, cajas y prospectos sin inventar dosis no visibles.
- Controles de idioma y accesibilidad en la experiencia principal.
- PWA con manifest, iconos y service worker.
- Autenticación preparada con Auth.js y Prisma.
- Endpoints para análisis, imágenes de medicamentos y farmacias.
- Traducciones centralizadas en `lib/translations.json`.
- Aviso médico de seguridad integrado en la experiencia.

## Requisitos

- Node.js 18.17 o superior.
- Una API key de OpenRouter.

## Instalación

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

En Windows PowerShell, si no usas `cp`:

```powershell
Copy-Item .env.local.example .env.local
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Configurar OpenRouter

1. Entra en [OpenRouter Keys](https://openrouter.ai/settings/keys).
2. Crea una nueva API key.
3. Abre `.env.local`.
4. Reemplaza el valor:

```env
OPENROUTER_API_KEY=sk-or-tu_api_key
```

El endpoint principal usado por la app es `POST /api/analyze`, que llama a `https://openrouter.ai/api/v1/chat/completions` con el modelo fijo `google/gemini-2.5-pro`. La app ignora overrides por entorno para evitar usar modelos más caros por accidente.

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
