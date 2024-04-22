from django.contrib import admin
from .models import *

class category_admin(admin.ModelAdmin):
    list_display = ["feature_category"]

class facial_feature_admin(admin.ModelAdmin):
    list_display = ["feature_category", "feature_id", "feature_name", "feature_description", "feature_photo"]

class criminal_admin(admin.ModelAdmin):
    list_display = ["criminal_id", "criminal_name", "criminal_crime", "criminal_mugshot"]
    
admin.site.register(category, category_admin)
admin.site.register(facial_feature, facial_feature_admin)
admin.site.register(criminals, criminal_admin)
