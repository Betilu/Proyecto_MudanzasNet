from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario, Rol, Permiso, RolPermiso, Grupo, ConfiguracionSistema, BitacoraAuditoria


def _permisos_nombres_usuario(user):
    # Solo superusuario: bypass global. is_staff no expande permisos (evita saltarse ABAC/UI).
    if getattr(user, 'is_superuser', False):
        return list(Permiso.objects.values_list('nombre', flat=True))
    nombres = set()
    rol = getattr(user, 'rol', None)
    if rol:
        nombres.update(
            rol.permisos_asignados.values_list('permiso__nombre', flat=True).distinct()
        )
    qs_grupos = user.grupos.filter(es_activo=True) if getattr(user, 'pk', None) else Grupo.objects.none()
    nombres.update(
        Permiso.objects.filter(grupos__in=qs_grupos).values_list('nombre', flat=True).distinct()
    )
    return sorted(nombres)


class UsuarioTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = Usuario.USERNAME_FIELD

    def validate(self, attrs):
        from django.utils import timezone
        from rest_framework.exceptions import AuthenticationFailed

        from .audit import registrar_bitacora
        from .login_guard import assert_login_not_locked, clear_login_guard, record_login_failure

        request = self.context.get('request')
        email = attrs.get(self.username_field) or ''

        assert_login_not_locked(request, email)

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            record_login_failure(request, email)

        clear_login_guard(request, email)

        user = self.user
        user.ultimo_login = timezone.now()
        user.save(update_fields=['ultimo_login'])
        registrar_bitacora(
            user,
            'login',
            request=request,
            detalles={'email': user.email},
        )
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nombre'] = user.nombre
        token['rol_nombre'] = user.rol.nombre if user.rol else None
        token['is_superuser'] = user.is_superuser
        token['permisos'] = _permisos_nombres_usuario(user)
        return token


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ('id', 'nombre', 'descripcion', 'es_activo')


class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)

    class Meta:
        model = Usuario
        fields = (
            'id', 'email', 'nombre', 'apellido', 'telefono', 'avatar_url',
            'rol', 'rol_nombre', 'es_activo', 'creado_en'
        )
        read_only_fields = ('email', 'creado_en')


class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ('email', 'nombre', 'apellido', 'password', 'telefono')

    def create(self, validated_data):
        password = validated_data.pop('password')

        # Obtener o crear el rol 'cliente'
        rol_cliente, _ = Rol.objects.get_or_create(
            nombre='cliente',
            defaults={
                'descripcion': 'Cliente del sistema (app móvil y portal)',
                'es_activo': True
            }
        )

        # Crear usuario con rol de cliente
        user = Usuario.objects.create_user(**validated_data, password=password)
        user.rol = rol_cliente
        user.save(update_fields=['rol'])

        # Crear perfil de Cliente asociado
        from apps.clientes.models import Cliente
        Cliente.objects.create(
            usuario=user,
            tipo_cliente='residencial',
            preferencia_comunicacion='email'
        )

        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        from django.contrib.auth.password_validation import validate_password
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Las contraseñas no coinciden.'})
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uid']))
            user = Usuario.objects.get(pk=uid)
        except (Usuario.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError(
                {'non_field_errors': ['El enlace de recuperación no es válido o ha expirado.']}
            )

        if not user.is_active or not user.es_activo:
            raise serializers.ValidationError(
                {'non_field_errors': ['El enlace de recuperación no es válido o ha expirado.']}
            )

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError(
                {'non_field_errors': ['El enlace de recuperación no es válido o ha expirado.']}
            )

        validate_password(attrs['new_password'], user=user)
        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class ConfiguracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSistema
        fields = ('id', 'clave', 'valor', 'tipo_dato', 'descripcion')


class BitacoraSerializer(serializers.ModelSerializer):
    usuario_email = serializers.CharField(source='usuario.email', read_only=True, allow_null=True)

    class Meta:
        model = BitacoraAuditoria
        fields = ('id', 'usuario', 'usuario_email', 'accion', 'entidad_tipo', 'entidad_id', 'detalles', 'creado_en')


class BitacoraAdminSerializer(BitacoraSerializer):
    class Meta(BitacoraSerializer.Meta):
        fields = BitacoraSerializer.Meta.fields + ('direccion_ip', 'user_agent')


class PermisoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permiso
        fields = ('id', 'nombre', 'modulo', 'descripcion', 'tipo_componente')


class GrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grupo
        fields = ('id', 'nombre', 'descripcion', 'es_activo')


class GrupoConPermisosSerializer(serializers.ModelSerializer):
    permisos = PermisoSerializer(many=True, read_only=True)
    permiso_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Grupo
        fields = ('id', 'nombre', 'descripcion', 'es_activo', 'permisos', 'permiso_ids')

    def create(self, validated_data):
        permiso_ids = validated_data.pop('permiso_ids', None) or []
        g = Grupo.objects.create(**validated_data)
        if permiso_ids:
            g.permisos.set(Permiso.objects.filter(pk__in=permiso_ids))
        return g

    def update(self, instance, validated_data):
        permiso_ids = validated_data.pop('permiso_ids', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if permiso_ids is not None:
            instance.permisos.set(Permiso.objects.filter(pk__in=permiso_ids))
        return instance


class UsuarioPerfilSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True, allow_null=True)
    nombre_completo = serializers.CharField(read_only=True)
    permisos = serializers.SerializerMethodField()
    grupos = GrupoSerializer(many=True, read_only=True)

    class Meta:
        model = Usuario
        fields = (
            'id', 'email', 'nombre', 'apellido', 'nombre_completo', 'telefono', 'avatar_url',
            'preferencias_comunicacion', 'rol', 'rol_nombre', 'grupos', 'is_staff', 'is_superuser', 'permisos',
        )
        read_only_fields = ('email', 'permisos', 'is_superuser', 'grupos')

    def get_permisos(self, obj):
        return _permisos_nombres_usuario(obj)


class RolConPermisosSerializer(serializers.ModelSerializer):
    permisos = PermisoSerializer(many=True, read_only=True)
    permiso_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Rol
        fields = ('id', 'nombre', 'descripcion', 'es_activo', 'permisos', 'permiso_ids')

    def update(self, instance, validated_data):
        permiso_ids = validated_data.pop('permiso_ids', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if permiso_ids is not None:
            RolPermiso.objects.filter(rol=instance).delete()
            for pid in permiso_ids:
                try:
                    perm = Permiso.objects.get(pk=pid)
                    RolPermiso.objects.create(rol=instance, permiso=perm)
                except Permiso.DoesNotExist:
                    pass
        return instance


class UsuarioAdminSerializer(serializers.ModelSerializer):
    """Para crear/editar usuarios desde admin. Soporta password y creación de Cliente/Personal."""
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)
    grupos = GrupoSerializer(many=True, read_only=True)
    grupo_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    crear_cliente = serializers.BooleanField(write_only=True, required=False, default=False)
    crear_personal = serializers.BooleanField(write_only=True, required=False, default=False)
    tipo_cliente = serializers.ChoiceField(
        choices=[('residencial', 'Residencial'), ('empresarial', 'Empresarial')],
        write_only=True, required=False
    )
    tipo_personal = serializers.ChoiceField(
        choices=[('conductor', 'Conductor'), ('cargador', 'Cargador')],
        write_only=True, required=False
    )
    numero_licencia = serializers.CharField(write_only=True, required=False)
    tipo_licencia = serializers.CharField(write_only=True, required=False)
    fecha_ingreso = serializers.DateField(write_only=True, required=False)
    salario_mensual = serializers.DecimalField(
        max_digits=10, decimal_places=2, write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Usuario
        fields = (
            'id', 'email', 'nombre', 'apellido', 'telefono', 'rol', 'rol_nombre',
            'grupos', 'grupo_ids', 'es_activo', 'password', 'creado_en',
            'crear_cliente', 'tipo_cliente', 'crear_personal', 'tipo_personal',
            'numero_licencia', 'tipo_licencia', 'fecha_ingreso', 'salario_mensual',
        )
        read_only_fields = ('creado_en',)
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        from apps.clientes.models import Cliente
        from apps.personal.models import Personal

        password = validated_data.pop('password', None)
        grupo_ids = validated_data.pop('grupo_ids', None)
        crear_cliente = validated_data.pop('crear_cliente', False)
        crear_personal = validated_data.pop('crear_personal', False)
        tipo_cliente = validated_data.pop('tipo_cliente', 'residencial')
        tipo_personal = validated_data.pop('tipo_personal', 'conductor')
        numero_licencia = validated_data.pop('numero_licencia', '')
        tipo_licencia = validated_data.pop('tipo_licencia', '')
        fecha_ingreso = validated_data.pop('fecha_ingreso', None)
        salario_mensual = validated_data.pop('salario_mensual', None)

        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria al crear usuario.'})
        user = Usuario.objects.create_user(**validated_data, password=password)

        if crear_cliente:
            Cliente.objects.create(usuario=user, tipo_cliente=tipo_cliente)

        if crear_personal and fecha_ingreso:
            Personal.objects.create(
                usuario=user,
                tipo_personal=tipo_personal,
                numero_licencia=numero_licencia,
                tipo_licencia=tipo_licencia,
                fecha_ingreso=fecha_ingreso,
                salario_mensual=salario_mensual,
            )

        if grupo_ids is not None:
            user.grupos.set(Grupo.objects.filter(pk__in=grupo_ids, es_activo=True))

        return user

    def update(self, instance, validated_data):
        validated_data.pop('crear_cliente', None)
        validated_data.pop('crear_personal', None)
        validated_data.pop('tipo_cliente', None)
        validated_data.pop('tipo_personal', None)
        validated_data.pop('numero_licencia', None)
        validated_data.pop('tipo_licencia', None)
        validated_data.pop('fecha_ingreso', None)
        validated_data.pop('salario_mensual', None)
        grupo_ids = validated_data.pop('grupo_ids', None)
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if grupo_ids is not None:
            instance.grupos.set(Grupo.objects.filter(pk__in=grupo_ids, es_activo=True))
        return instance
