import json
import os
import urllib.request
import urllib.error
from urllib.parse import parse_qs, urlparse
from http.server import BaseHTTPRequestHandler

def format_number(val):
    try:
        n = float(val)
        if n >= 1_000_000: return f"{n / 1_000_000:.1f}M"
        elif n >= 1_000: return f"{n / 1_000:.1f}K"
        return str(int(n))
    except (ValueError, TypeError): return "--"

def fetch_rapidapi(domain, api_key):
    # Añadimos un campo "debug_info" para atrapar el error real
    metrics = {"da": "--", "pa": "--", "dr": "--", "backlinks": "--", "ref_domains": "--", "organic_traffic": "--", "keywords": "--", "spam_score": "--%", "debug_info": ""}
    
    if not api_key: 
        metrics["debug_info"] = "ERROR: Vercel no está leyendo la API_KEY."
        return metrics
        
    try:
        url = f"https://domain-metrics-check.p.rapidapi.com/domain-metrics/{domain}"
        req = urllib.request.Request(url)
        req.add_header('X-RapidAPI-Key', api_key)
        req.add_header('X-RapidAPI-Host', 'domain-metrics-check.p.rapidapi.com')
        req.add_header('User-Agent', 'Mozilla/5.0')

        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_response = resp.read().decode('utf-8')
            data = json.loads(raw_response)
            
            # Guardamos un extracto de lo que RapidAPI responde para verlo con nuestros propios ojos
            metrics["debug_info"] = f"EXITO. RapidAPI respondió: {raw_response[:150]}..."
            
            metrics["da"] = data.get('mozDA', '--')
            metrics["pa"] = data.get('mozPA', '--')
            metrics["dr"] = data.get('ahrefsDR', '--')
            
            rb = data.get('ahrefsBacklinks')
            metrics["backlinks"] = format_number(rb) if rb is not None else "--"
            
            rd = data.get('ahrefsRefDomains')
            metrics["ref_domains"] = format_number(rd) if rd is not None else "--"
            
            rt = data.get('ahrefsTraffic')
            metrics["organic_traffic"] = f"{format_number(rt)}/mes" if rt is not None else "--"
            
            rk = data.get('ahrefsOrganicKeywords')
            metrics["keywords"] = format_number(rk) if rk is not None else "--"
            
            rs = data.get('mozSpam')
            metrics["spam_score"] = f"{rs}%" if rs is not None else "--%"
            
    except urllib.error.HTTPError as e:
        # Si RapidAPI rechaza la petición (ej. Error 403, 401, 404), atrapamos el mensaje exacto
        error_body = e.read().decode('utf-8')
        metrics["debug_info"] = f"ERROR HTTP {e.code}: {error_body}"
    except Exception as e:
        metrics["debug_info"] = f"ERROR GENERAL: {str(e)}"
        
    return metrics

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        target_domain = params.get('domain', [''])[0].replace('www.', '')

        if not target_domain:
            self.wfile.write(json.dumps({"status": "error"}).encode('utf-8'))
            return

        rapidapi_key = os.environ.get('RAPIDAPI_KEY', '')
        
        response_payload = {
            "status": "success", 
            "domain": target_domain, 
            "metrics": fetch_rapidapi(target_domain, rapidapi_key)
        }

        self.wfile.write(json.dumps(response_payload).encode('utf-8'))
        return
