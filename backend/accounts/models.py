from django.db import models

# Create your models here.
class User(models.Model):  # 1
    user_id = models.CharField(max_length=64)
    user_name = models.CharField(max_length=64)
    user_email = models.EmailField(max_length=64)
    password = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self): # 2
        return self.username

    class Meta: # 3
        db_table = 'community_user'
        verbose_name = '커뮤니티 사용자'
        verbose_name_plural = '커뮤니티 사용자'