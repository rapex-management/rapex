

## Development

Run the stack with Docker Compose from `infra/`.

### Live reload (event-based, no polling)

- A watcher container observes `services/web/src` and `services/backend` using native FS events (no polling) and posts a signal to the `realtime` service.
- The Next.js app connects to `http://localhost:4000/reload` via Socket.IO and forces a full page reload when a change event arrives.

Control:
- To disable in the browser, unset `NEXT_PUBLIC_RELOAD_WS_URL`.
- To stop global reloads, stop the `dev-watcher` service.

