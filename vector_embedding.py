import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Initialize the TF-IDF vectorizer
vectorizer = TfidfVectorizer(max_features=1000)

def generate_embedding(text):
    """
    Generate a TF-IDF embedding for the given text.
    """
    # Fit and transform the text
    embedding = vectorizer.fit_transform([text]).toarray()[0]
    
    # Normalize the embedding
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    
    print(f"Generated embedding with shape: {embedding.shape}")
    print(f"First 5 values of normalized embedding: {embedding[:5]}")
    
    return embedding.tolist()

def compute_similarity(embedding1, embedding2):
    """
    Compute cosine similarity between two embeddings.
    """
    return cosine_similarity([embedding1], [embedding2])[0][0]
