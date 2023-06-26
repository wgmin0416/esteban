from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout, authenticate
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib import auth


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
    print('json activated')
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

    # if request.method == 'POST':
        # form = AuthenticationForm(request, data=request.POST)
        # if form.is_valid():
        #     user = form.get_user()
        #     login(request, user)
        #     return redirect('accounts:hello')
    # else:
    #     form = AuthenticationForm()  
    # return render(request, 'accounts/login.html', {'form': form})
    if request.method == 'POST':
        username = request.POST.get['username']
        password = request.POST.get['password']

        # 사용자 인증
        user = authenticate(request, username=username, password=password)

        if user is not None:
                # 인증 성공 시 로그인 처리
                result = {
                # auth user
                'id': user.id,
                'name': user.username,
                'user_email': user.user_email,
                'date_joined': user.date_joined

                # community_user
                # 'user_id': user.user_id,
                # 'user_name': user.user_name,
                # 'created_at': user.created_at,
                # 'updated_at': user.updated_at
            }
                return JsonResponse(result, status=200)
        else:
                # 인증 실패 시 에러 응답
                return JsonResponse({'message': '로그인 실패'}, status=401)
    else:
         return JsonResponse({'message': 'Requset not POST'}, status=401)

         


def logout_view(request):
    logout(request)
    return redirect('accounts:hello')

