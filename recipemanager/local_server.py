"""Serve Will's Grill locally and save validated Recipe Manager drafts safely."""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import os
import re
import secrets
import tempfile
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SAVE_PATH = "/api/recipemanager/save"
SESSION_PATH = "/api/recipemanager/session"
RECIPES_PATH = REPOSITORY_ROOT / "data/recipes/recipes.json"
INGREDIENTS_PATH = REPOSITORY_ROOT / "data/ingredients/ingredients.json"
MAX_REQUEST_BYTES = 30 * 1024 * 1024
MAX_IMAGE_BYTES = 10 * 1024 * 1024
IMAGE_NAME = re.compile(r"(?:thumbs/)?rec\d{3}\.webp", re.IGNORECASE)
RECIPE_IMAGE_NAME = re.compile(r"rec\d{3}\.webp", re.IGNORECASE)
RECIPE_ID = re.compile(r"REC\d{3}")
INGREDIENT_ID = re.compile(r"ING-[A-Z]\d{3}")
RECIPE_CATEGORIES = {"Beef", "Chicken", "Fish", "Pork", "Turkey", "Vegetarian", "Venison"}
RECIPE_DIFFICULTIES = {"Easy", "Medium", "Hard"}
METHOD_STEP_COUNT = 8
SESSION_TOKEN = secrets.token_urlsafe(32)


def repository_revision() -> str:
    digest = hashlib.sha256()
    for path in (RECIPES_PATH, INGREDIENTS_PATH):
        digest.update(path.read_bytes())
    return digest.hexdigest()


def is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_data(recipes, ingredients) -> None:
    ingredient_ids = set()
    for ingredient in ingredients:
        if not isinstance(ingredient, dict):
            raise ValueError("Every ingredient must be an object.")
        ingredient_id = ingredient.get("id")
        if not isinstance(ingredient_id, str) or not INGREDIENT_ID.fullmatch(ingredient_id):
            raise ValueError(f"Ingredient {ingredient_id or 'without an ID'} has an invalid ID.")
        if ingredient_id in ingredient_ids:
            raise ValueError(f"Duplicate ingredient ID: {ingredient_id}.")
        if not all(isinstance(ingredient.get(field), str) and ingredient[field].strip() for field in ("name", "category")):
            raise ValueError(f"Ingredient {ingredient_id} is missing a name or category.")
        if not isinstance(ingredient.get("unit", ""), str) or not isinstance(ingredient.get("pantry"), bool):
            raise ValueError(f"Ingredient {ingredient_id} has an invalid unit or pantry value.")
        if "treat" in ingredient and not isinstance(ingredient["treat"], bool):
            raise ValueError(f"Ingredient {ingredient_id} has an invalid treat value.")
        ingredient_ids.add(ingredient_id)

    recipe_ids = set()
    for recipe in recipes:
        if not isinstance(recipe, dict):
            raise ValueError("Every recipe must be an object.")
        recipe_id = recipe.get("id")
        if not isinstance(recipe_id, str) or not RECIPE_ID.fullmatch(recipe_id) or recipe_id in recipe_ids:
            raise ValueError(f"Recipe IDs must use REC000 and be unique: {recipe_id or 'missing ID'}.")
        for field in ("name", "description", "tip"):
            if not isinstance(recipe.get(field), str) or not recipe[field].strip():
                raise ValueError(f"Recipe {recipe_id} is missing {field}.")
        if recipe.get("category") not in RECIPE_CATEGORIES or recipe.get("difficulty") not in RECIPE_DIFFICULTIES:
            raise ValueError(f"Recipe {recipe_id} has an invalid category or difficulty.")
        if "freezeable" in recipe and not isinstance(recipe["freezeable"], bool):
            raise ValueError(f"Recipe {recipe_id} has an invalid freezeable value.")
        image = recipe.get("image")
        if image is not None and (not isinstance(image, str) or not RECIPE_IMAGE_NAME.fullmatch(image)):
            raise ValueError(f"Recipe {recipe_id} has an invalid image filename.")
        if not isinstance(recipe.get("steps"), list) or len(recipe["steps"]) != METHOD_STEP_COUNT or any(not isinstance(step, str) or not step.strip() for step in recipe["steps"]):
            raise ValueError(f"Recipe {recipe_id} needs exactly {METHOD_STEP_COUNT} completed method steps.")
        rows = recipe.get("ingredients")
        if not isinstance(rows, list) or not rows:
            raise ValueError(f"Recipe {recipe_id} needs at least one ingredient.")
        if any(not isinstance(row, dict) or row.get("ingredient") not in ingredient_ids or not is_number(row.get("quantity")) or row["quantity"] <= 0 for row in rows):
            raise ValueError(f"Recipe {recipe_id} has an invalid ingredient reference or quantity.")
        nutrition = recipe.get("nutrition")
        if not isinstance(nutrition, dict):
            raise ValueError(f"Recipe {recipe_id} needs nutrition values.")
        numeric_values = [recipe.get("prepTime"), recipe.get("cookTime"), recipe.get("serves"), *(nutrition.get(key) for key in ("calories", "protein", "carbs", "fat"))]
        if any(not is_number(value) or value < 0 for value in numeric_values) or recipe["serves"] <= 0:
            raise ValueError(f"Recipe {recipe_id} has invalid timing, serving, or nutrition values.")
        recipe_ids.add(recipe_id)


class RecipeManagerHandler(SimpleHTTPRequestHandler):
    """Static-file handler with loopback-only authenticated save endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPOSITORY_ROOT), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] == SESSION_PATH:
            self.send_json(HTTPStatus.OK, {"token": SESSION_TOKEN, "revision": repository_revision()})
            return
        super().do_GET()

    def do_POST(self):
        if self.path != SAVE_PATH:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            self.validate_request()
            payload = self.read_payload()
            expected_revision = payload.get("expectedRevision")
            current_revision = repository_revision()
            if not isinstance(expected_revision, str) or not hmac.compare_digest(expected_revision, current_revision):
                self.send_json(HTTPStatus.CONFLICT, {"error": "Repository data changed after this page loaded. Reload Recipe Manager and merge your changes before saving.", "revision": current_revision})
                return
            validate_data(payload["recipes"], payload["ingredients"])
            files = self.create_files(payload)
            self.write_files(files)
        except PermissionError as error:
            self.send_json(HTTPStatus.FORBIDDEN, {"error": str(error)})
            return
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        except OSError:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "The repository files could not be saved."})
            return
        self.send_json(HTTPStatus.OK, {"message": "Repository files saved.", "revision": repository_revision()})

    def validate_request(self):
        if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
            raise ValueError("Save requests must use application/json.")
        supplied_token = self.headers.get("X-Recipe-Manager-Token", "")
        if not hmac.compare_digest(supplied_token, SESSION_TOKEN):
            raise PermissionError("The Recipe Manager session token is missing or invalid. Reload the page.")
        source = self.headers.get("Origin") or self.headers.get("Referer")
        if source:
            parsed = urlparse(source)
            if parsed.hostname not in {"127.0.0.1", "localhost"}:
                raise PermissionError("Save requests are accepted only from the local Recipe Manager.")

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
            RECIPES_PATH: json.dumps(payload["recipes"], indent=2, ensure_ascii=False).encode() + b"\n",
            INGREDIENTS_PATH: json.dumps(payload["ingredients"], indent=2, ensure_ascii=False).encode() + b"\n",
        }
        seen_images = set()
        for image in payload.get("images", []):
            if not isinstance(image, dict) or not IMAGE_NAME.fullmatch(str(image.get("filename", ""))):
                raise ValueError("Changed image filenames must use the rec###.webp convention.")
            if image["filename"].lower() in seen_images:
                raise ValueError("Changed image filenames must be unique.")
            try:
                image_data = base64.b64decode(image.get("content", ""), validate=True)
            except (TypeError, ValueError, binascii.Error) as error:
                raise ValueError("A changed recipe image is invalid.") from error
            is_webp = image_data.startswith(b"RIFF") and image_data[8:12] == b"WEBP"
            if not is_webp or len(image_data) > MAX_IMAGE_BYTES:
                raise ValueError("Changed images must be WebP files no larger than 10 MB.")
            seen_images.add(image["filename"].lower())
            files[REPOSITORY_ROOT / "assets/images/recipes" / Path(image["filename"])] = image_data
        for recipe in payload["recipes"]:
            image_path = REPOSITORY_ROOT / "assets/images/recipes" / recipe["image"]
            if image_path not in files and not image_path.is_file():
                raise ValueError(f"Recipe {recipe['id']} references a missing image.")
        return files

    def write_files(self, files):
        temporary_files = []
        backups = {}
        replaced = []
        try:
            for destination, content in files.items():
                backups[destination] = destination.read_bytes() if destination.exists() else None
                descriptor, temporary_path = tempfile.mkstemp(dir=destination.parent, prefix=f".{destination.name}.")
                with os.fdopen(descriptor, "wb") as temporary_file:
                    temporary_file.write(content)
                    temporary_file.flush()
                    os.fsync(temporary_file.fileno())
                temporary_files.append((Path(temporary_path), destination))
            for temporary_path, destination in temporary_files:
                os.replace(temporary_path, destination)
                replaced.append(destination)
        except OSError:
            for destination in reversed(replaced):
                previous = backups[destination]
                if previous is None:
                    destination.unlink(missing_ok=True)
                else:
                    destination.write_bytes(previous)
            raise
        finally:
            for temporary_path, _ in temporary_files:
                temporary_path.unlink(missing_ok=True)

    def send_json(self, status, payload):
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main():
    port = int(os.environ.get("RECIPE_MANAGER_PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), RecipeManagerHandler)
    print(f"Recipe Manager is available at http://127.0.0.1:{port}/recipemanager/index.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nRecipe Manager server stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
