import json
import os
import urllib.request
import urllib.parse
from urllib.parse import parse_qs, urlparse
from http.server import BaseHTTPRequestHandler

def format_number(val):
    """Convierte números grandes a formato legible (ej: 1500 -> 1.5K, 2000000 -> 2M)."""
    try:
        n = float(val)
        if n >= 1_000_000:
            return f"{n / 1_000_000:.1f}M"
        elif n >= 1_000:
            return f"{n / 1_000:.1f}K"
        return str(int(n))
    except (ValueError, TypeError):
        return "--"

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        # 1. Configurar encabezados CORS
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        # 2. Capturar el dominio que envía la extensión
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        target_domain = params.get('domain', [''])[0]

        if not target_domain:
            self.wfile.write(json.dumps({"status": "error", "message": "Dominio requerido"}).encode('utf-8'))
            return

        # 3. Leer las claves de Vercel
        rapidapi_key = os.environ.get('RAPIDAPI_KEY', '')
        pagespeed_key = os.environ.get('PAGESPEED_API_KEY', '')

        # ----------------------------------------------------
        # A) CONSULTA A GOOGLE PAGESPEED INSIGHTS
        # ----------------------------------------------------
        pagespeed_score = "--"
        seo_onpage_score = "--"

        if pagespeed_key:
            try:
                encoded_url = urllib.parse.quote(f"https://{target_domain}")
                ps_url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={encoded_url}&key={pagespeed_key}&category=PERFORMANCE&category=SEO"
                
                req_ps = urllib.request.Request(ps_url)
                with urllib.request.urlopen(req_ps, timeout=10) as resp:
                    ps_data = json.loads(resp.read().decode('utf-8'))
                    cats = ps_data.get('lighthouseResult', {}).get('categories', {})
                    
                    perf = cats.get('performance', {}).get('score')
                    seo_cat = cats.get('seo', {}).get('score')

                    if perf is not None:
                        pagespeed_score = int(perf * 100)
                    if seo_cat is not None:
                        seo_onpage_score = int(seo_cat * 100)
            except Exception as e:
                print(f"Error en PageSpeed: {e}")

        # ----------------------------------------------------
        # B) CONSULTA A DOMAIN METRICS CHECK (RAPIDAPI)
        # ----------------------------------------------------
        da_val, pa_val, dr_val = "--", "--", "--"
        backlinks_val, ref_domains_val = "--", "--"
        traffic_val, keywords_val = "--", "--"
        spam_val = "--%"

        if rapidapi_key:
            try:
                rapid_url = f"https://domain-metrics-check.p.rapidapi.com/domain-metrics/{target_domain}"
                req_rapid = urllib.request.Request(rapid_url)
                
                # Encabezados requeridos por RapidAPI
                req_rapid.add_header('X-RapidAPI-Key', rapidapi_key)
                req_rapid.add_header('X-RapidAPI-Host', 'domain-metrics-check.p.rapidapi.com')

                with urllib.request.urlopen(req_rapid, timeout=10) as resp:
                    api_data = json.loads(resp.read().decode('utf-8'))

                    # Extraer métricas de Autoridad
                    da_val = api_data.get('mozDA', '--')
                    pa_val = api_data.get('mozPA', '--')
                    dr_val = api_data.get('ahrefsDR', '--')

                    # Extraer métricas de Enlaces y formatearlas (ej: 29.2M)
                    raw_backlinks = api_data.get('ahrefsBacklinks')
                    backlinks_val = format_number(raw_backlinks) if raw_backlinks is not None else "--"
                    
                    raw_ref_domains = api_data.get('ahrefsRefDomains')
                    ref_domains_val = format_number(raw_ref_domains) if raw_ref_domains is not None else "--"

                    # Extraer métricas de Tráfico
                    raw_traffic = api_data.get('ahrefsTraffic')
                    traffic_val = f"{format_number(raw_traffic)}/mes" if raw_traffic is not None else "--"

                    raw_keywords = api_data.get('ahrefsOrganicKeywords')
                    keywords_val = format_number(raw_keywords) if raw_keywords is not None else "--"

                    # Extraer Spam Score
                    raw_spam = api_data.get('mozSpam')
                    spam_val = f"{raw_spam}%" if raw_spam is not None else "--%"

            except Exception as e:
                print(f"Error en RapidAPI: {e}")

        # ----------------------------------------------------
        # C) CONSTRUIR Y DEVOLVER LA RESPUESTA FINAL
        # ----------------------------------------------------
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
