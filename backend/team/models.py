from django.db import models

# Create your models here.
class Team(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=64, blank=False, null=False)
    location = models.CharField(max_length=32, blank=True, null=True)
    since = models.DateTimeField(blank=False, null=False)
    uniform = models.CharField(max_length=32, blank=True, null=True)
    level = models.CharField(max_length=32, blank=True, null=True)

    class Meta:
        db_table = 'team'
        verbose_name = '팀 정보'
        verbose_name_plural = '팀 정보'

        #     user = models.ForeignKey(
        #         settings.AUTH_USER_MODEL, related_name='main_auth_user', on_delete=models.CASCADE)