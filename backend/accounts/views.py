from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout
from django.http import JsonResponse
from django.contrib.auth.models import User

# Create jons reaction
# def json_api(request):
#     data = {'message': 'Hello, world!'}
#     return JsonResponse(data, status=200)

def json_api(request):
    
    # 기본모델 auth_user
    users = User.objects.all()

    # 커스텀모델 사용시 - db 구조 개선필요
    # users = community_user.objects.all()

    user_list = []
    for user in users:

        user_list.append({
            # auth user
            'id': user.id,
            'name': user.username,
            'date_joined': user.date_joined

            # community_user
            # 'user_id': user.user_id,
            # 'user_name': user.user_name,
            # 'user_email': user.user_email,
            # 'created_at': user.created_at,
            # 'updated_at': user.updated_at
        })
    data = {'users': user_list}
    return JsonResponse(data, status=200)

# Create your views here.
def hello(request):
    return render(request, 'accounts/hello.html')
    #qqq


def signup(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('accounts:hello')
    else:
        form = UserCreationForm()
    return render(request, 'accounts/signup.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('accounts:hello')
    else:
        form = AuthenticationForm()
    return render(request, 'accounts/login.html', {'form': form})

def logout_view(request):
    logout(request)
    return redirect('accounts:hello')

