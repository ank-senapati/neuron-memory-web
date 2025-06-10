from ollama import Client
import markdown
import re

def markdown_to_text(markdown_string):
    """Converts a markdown string to plaintext."""
    html = markdown.markdown(markdown_string)
    text = re.sub(r'<[^>]+>', '', html)
    return text

def summarize_text(transcript):
    """
    Summarize the given transcript into organized bulleted meeting notes in markdown, then return as plain text.
    """
    client = Client()
    prompt = f"""Make the following transcript into organized BULLETED meeting notes in markdown syntax. Make sure to add bullets. Add headers when necessary.\nTranscript:\n{transcript}"""
    response = client.generate(model='llama3.2:1b', prompt=prompt)
    markdown_text = response['response']
    final_text = markdown_to_text(markdown_text)
    return final_text

