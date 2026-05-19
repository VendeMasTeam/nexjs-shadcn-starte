This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🐳 Deploy con Docker

### Build

```bash
docker build -t crm-frontend .
```

Next.js lee `NEXT_PUBLIC_SERVER_URL` de tu archivo `.env` durante el build. Asegurate de tenerlo creado:

```bash
# .env (gitignored, cada deploy crea el suyo)
NEXT_PUBLIC_SERVER_URL=https://tu-api.com/api
```

### Run

```bash
docker run -d --name crm-frontend -p 3000:3000 crm-frontend
```

Abrí `http://localhost:3000`.

> **Opciones de restart** (si querés que se reinicie solo):
> ```bash
> # Reinicio infinito (recomendado para producción)
> docker run -d --name crm-frontend -p 3000:3000 --restart unless-stopped crm-frontend
>
> # Reintenta 5 veces y se rinde
> docker run -d --name crm-frontend -p 3000:3000 --restart on-failure:5 crm-frontend
> ```
>
> **HEALTHCHECK** (opcional — necesita `wget` en Alpine):
> ```dockerfile
> RUN apk add --no-cache wget
> HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
>   CMD wget -qO- http://localhost:3000/ || exit 1
> ```
> Pega a `localhost:3000` dentro del contenedor (~1 request cada 30s, consumo mínimo).

Abrí `http://localhost:3000`. En producción, en vez de exponer el puerto directo, lo ponés detrás de un reverse proxy (nginx, Caddy) que escuche en 80/443.

### Archivos de entorno

| Archivo | ¿Commiteado? | ¿Usado en? |
|---------|:-----------:|-----------|
| `.env` | ❌ | Desarrollo y build de Docker |
| `.env.example` | ✅ | Template para nuevos devs |
| `.env.*` | ❌ | Bloqueados por `.dockerignore` (no entran al build) |

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
