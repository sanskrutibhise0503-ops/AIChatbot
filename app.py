# pyrefly: ignore [missing-import]
from flask import Flask, render_template, request, jsonify
# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from PIL import Image
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

template_dir = os.path.join(BASE_DIR, "templates")
if not os.path.exists(template_dir):
    template_dir = os.path.join(os.getcwd(), "templates")

static_dir = os.path.join(BASE_DIR, "static")
if not os.path.exists(static_dir):
    static_dir = os.path.join(os.getcwd(), "static")

app = Flask(
    __name__,
    template_folder=template_dir,
    static_folder=static_dir,
    static_url_path="/static"
)

# Use standard Gemini model name (gemini-3.5-flash or gemini-2.0-flash)
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEM_API_KEY") or os.getenv("GEMINI_API_KEY")
        if api_key:
            api_key = api_key.strip().strip('"').strip("'")
        if not api_key:
            raise ValueError(
                "Gemini API key is not configured. Please add GEM_API_KEY (or GEMINI_API_KEY) in your Vercel Project Settings -> Environment Variables, then REDEPLOY the project."
            )
        _client = genai.Client(api_key=api_key)
    return _client

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/c/<chat_id>")
def chat_page(chat_id):
    return render_template("index.html")

@app.route("/check-env")
def check_env():
    gem_key = os.getenv("GEM_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    active_key = gem_key or gemini_key
    return jsonify({
        "status": "configured" if bool(active_key) else "missing",
        "GEM_API_KEY_found": bool(gem_key),
        "GEMINI_API_KEY_found": bool(gemini_key),
        "key_length": len(active_key) if active_key else 0
    })

@app.route("/chat", methods=["POST"])
def chat_api():
    message = request.form.get("message")
    image = request.files.get("image")

    try:
        client = get_client()

        if image:
            img = Image.open(image)
            response = client.models.generate_content(
                model=DEFAULT_MODEL,
                contents=[
                    message or "Describe this image",
                    img
                ]
            )
        else:
            response = client.models.generate_content(
                model=DEFAULT_MODEL,
                contents=message
            )

        return jsonify({
            "reply": response.text
        })

    except Exception as e:
        return jsonify({
            "reply": str(e)
        })

if __name__ == "__main__":
    app.run(debug=True)