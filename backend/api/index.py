import json
import os
import urllib.request
import urllib.error
from urllib.parse import parse_qs, urlparse, quote
from http.server import BaseHTTPRequestHandler
import concurrent.futures

def format_number(val):
    try:
        n = float(val)
        if n >= 1_000_000: return f"{n / 1_000_000:.1f}M"
        elif n >= 1_000: return f"{n / 1_000:.1f}K"
        return str(int(n))
    except (ValueError, TypeError): return "--"

def fetch_primary_metrics(domain, api_key):
    """API Original (Extrae DA, PA, Enlaces y Tráfico)"""
    metrics = {"da": "--", "pa": "--", "dr": "--", "backlinks": "--", "ref_domains": "--", "organic_traffic": "--", "keywords": "--"}
    
    if not api_key: return {k: "Error" for k in metrics}
        
    try:
        clean_domain = quote(domain.strip())
        url = f"https://domain-metrics-check.p.rapidapi.com/domain-metrics/{clean_domain}/"
        
        req = urllib.request.Request(url)
        req.add_header('x-rapidapi-key', api_key)
        # HOST DE LA API ANTIGUA
        req.add_header('x-rapidapi-host', 'domain-metrics-check.p.rapidapi.com')
        req.add_header('Content-Type', 'application/json')
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if isinstance(data, dict) and data.get("status") == "error": raise Exception()
                
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
            
    except Exception:
        return {k: "Error" for k in metrics}
        
    return metrics

def fetch_moz_spam(domain, api_key):
    """NUEVA API DE MOZ (Extrae SÓLO el Spam Score con Debug)"""
    # Agregamos 'debug_spam' para leer el error real
    metrics = {"spam_score": "--%", "debug_spam": ""}
    
    if not api_key: 
        metrics["spam_score"] = "Error"
        metrics["debug_spam"] = "Falta la API Key"
        return metrics
        
    try:
        url = "https://moz-da-pa1.p.rapidapi.com/v1/getDaPa"
        body = json.dumps({"q": domain.strip()}).encode('utf-8')
        
        req = urllib.request.Request(url, data=body, method='POST')
        req.add_header('x-rapidapi-key', api_key)
        req.add_header('x-rapidapi-host', 'moz-da-pa1.p.rapidapi.com')
        
        # Cabeceras estándar requeridas por Cloudflare para tráfico de APIs
        req.add_header('Content-Type', 'application/json')
        req.add_header('Accept', 'application/json')
        req.add_header('User-Agent', 'axios/1.6.2')

        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            spam = data.get("spam_score")
            
            if spam is None or spam == -1 or str(spam) == "-1":
                metrics["spam_score"] = "N/D"
                metrics["debug_spam"] = "Éxito, pero la API devolvió -1"
            else:
                metrics["spam_score"] = f"{spam}%"
                metrics["debug_spam"] = "Éxito"
                
    except urllib.error.HTTPError as e:
        # Aquí capturamos el mensaje exacto de rechazo de RapidAPI
        error_body = e.read().decode('utf-8')
        metrics["spam_score"] = "Error"
        metrics["debug_spam"] = f"HTTP {e.code}: {error_body}"
    except Exception as e:
        metrics["spam_score"] = "Error"
        metrics["debug_spam"] = f"Error interno: {str(e)}"
        
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
            self.wfile.write(json.dumps({"status": "error", "message": "Falta el dominio"}).encode('utf-8'))
            return

        # Aquí leemos tu clave secreta desde Vercel de forma segura
        rapidapi_key = os.environ.get('RAPIDAPI_KEY', '')
        
        # Ejecutamos ambas consultas a RapidAPI al mismo tiempo (Concurrencia)
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_primary = executor.submit(fetch_primary_metrics, target_domain, rapidapi_key)
            future_moz = executor.submit(fetch_moz_spam, target_domain, rapidapi_key)
            
            primary_metrics = future_primary.result()
            moz_metrics = future_moz.result()

        # Combinamos los datos en un solo JSON
        combined_metrics = {**primary_metrics, **moz_metrics}

        response_payload = {
            "status": "success", 
            "domain": target_domain, 
            "metrics": combined_metrics
        }

        self.wfile.write(json.dumps(response_payload).encode('utf-8'))
        return
