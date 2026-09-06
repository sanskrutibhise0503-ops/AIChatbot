# pyrefly: ignore [missing-import]
from google import genai

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GEM_API_KEY"))
# Create the client

# Create a chat session
chat = client.chats.create(
    model="gemini-3.6-flash"
)

print("Gemini Chatbot (type 'exit' to quit)\n")

while True:
    user_input = input("You: ")

    if user_input.lower() == "exit":
        print("Goodbye!")
        break

    response = chat.send_message(user_input)

    print("Gemini:", response.text)

    # Chatbot test commit