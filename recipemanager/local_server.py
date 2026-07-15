"""Serve Will's Grill locally and save Recipe Manager drafts into this repository."""

from __future__ import annotations

import base64
import binascii
import json
import os
import re
import tempfile
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SAVE_PATH = "/api/recipemanager/save"
MAX_REQUEST_BYTES = 30 * 1024 * 1024
IMAGE_NAME = re.compile(r"rec\d{3}\.jpg", re.IGNORECASE)


class RecipeManagerHandler(SimpleHTTPRequestHandler):
    """Static-file handler with one loopback-only repository save endpoint."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPOSITORY_ROOT), **kwargs)

    def do_POST(self):
        if self.path != SAVE_PATH:
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        try:
            payload = self.read_payload()
            files = self.create_files(payload)
            self.write_files(files)
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        except OSError:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "The repository files could not be saved."})
            return

        self.send_json(HTTPStatus.OK, {"message": "Repository files saved."})

    def read_payload(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("Invalid request length.") from error

        if not 0 < content_length <= MAX_REQUEST_BYTES:
            raise ValueError("Invalid request length.")

        payload = json.loads(self.rfile.read(content_length))
        if not isinstance(payload, dict):
            raise ValueError("Save data must be an object.")
        if not isinstance(payload.get("recipes"), list) or not isinstance(payload.get("ingredients"), list):
            raise ValueError("Recipes and ingredients must be arrays.")
        if not isinstance(payload.get("images", []), list):
            raise ValueError("Images must be an array.")
        return payload

    def create_files(self, payload):
        files = {
            REPOSITORY_ROOT / "data/recipes/recipes.json": json.dumps(payload["recipes"], indent=2, ensure_ascii=False).encode() + b"\n",
            REPOSITORY_ROOT / "data/ingredients/ingredients.json": json.dumps(payload["ingredients"], indent=2, ensure_ascii=False).encode() + b"\n",
        }

        for image in payload.get("images", []):
            if not isinstance(image, dict) or not IMAGE_NAME.fullmatch(str(image.get("filename", ""))):
                raise ValueError("Changed image filenames must use the rec###.jpg convention.")
            try:
                image_data = base64.b64decode(image.get("content", ""), validate=True)
            except (TypeError, ValueError, binascii.Error) as error:
                raise ValueError("A changed recipe image is invalid.") from error
            if not image_data:
                raise ValueError("A changed recipe image is empty.")
            files[REPOSITORY_ROOT / "assets/images/recipes" / image["filename"]] = image_data

        return files

    def write_files(self, files):
        temporary_files = []
        try:
            for destination, content in files.items():
                descriptor, temporary_path = tempfile.mkstemp(dir=destination.parent, prefix=f".{destination.name}.")
                with os.fdopen(descriptor, "wb") as temporary_file:
                    temporary_file.write(content)
                temporary_files.append((Path(temporary_path), destination))

            for temporary_path, destination in temporary_files:
                os.replace(temporary_path, destination)
        finally:
            for temporary_path, _ in temporary_files:
                temporary_path.unlink(missing_ok=True)

    def send_json(self, status, payload):
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 8000), RecipeManagerHandler)
    print("Recipe Manager is available at http://127.0.0.1:8000/recipemanager/index.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nRecipe Manager server stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
