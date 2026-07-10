import subprocess
import sys
import os

def check_and_install_dependencies():
    print("Verificando dependencias del sistema...")
    try:
        import flask
        print("Flask ya está instalado en el sistema.")
    except ImportError:
        print("Flask no está instalado. Instalando dependencias desde requirements.txt...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("Dependencias instaladas con éxito.")
        except Exception as e:
            print(f"Error al instalar dependencias con pip: {e}")
            print("Por favor, instale Flask manualmente ejecutando: pip3 install -r requirements.txt")
            sys.exit(1)

if __name__ == "__main__":
    check_and_install_dependencies()
    
    # Run the backend app
    backend_app_path = os.path.join("backend", "app.py")
    print(f"\nIniciando el servidor web de FAITE en http://localhost:5001...")
    print("Presione Ctrl+C para detener el servidor.")
    try:
        subprocess.check_call([sys.executable, backend_app_path])
    except KeyboardInterrupt:
        print("\nServidor detenido por el usuario.")
    except Exception as e:
        print(f"Error al ejecutar el servidor Flask: {e}")
        sys.exit(1)
