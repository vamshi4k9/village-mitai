# Deployment

Both apps deploy to one VPS through GitHub Actions. Each workflow opens an SSH session to the server and runs a script there; nothing is built on the GitHub runner.

| Workflow | Runs when | Does |
| --- | --- | --- |
| [deploy-backend.yml](../.github/workflows/deploy-backend.yml) | Push to `main` touching `Backend/**` | Updates and restarts the API |
| [deploy-frontend.yml](../.github/workflows/deploy-frontend.yml) | Push to `main` touching `Frontend/**` | Builds the site and swaps it in |
| [main.yml](../.github/workflows/main.yml) | Run manually | Checks that SSH from GitHub works |

A change to a workflow file also triggers that workflow.

## GitHub secrets

| Secret | Used for |
| --- | --- |
| `SERVER_IP` | Server address |
| `SERVER_USER` | SSH user |
| `SSH_PRIVATE_KEY` | SSH key for that user |
| `REACT_APP_MAPBOX_TOKEN` | Written into `Frontend/.env` before the build |

## Server layout

| Path | Contents |
| --- | --- |
| `/opt/villagemitai/` | Git checkout of this repository |
| `/opt/villagemitai/Backend/venv/` | Python virtualenv |
| `/opt/villagemitai/Backend/restaurant/.env` | Backend environment file, created by hand on the server |
| `/var/www/village-mitai/static/` | Collected Django static files |
| `/var/www/village-mitai/build_<timestamp>/` | Frontend builds; the last three are kept |
| `/var/www/village-mitai/live_build` | Symlink to the build NGINX serves |

Services: `gunicorn-villagemitai` (systemd) runs the API, and NGINX serves the frontend and proxies the API.

## Backend deploy steps

1. `git pull origin main` in `/opt/villagemitai/Backend`
2. `pip install -r requirements.txt` (this is `Backend/requirements.txt`)
3. `python manage.py makemigrations`
4. `python manage.py migrate`
5. `python manage.py collectstatic --noinput`
6. `sudo systemctl restart gunicorn-villagemitai`

## Frontend deploy steps

1. `git pull origin main` in `/opt/villagemitai/Frontend`
2. Install Node.js 16.20.2 and pnpm 8.15.9 if they are missing
3. `pnpm install`
4. Write `.env` from the Mapbox secret
5. `CI=false pnpm run build` (so lint warnings do not fail the build)
6. Move the build to a timestamped folder, point the `live_build` symlink at it, and reload NGINX

Because the switch is a symlink change, visitors never see a half-copied site. To roll back, point `live_build` at an older `build_<timestamp>` folder and reload NGINX.

## Known problems

**A green run does not mean the backend deploy worked.** The backend script has no `set -e`, so it carries on after a failed step, restarts Gunicorn and prints "Backend deployed successfully". Always read the log.

Two failures have happened this way:

| Symptom in the log | Cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError: No module named '...'` | The package was added to `Backend/restaurant/requirements.txt` but the deploy installs `Backend/requirements.txt` | Add the package to `Backend/requirements.txt` |
| `EOFError: EOF when reading a line` during `makemigrations`, then "Your models ... have changes that are not yet reflected in a migration" | Migrations are not in git, so the server generates them, and this one needed an interactive answer | Get a hand-written migration onto the server, then run `migrate`. Do not pick the "continue" option on a unique field: every existing row would get the same value |

In both cases the new code was live while the server was missing what it needed, so parts of the site returned errors until it was fixed.

## Checking a deploy on the server

```bash
sudo systemctl status gunicorn-villagemitai
sudo journalctl -u gunicorn-villagemitai -n 100 --no-pager

cd /opt/villagemitai/Backend/restaurant && source ../venv/bin/activate
python manage.py check
python manage.py showmigrations restaurant_app
```

`showmigrations` lists what has been applied; `makemigrations --check --dry-run` reports whether the models have changes with no migration.
