import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from recipemanager.local_server import RecipeManagerHandler, SESSION_TOKEN


class LocalServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), RecipeManagerHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def test_static_site_and_session_endpoint(self):
        with urllib.request.urlopen(f"{self.base_url}/index.html") as response:
            self.assertEqual(200, response.status)
        with urllib.request.urlopen(f"{self.base_url}/api/recipemanager/session") as response:
            payload = json.load(response)
            self.assertEqual(SESSION_TOKEN, payload["token"])
            self.assertEqual(64, len(payload["revision"]))
            self.assertEqual("no-store", response.headers["Cache-Control"])

    def test_save_rejects_missing_session_token(self):
        request = urllib.request.Request(
            f"{self.base_url}/api/recipemanager/save",
            data=b"{}",
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request)
        self.assertEqual(403, caught.exception.code)

    def test_save_rejects_stale_revision_before_writing(self):
        request = urllib.request.Request(
            f"{self.base_url}/api/recipemanager/save",
            data=json.dumps({"recipes": [], "ingredients": [], "images": [], "expectedRevision": "stale"}).encode(),
            method="POST",
            headers={"Content-Type": "application/json", "X-Recipe-Manager-Token": SESSION_TOKEN},
        )
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request)
        self.assertEqual(409, caught.exception.code)

    def test_save_rejects_invalid_schema(self):
        with urllib.request.urlopen(f"{self.base_url}/api/recipemanager/session") as response:
            revision = json.load(response)["revision"]
        request = urllib.request.Request(
            f"{self.base_url}/api/recipemanager/save",
            data=json.dumps({"recipes": [{}], "ingredients": [], "images": [], "expectedRevision": revision}).encode(),
            method="POST",
            headers={"Content-Type": "application/json", "X-Recipe-Manager-Token": SESSION_TOKEN},
        )
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request)
        self.assertEqual(400, caught.exception.code)


if __name__ == "__main__":
    unittest.main()
