from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import json
from db import load_db, save_db, add_note
from vector_embedding import generate_embedding, compute_similarity
from transcribe_audio import transcribe_audio
from llama_summarizer import summarize_text

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'm4a'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/note')
def note_details():
    return render_template('note_details.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    db = load_db()
    return jsonify(db)

@app.route('/api/notes', methods=['POST'])
def create_note():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    add_note(data['text'])
    return jsonify({'message': 'Note added successfully'})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Transcribe audio
            print(f"Starting transcription of {filename}...")
            transcription, duration = transcribe_audio(filepath)
            print(f"Transcription completed in {duration:.2f} seconds")
            
            # Summarize transcription
            print("Generating summary...")
            summary = summarize_text(transcription)
            print("Summary generated successfully")
            
            # Add to database
            add_note(summary)
            
            return jsonify({
                'message': 'File processed successfully',
                'transcription': transcription,
                'summary': summary,
                'duration': duration
            })
        except Exception as e:
            print(f"Error processing file: {str(e)}")
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
        finally:
            # Clean up the uploaded file
            if os.path.exists(filepath):
                os.remove(filepath)
    
    return jsonify({'error': 'Invalid file type. Allowed types: mp3, wav, m4a'}), 400

@app.route('/api/similar', methods=['GET'])
def get_similar_notes():
    note_id = request.args.get('id')
    if not note_id:
        return jsonify({'error': 'No note ID provided'}), 400
    
    db = load_db()
    note = next((n for n in db if n['id'] == note_id), None)
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Find similar notes based on embedding similarity
    similar_notes = []
    for other_note in db:
        if other_note['id'] != note_id:
            similarity = compute_similarity(note['embedding'], other_note['embedding'])
            if similarity >= 0.8:
                similar_notes.append({
                    'id': other_note['id'],
                    'text': other_note['text'],
                    'similarity': similarity
                })
    
    return jsonify(similar_notes)

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    try:
        db = load_db()
        # Find and remove the note
        note_index = next((i for i, note in enumerate(db) if note['id'] == note_id), None)
        if note_index is not None:
            db.pop(note_index)
            save_db(db)
            return jsonify({'message': 'Note deleted successfully'})
        return jsonify({'error': 'Note not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/<note_id>', methods=['GET'])
def get_note_details(note_id):
    try:
        # Get the note details
        db = load_db()
        note = next((n for n in db if n['id'] == note_id), None)
        if not note:
            return jsonify({'error': 'Note not found'}), 404

        # Get related notes
        similar_notes = []
        if 'embedding' in note and note['embedding']:  # Check if note has embedding
            for other_note in db:
                if other_note['id'] != note_id and 'embedding' in other_note and other_note['embedding']:
                    try:
                        similarity = compute_similarity(note['embedding'], other_note['embedding'])
                        if similarity >= 0.8:
                            similar_notes.append(other_note)
                    except Exception as e:
                        print(f"Error computing similarity: {str(e)}")
                        continue
        
        # Format the response
        response = {
            'id': note['id'],
            'name': note['text'].split('\n')[0].strip() or 'Untitled Note',
            'content': '\n'.join(note['text'].split('\n')[1:]).strip() or note['text'],
            'summary': note.get('summary', ''),
            'related_notes': [{
                'id': related['id'],
                'name': related['text'].split('\n')[0].strip() or 'Untitled Note',
                'content': '\n'.join(related['text'].split('\n')[1:]).strip() or related['text']
            } for related in similar_notes]
        }
        
        return jsonify(response)
    except Exception as e:
        print(f"Error in get_note_details: {str(e)}")  # Add server-side logging
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 