from django import forms

class FacialFeatureForm(forms.Form):
    description = forms.CharField(label='Description', max_length=100)