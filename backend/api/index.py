import json
import os
import urllib.request
import urllib.parse
from urllib.parse import parse_qs, urlparse
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        # 1. Configurar encabezados CORS
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        # 2. Extraer el dominio enviado desde el Frontend
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        target_domain = params.get('domain', [''])[0]

        if not target_domain:
            self.wfile.write(json.dumps({"status": "error", "message": "Dominio requerido"}).encode('utf-8'))
            return

        # 3. Leer las llaves secretas de las Variables de Entorno en Vercel
        rapidapi_key = os.environ.get('RAPIDAPI_KEY', '')
        pagespeed_key = os.environ.get('PAGESPEED_API_KEY', '')

        # ----------------------------------------------------
        # A) CONSULTA REAL A GOOGLE PAGESPEED INSIGHTS API
        # ----------------------------------------------------
        pagespeed_score = "--"
        seo_onpage_score = "--"

        if pagespeed_key:
            try:
                encoded_url = urllib.parse.quote(f"https://{target_domain}")
                ps_endpoint = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={encoded_url}&key={pagespeed_key}&category=PERFORMANCE&category=SEO"
                
                req = urllib.request.Request(ps_endpoint)
                with urllib.request.urlopen(req, timeout=12) as response:
                    ps_data = json.loads(response.read().decode('utf-8'))
                    
                    # Google devuelve scores decimales de 0 a 1 (ej: 0.85 -> 85)
                    perf = ps_data.get('lighthouseResult', {}).get('categories', {}).get('performance', {}).get('score')
                    seo_cat = ps_data.get('lighthouseResult', {}).get('categories', {}).get('seo', {}).get('score')
                    
                    if perf is not None:
                        pagespeed_score = int(perf * 100)
                    if seo_cat is not None:
                        seo_onpage_score = int(seo_cat * 100)
            except Exception as e:
                print(f"Error consultando PageSpeed: {e}")

        # ----------------------------------------------------
        # B) CONSULTA A RAPIDAPI (Moz / Ahrefs)
        # ----------------------------------------------------
        da_val, pa_val, dr_val = "--", "--", "--"
        backlinks_val, ref_domains_val = "--", "--"
        traffic_val, keywords_val = "--", "--"
        spam_val = "--%"

        # Aquí Python usará rapidapi_key enviándola en la cabecera 'X-RapidAPI-Key'
        # cuando configures la llamada al endpoint específico de tu suscripción en RapidAPI.

        # 4. Estructurar la respuesta JSON para la extensión
        response_payload = {
            "status": "success",
            "domain": target_domain,
            "metrics": {
                "autoridad": {
                    "da": da_val,
                    "pa": pa_val,
                    "dr": dr_val
                },
                "enlaces": {
                    "backlinks": backlinks_val,
                    "ref_domains": ref_domains_val
                },
                "trafico": {
                    "organic_traffic": traffic_val,
                    "keywords": keywords_val
                },
                "riesgo": {
                    "spam_score": spam_val
                },
                "rendimiento": {
                    "pagespeed": pagespeed_score,
                    "seo_onpage": seo_onpage_score
                }
            }
        }

        self.wfile.write(json.dumps(response_payload).encode('utf-8'))
        return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
