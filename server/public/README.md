# Carpeta de archivos estáticos

Coloca aquí los logos e imágenes que quieras usar en los correos.

## Estructura recomendada:

```
public/
  ├── logo.png          (Logo principal - recomendado: 200x200px o similar)
  ├── logo-small.png    (Logo pequeño para headers - recomendado: 100x100px)
  └── favicon.ico        (Opcional)
```

## Formatos soportados:
- PNG (recomendado para logos con transparencia)
- JPG/JPEG
- SVG (puede no funcionar en todos los clientes de correo)

## Uso en correos:

Los logos se pueden acceder desde los correos usando:
- `http://localhost:4000/public/logo.png` (desarrollo)
- `https://tudominio.com/public/logo.png` (producción)

## Nota importante:

Para producción, asegúrate de:
1. Configurar la variable de entorno `BASE_URL` con tu dominio
2. Usar HTTPS para que las imágenes se muestren correctamente en los correos




