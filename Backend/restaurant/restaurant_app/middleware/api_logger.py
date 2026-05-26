import time

from restaurant_app.models import APIRequestLog


class APILoggingMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        start_time = time.time()

        response = self.get_response(request)

        end_time = time.time()

        response_time = (end_time - start_time) * 1000

        session_id = (
            request.headers.get("X-Session-Key")
            or request.session.session_key
        )

        user_id = None

        if request.user.is_authenticated:
            user_id = request.user.id

        ip_address = self.get_client_ip(request)

        try:
            APIRequestLog.objects.create(
                session_id=session_id,
                user_id=user_id,
                api_path=request.path,
                method=request.method,
                status_code=response.status_code,
                response_time_ms=round(response_time, 2),
                ip_address=ip_address,
            )
        except Exception as e:
            print("API LOGGER ERROR:", e)

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")

        return ip