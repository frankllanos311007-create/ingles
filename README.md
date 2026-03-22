# MusixWave PRO • Nebula Cyberwave Edition

Reproductor de música con estilo cyberwave y autenticación mediante SheetDB.

## 🚀 Características

- 🎵 Reproductor de audio con WaveSurfer.js
- 📁 Carga de música desde carpeta local
- 🎚️ Ecualizador de 10 bandas con presets
- 📊 Visualizador de audio en tiempo real
- 📝 Letras animadas
- 👤 Sistema de login con SheetDB (Google Sheets)
- 💾 Recordar sesión
- 🎨 Interfaz cyberwave con efectos glassmorphism

## 📦 Instalación

1. Clona el repositorio
2. Crea una cuenta en [SheetDB.io](https://sheetdb.io)
3. Crea un Google Sheet con las columnas: username, password, name, role, avatar
4. Conecta SheetDB con tu Google Sheet
5. Reemplaza `SHEETDB_URL` en `scripts.js` con tu URL de SheetDB
6. Sube a Vercel

## 🚀 Despliegue en Vercel

```bash
npm install -g vercel
vercel
```
