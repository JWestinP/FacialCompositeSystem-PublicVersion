from django.urls import path
from . import views

urlpatterns = [
    path('facialcomposite', views.facialcomposite, name='facialcomposite'),
    path('chosen_features', views.chosen_features, name='chosen_features'),
    path('composite_match/', views.composite_match, name='composite_match'),
    path('composite_match_result/', views.composite_match_result, name='composite_match_result'),    
    path('database_feature_extract/', views.database_feature_extraction, name='database_feature_extract'),
    path('get_feature_details/<int:feature_id>/', views.get_feature_details, name='get_feature_details'),
    path('save_image/', views.save_image, name='save_image'),
    path('get_profile/', views.get_profile, name='get_profile'),
] 