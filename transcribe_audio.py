import whisper
from jiwer import wer, cer, compute_measures, Compose, RemovePunctuation, ToLowerCase, Strip, RemoveMultipleSpaces
import string
import time 
import os

def transcribe_audio(filepath):
    """
    Transcribe the given audio file using Whisper and return the transcription text and duration.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Audio file not found: {filepath}")
        
    try:
        start = time.time()
        print(f"Loading Whisper model...")
        model = whisper.load_model("base")  # Using base model for better accuracy
        print(f"Transcribing audio file: {filepath}")
        transcribed_result = model.transcribe(filepath)
        transcribed_text = transcribed_result["text"].strip()
        end = time.time()
        transcription_duration = end - start
        print("Transcription completed successfully")
        print("Transcription Duration:", transcription_duration, "seconds")
        return transcribed_text, transcription_duration
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        raise

# # Actual ground truth text
# ground_truth_text = "I need your arms around me I need to feel your touch Hey Baby Im tired of waiting Go re-charge your batteries Come back to me and make your mama proud I need your arms around me I need to feel your touch And I really want to talk"

# # Compute detailed measures
# measures = compute_measures(
#     ground_truth_text,
#     transcribed_text,
    
# )

# # Display results
# print("Ground Truth:\n", ground_truth_text)
# print("\n--- Evaluation Metrics ---")
# print(f"WER (Word Error Rate): {measures['wer']:.2%}")
# print(f"Insertions: {measures['insertions']}")
# print(f"Deletions: {measures['deletions']}")
# print(f"Substitutions: {measures['substitutions']}")
