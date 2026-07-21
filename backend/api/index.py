import json
import random
from urllib.parse import parse_qs, urlparse
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        # 1. Configurar encabezados CORS para permitir que la extensión se conecte
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        # 2. Extraer la URL o Dominio que nos envió JavaScript en la consulta
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        
        # Si la extensión nos envía ?domain=ejemplo.com, lo capturamos
        target_domain = params.get('domain', ['dominio_desconocido'])[0]

        # 3. Generar datos simularos (Mock Data) dinámicos para pruebas
        # Usamos seed basada en el dominio para que siempre devuelva los mismos
        # números para una misma web durante la prueba.
        random.seed(target_domain)

        mock_response = {
            "status": "success",
            "domain": target_domain,
            "metrics": {
                "autoridad": {
                    "da": random.randint(25, 92),
                    "pa": random.randint(15, 85),
                    "dr": random.randint(20, 88)
                },
                "enlaces": {
                    "backlinks": f"{random.randint(1, 950)}K",
                    "ref_domains": f"{random.randint(100, 12000)}"
                },
                "trafico": {
                    "organic_traffic": f"{random.randint(5, 500)}K/mes",
                    "keywords": f"{random.randint(1, 80)}K"
                },
                "riesgo": {
                    "spam_score": f"{random.randint(1, 12)}%"
                },
                "rendimiento": {
                    "pagespeed": random.randint(45, 98),
                    "seo_onpage": random.randint(70, 100)
                }
            }
        }

        # 4. Responder a la extensión en formato JSON
        self.wfile.write(json.dumps(mock_response).encode('utf-8'))
        return

    def do_OPTIONS(self):
        # Responder a solicitudes pre-flight del navegador por seguridad (CORS)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
