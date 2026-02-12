


def model(prompt):
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile", # Best for Mark 1 logic
            temperature=0, # Strictness ke liye 0 zaroori hai
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Error: {e}"
    



# message = voice()
# data = message.voice_input()

# prompt = f"""
# You are a Python assistant for a voice-controlled IDE. 
# The user will give a natural language command.
# Based on the command, identify **which APP_CONTROLING function should be called**.
# Ignore any parameters for now, just return **the function name keyword**.

# Available functions:
# 1. open_hide_terminal(message)
#    - Keywords that need to return from you: "open terminal", "close terminal"
# 2. open_hide_explorer(message)
#    - Keywords that need to return from you: "open explorer", "close explorer"
# 3. open_hide_chatwindow(message)
#    - Keywords that need to return from you: "open chat", "close chat"
# 4. create_project([name, path, description])
#    - Keywords that need to return from you: "create project", "new project", "add project"
# 5. open_project(message_path)
#    - Keywords that need to return from you: "open project", "load project"
# 6. run_file(message)
#    - Keywords that need to return from you: "run file", "execute code"

# Instructions:
# - Read the user message.
# - Identify **the single best matching function** based on the keywords.
# - Ignore all parameters for now.
# - Only return the **function name keyword** as plain text.

# Examples:

# User: "Please open terminal for me"
# Output: open_terminal

# User: "I want to run my current code file"
# Output: run_file

# User: "Add a new project named MyApp at C:/Projects"
# Output: create_project

# User: "Load project MyApp"
# Output: open_project

# Now give answer to this:
# user: {data}
# """

# response = model(prompt)
# text = message.text_in_voice(response)
# print(response)