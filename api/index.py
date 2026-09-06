import os
import sys

# Ensure the root project directory is in sys.path so app can be imported
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from app import app
except Exception as e:
    import traceback
    # pyrefly: ignore [missing-import]
    from flask import Flask, Response

    app = Flask(__name__)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def error_handler(path):
        tb = traceback.format_exc()
        return Response(
            f"<h2>Server Initialization Error</h2>"
            f"<p>An error occurred while initializing the Flask application:</p>"
            f"<pre style='background:#f4f4f4;padding:12px;border:1px solid #ccc;overflow:auto;'>{tb}</pre>"
            f"<p>Make sure you have added <b>GEM_API_KEY</b> in Vercel Settings &gt; Environment Variables.</p>",
            mimetype="text/html",
            status=500
        )
