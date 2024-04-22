from django.db import models

class category(models.Model):
    feature_category = models.CharField(max_length = 128)
    
    def __str__(self):
        return self.feature_category

class facial_feature(models.Model):
    feature_category = models.ForeignKey(category, on_delete=models.CASCADE)
    feature_id = models.BigAutoField(primary_key = True)
    feature_description = models.CharField(max_length = 128)
    feature_photo = models.ImageField(upload_to = 'facial_feature')
    feature_name = models.CharField(max_length = 128)

class criminals(models.Model):
    criminal_id = models.BigAutoField(primary_key = True)
    criminal_name = models.CharField(max_length = 128)
    criminal_age = models.IntegerField()
    criminal_crime = models.CharField(max_length = 1024)
    criminal_mugshot = models.ImageField(upload_to='criminal\\criminal_mugshot')