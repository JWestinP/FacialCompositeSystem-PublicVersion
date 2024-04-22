from django.shortcuts import render, redirect, get_object_or_404
from .forms import FacialFeatureForm
from .models import *
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import string
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponse
import base64
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import tensorflow as tf
import numpy as np
import cv2
import keras.backend as K
from keras.preprocessing.image import ImageDataGenerator
import os
from django.conf import settings
import uuid
import time
import json
from sklearn.metrics.pairwise import cosine_similarity
from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.decorators import login_required

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = criminals
        fields = '__all__'  
        depth = 1

@login_required(login_url = 'login')
def facialcomposite(request):
    matched_features = ()
    description = ''
    feature_name = ''

    if request.method == 'POST':
        form = FacialFeatureForm(request.POST)
        if form.is_valid():
            description = form.cleaned_data['description']

            if 'face_shape' in request.POST:
                feature_name = 'Face_shape'
                matched_features = matched_search(description, feature_name)

            if 'hair_style' in request.POST:
                feature_name = 'Hair_style'
                matched_features = matched_search(description, feature_name)

            if 'eyebrows_shape' in request.POST:
                feature_name = 'Eyebrows_shape'
                matched_features = matched_search(description, feature_name)

            if 'eyes_shape' in request.POST:
                feature_name = 'Eyes_shape'
                matched_features = matched_search(description, feature_name)

            if 'ears_shape' in request.POST:
                feature_name = 'Ears_shape'
                matched_features = matched_search(description, feature_name)

            if 'nose_shape' in request.POST:
                feature_name = 'Nose_shape'
                matched_features = matched_search(description, feature_name)

            if 'lips_shape' in request.POST:
                feature_name = 'Lips_shape'
                matched_features = matched_search(description, feature_name)

            return JsonResponse({
                'matched_features': matched_features,
                'description': description,
                'feature_name': feature_name,
            })
        
    return render(request, 'facialcomposite/facialcomposite.html', {
        'matched_features': matched_features,
        'description': description,
        'feature_name': feature_name,
    })

def preprocess_text(text):
    text = text.lower()
    tokens = word_tokenize(text)
    tokens = [token for token in tokens if token not in string.punctuation]
    stop_words = set(stopwords.words('english'))
    tokens = [token for token in tokens if token not in stop_words]
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(token) for token in tokens]
    preprocessed_text = ' '.join(tokens)
    return preprocessed_text

def calculate_similarity_scores(description, feature_name):
    category = ''
    preprocessed_input = preprocess_text(description)
    
    if (feature_name == 'Face_shape'):
        category = 'Face'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
    
    elif (feature_name == 'Hair_style'):
        category = 'Hair'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
        
    elif (feature_name == 'Eyebrows_shape'):
        category = 'Eyebrows'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
        
    elif (feature_name == 'Eyes_shape'):
        category = 'Eyes'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
    
    elif (feature_name == 'Ears_shape'):
        category = 'Ears'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
    
    elif (feature_name == 'Nose_shape'):
        category = 'Nose'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
        
    elif (feature_name == 'Lips_shape'):
        category = 'Lips'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
    
    else:
        return JsonResponse({'error': 'No features found'}, status=404)
    
    preprocessed_descriptions = [preprocess_text(feature.feature_description) for feature in features]

    documents = [preprocessed_input] + preprocessed_descriptions

    vectorizer = TfidfVectorizer(stop_words=stopwords.words('english'))
    tfidf_matrix = vectorizer.fit_transform(documents)

    similarity_scores = cosine_similarity(tfidf_matrix[0], tfidf_matrix[1:])
    return similarity_scores[0]

def matched_search(description, feature_name):
    similarity_scores = calculate_similarity_scores(description, feature_name)

    if (feature_name == 'Face_shape'):
        category = 'Face'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
    
    elif (feature_name == 'Hair_style'):
        category = 'Hair'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
        
    elif (feature_name == 'Eyebrows_shape'):
        category = 'Eyebrows'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
        
    elif (feature_name == 'Eyes_shape'):
        category = 'Eyes'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
    
    elif (feature_name == 'Ears_shape'):
        category = 'Ears'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
    
    elif (feature_name == 'Nose_shape'):
        category = 'Nose'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
        
    elif (feature_name == 'Lips_shape'):
        category = 'Lips'
        features = facial_feature.objects.filter(feature_category__feature_category = category)
    
    else:
        return JsonResponse({'error': 'No features found'}, status=404)
        
    sorted_features = [feature for _, feature in sorted(zip(similarity_scores, features), key=lambda x: x[0], reverse=True)]
    matched_features = []
    counter = 0
    for feature in sorted_features:
        matched_features.append({
                'id': feature.feature_id,
                'description': feature.feature_description,
                'image_url': feature.feature_photo.url,
            })
        counter += 1
        if counter >= 15: 
            break
    return matched_features

@login_required(login_url = 'login')
def chosen_features(request):
    chosen_categories = []

    if request.method == 'POST':
        feature_pk = request.POST.get('selected_feature')

        if not feature_pk:
            return JsonResponse('Selected feature ID is missing in the form submission.', status=400)

        try:
            feature_selected = get_object_or_404(facial_feature, feature_id=feature_pk)

            selected_category = feature_selected.feature_category.feature_category

            if selected_category not in chosen_categories:
                chosen_categories.append(selected_category)
            else:
                return JsonResponse({'error': 'Already picked for this category'}, status=400)
                
        except facial_feature.DoesNotExist:
            return JsonResponse('Selected feature does not exist.', status=400)

    return redirect('facialcomposite')

def get_feature_details(request, feature_id):
    feature = get_object_or_404(facial_feature, feature_id=feature_id)

    feature_details = {
        'image_url': feature.feature_photo.url,
    }

    return JsonResponse(feature_details)
    
def save_image(request):
    if request.method == 'POST':
        image_data = request.POST.get('image')

        header, encoded = image_data.split(",", 1)

        try:
            image_data_decoded = base64.b64decode(encoded)

            image_path = default_storage.save('image.png', ContentFile(image_data_decoded))

            return JsonResponse({'image_url': image_path})
        except Exception as e:
            return JsonResponse({'error': 'Error saving image'}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
def composite_match(request):
    
    if request.method == 'POST':
        
        try:
            body_unicode = request.body.decode('utf-8')
            body_data = json.loads(body_unicode)
            image_path = body_data.get('image_path')  
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data in request body'}, status=400)
        
        if image_path:
            similar_images = sketch_feature_extraction(image_path)
            request.session['similar_images'] = similar_images
            request.session['image_path'] = image_path
            return JsonResponse({'success': 'Image path found and data stored in session'})
        else:
            return JsonResponse({'error': 'Missing image path'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required(login_url = 'login')  
def composite_match_result(request):
    similar_images = request.session.get('similar_images')
    image_path = request.session.get('image_path')
    
    if similar_images and image_path:
    
        folder_path = 'criminal/criminal_mugshot/'
        similar_image_filenames = [folder_path + image_data['filename'].split('\\')[-1] for image_data in similar_images]
        
        filtered_instances = []
        for image_name in similar_image_filenames:
            instances = criminals.objects.filter(criminal_mugshot=image_name)
            filtered_instances.extend(instances)        
        
        image_full_path = os.path.join(settings.MEDIA_URL, image_path)
        
        return render(request, 'facialcomposite/facialcomposite_result.html', {'instances': filtered_instances, 'image_full_path': image_full_path})
    else:
        return JsonResponse({'error': 'No similar images or image path found in session'}, status=400)
        
def load_model_with_custom_objects(model_path):
    custom_objects = {'K': K}  
    
    loaded_model = tf.keras.models.load_model(model_path, custom_objects=custom_objects)
    
    return loaded_model

def sketch_feature_extraction(image_path):
    try:
        model_path = os.path.join(settings.STATIC_ROOT, 'facialcomposite/extractor_model', 'extractor_model_v7.h5')
        loaded_model = load_model_with_custom_objects(model_path)
        feature_extraction_model = tf.keras.Model(inputs=loaded_model.input, outputs=loaded_model.layers[-2].output)
        
        image_dir = r'C:\Users\Admin\Desktop\Thesis\System\media'
        image_loc = os.path.join(image_dir, image_path)
        image = cv2.imread(image_loc)
        image = cv2.resize(image, (224, 224))  
        image = image.astype('float') / 255.0  
        image = np.expand_dims(image, axis=0)

        dummy_input = np.zeros_like(image)

        sketch_features = feature_extraction_model.predict([image, dummy_input])
        
        sketch_features_dir = os.path.join(settings.STATIC_ROOT, 'facialcomposite\\feature_extracted\\sketch')
        timestamp = int(time.time())
        random_string = uuid.uuid4().hex[:6]
        features_filename = f'extracted_sketch_feature_{timestamp}_{random_string}.npy'
        features_path = os.path.join(sketch_features_dir, features_filename)
        np.save(features_path, sketch_features)
        

        image_features = np.load(os.path.join(settings.STATIC_ROOT, 'facialcomposite\\feature_extracted\\database_image\\extracted_image_features.npy'))
        filenames = np.load(os.path.join(settings.STATIC_ROOT, 'facialcomposite\\feature_extracted\\database_image\\extracted_image_filenames.npy'))

        
        distances = cosine_similarity(sketch_features.reshape(1, -1), image_features)

        nearest_indices = np.argsort(distances[0])[::-1][:20]

        similar_images = [{'filename': filenames[index]} for index in nearest_indices]


        return similar_images

    except Exception as e:
        return []
    
def database_feature_extraction(request):
    if request.method == 'POST':
        model_path = os.path.join(settings.STATIC_ROOT, 'facialcomposite/extractor_model', 'extractor_model_v7.h5')
        loaded_model = load_model_with_custom_objects(model_path)
        feature_extraction_model = tf.keras.Model(inputs=loaded_model.input, outputs=loaded_model.layers[-2].output)

        val_images_dir = os.path.join(settings.MEDIA_ROOT, 'criminal')
        
        features_with_filenames = []

        val_image_gen = ImageDataGenerator(rescale=1./255)
        val_image_generator = val_image_gen.flow_from_directory(
            val_images_dir,
            target_size=(224, 224),
            batch_size=10,
            class_mode=None,  
            shuffle=False 
        )
        num_batches_val = len(val_image_generator)

        for i in range(num_batches_val):
            val_image_batch = next(val_image_generator)

            dummy_input = np.zeros_like(val_image_batch)

            image_features = feature_extraction_model.predict([val_image_batch, dummy_input])

            batch_filenames = val_image_generator.filenames[i * val_image_generator.batch_size : (i + 1) * val_image_generator.batch_size]

            features_with_filenames.extend(zip(batch_filenames, image_features))

        filenames, image_features = zip(*features_with_filenames)

        image_features = np.array(image_features)
        filenames = np.array(filenames)

        image_features_dir = os.path.join(settings.STATIC_ROOT, 'facialcomposite/feature_extracted/database_image')
        os.makedirs(image_features_dir, exist_ok=True)  
        image_features_path = os.path.join(image_features_dir, 'extracted_image_features.npy')
        filename_features_path = os.path.join(image_features_dir, 'extracted_image_filenames.npy')

        np.save(image_features_path, image_features)
        np.save(filename_features_path, filenames)
        
        return JsonResponse({'message': 'Feature extraction from database images is complete.'})
    else:
        return JsonResponse({'error': 'Invalid request method.'}, status=400)

def get_profile(request):
    profile_pk = request.GET.get('profile_id')
    
    try:
        profile_info = criminals.objects.get(criminal_id=profile_pk)
        serialized_data = ProfileSerializer(profile_info).data
        
        return JsonResponse({'profile': serialized_data})
    
    except ObjectDoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)