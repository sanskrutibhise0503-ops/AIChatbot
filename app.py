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

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
    static_url_path="/static"
)

api_key = os.getenv("GEM_API_KEY") or os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

chat = client.chats.create(
    model="gemini-3.5-flash-lite"
)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/c/<chat_id>")
def chat_page(chat_id):
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat_api():

    message = request.form.get("message")
    image = request.files.get("image")

    try:

        if image:

            img = Image.open(image)

            response = client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents=[
                    message,
                    img
                ]
            )

        else:

            response = chat.send_message(message)

        return jsonify({
            "reply": response.text
        })

    except Exception as e:

        return jsonify({
            "reply": str(e)
        })

if __name__ == "__main__":
    app.run(debug=True)