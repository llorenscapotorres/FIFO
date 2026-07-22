# FIFO Tracker

Aplicación web para calcular la ganancia o pérdida (según la regla FIFO — *first in, first out*) que hay que declarar al vender parte de una posición en un activo (ETF, fondo indexado, acción...).

Registras tus compras (fecha, dinero invertido, precio por acción) y, cuando quieres vender, indicas cuánto dinero quieres recuperar y a qué precio está el activo. La aplicación calcula cuántas acciones representa esa venta y reparte el coste entre tus compras más antiguas (FIFO), mostrando el desglose y la ganancia/pérdida resultante.

## Stack

- **Frontend**: Next.js (TypeScript, App Router, Tailwind)
- **Backend**: Python (FastAPI, SQLAlchemy, Alembic)
- **Base de datos**: PostgreSQL

Todo se ejecuta en local con Docker Compose. No hay ningún despliegue en la nube ni en GitHub Pages — GitHub solo aloja el código fuente.

## Puesta en marcha

Requisito: Docker y Docker Compose instalados.

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend (API + docs interactivas): http://localhost:8000/docs

Al arrancar, el backend aplica automáticamente las migraciones de base de datos (Alembic) antes de levantar el servidor.

## Cómo funciona

1. Crea un activo (el nombre lo eliges tú, ej. "MSCI World ETF").
2. Registra tus compras: fecha, dinero invertido, precio por acción y acciones compradas (se calculan automáticamente a partir del dinero y el precio, pero puedes ajustarlas a mano).
3. Cuando quieras vender, indica cuánto dinero quieres recuperar y el precio actual. Pulsa "Previsualizar" para ver cuántas acciones se venderían, de qué compras saldrían (las más antiguas primero) y la ganancia/pérdida resultante, antes de confirmar nada.
4. Al confirmar, la venta queda registrada en el historial y las acciones "restantes" de cada compra se actualizan.

Las compras y ventas se pueden editar o borrar después. Una compra no se puede borrar si ya se ha usado en alguna venta (hay que borrar antes esa venta). Editar el precio de una compra ya usada en una venta no cambia la ganancia/pérdida ya calculada de esa venta, solo afecta a ventas futuras.

## Desarrollo

Ambos servicios (`backend` y `frontend`) montan el código local como volumen y recargan en caliente, así que puedes editar el código sin reconstruir la imagen.

Tests del backend (lógica FIFO):

```bash
docker compose exec backend pytest
```
