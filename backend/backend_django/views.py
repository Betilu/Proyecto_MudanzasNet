from django.http import JsonResponse
from django.views.decorators.http import require_http_methods


@require_http_methods(["GET"])
def api_root(request):
    """
    Vista raíz de la API
    Muestra información básica sobre los endpoints disponibles
    """
    return JsonResponse({
        'message': 'Mudanzas CRM API',
        'version': '1.0.0',
        'endpoints': {
            'admin': '/admin/',
            'docs': {
                'swagger': '/api/docs/',
                'redoc': '/api/redoc/',
                'schema': '/api/schema/',
            },
            'web': {
                'auth': '/api/auth/',
                'clientes': '/api/clientes/',
                'zonas': '/api/zonas/',
                'inventario': '/api/inventario/',
                'servicios': '/api/servicios/',
                'cotizaciones': '/api/cotizaciones/',
                'reservas': '/api/reservas/',
                'vehiculos': '/api/vehiculos/',
                'personal': '/api/personal/',
                'mudanzas': '/api/mudanzas/',
                'carga': '/api/carga/',
                'chatbot': '/api/chatbot/',
                'pagos': '/api/pagos/',
                'notificaciones': '/api/notificaciones/',
                'reportes': '/api/reportes/',
                'sistema': '/api/sistema/',
                'ia': '/api/ia/',
            },
            'mobile': {
                'base': '/api/app-cliente/',
                'reservas': '/api/app-cliente/reservas/',
                'nota': 'API dedicada a la app móvil cliente; el portal web sigue en /api/...',
            }
        },
        'status': 'online'
    })
