from django.urls import path
from . import views

app_name = "accounts"


urlpatterns = [
    path('', views.hello, name='hello'),
    path('signup/', views.signup, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('login/', views.login_view, name='login'),
]