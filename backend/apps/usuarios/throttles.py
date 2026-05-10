from rest_framework.throttling import SimpleRateThrottle


class PasswordResetRequestThrottle(SimpleRateThrottle):
    scope = 'password_reset_request'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return None
        ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class PasswordResetConfirmThrottle(SimpleRateThrottle):
    scope = 'password_reset_confirm'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return None
        ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}
