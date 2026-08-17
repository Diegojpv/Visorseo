const API_URL = 'https://visorseo.vercel.app/api';

document.addEventListener('DOMContentLoaded', () => {
  
  let activeSiteData = {
    domain: '',
    fullUrl: ''
  };

  // ==========================================
  // 1. LÓGICA DE LAS PESTAÑAS (Tabs)[cite: 1]
  // ==========================================
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // ==========================================
  // 2. DETECTAR DOMINIO ACTUAL EN CHROME[cite: 1]
  // ==========================================
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0].url;
    
    try {
      const urlObject = new URL(currentUrl);
      activeSiteData.domain = urlObject.hostname;
      activeSiteData.fullUrl = urlObject.href;

      document.getElementById('current-domain').textContent = activeSiteData.domain;
    } catch (error) {
      document.getElementById('current-domain').textContent = "Página no válida";
    }
  });

  // ==========================================
  // 3. CONSULTAR EL BACKEND ASÍNCRONO
  // ==========================================
  const analyzeBtn = document.getElementById('btn-analyze');[cite: 1]
  const statusBadge = document.getElementById('status-badge');[cite: 1]

  analyzeBtn.addEventListener('click', async () => {
    if (!activeSiteData.domain || activeSiteData.domain === "Página no válida") {
      alert("No se puede analizar este tipo de pestaña.");
      return;
    }

    // Cambiar estado visual inicial mientras carga RapidAPI
    statusBadge.textContent = "Analizando...";
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Cargando SEO...";

    // Colocar indicadores de carga temporales en las métricas de SEO[cite: 1]
    document.getElementById('da-val').textContent = "...";
    document.getElementById('pa-val').textContent = "...";
    document.getElementById('dr-val').textContent = "...";
    document.getElementById('backlinks-val').textContent = "...";
    document.getElementById('ref-domains-val').textContent = "...";
    document.getElementById('traffic-val').textContent = "...";
    document.getElementById('keywords-val').textContent = "...";
    document.getElementById('spam-val').textContent = "...";
    
    // Indicar al usuario que Google PageSpeed tardará un poco más
    document.getElementById('speed-val').textContent = "⏳ Calculando...";
    document.getElementById('onpage-val').textContent = "⏳ Calculando...";

    // Petición A: Métricas rápidas de SEO (RapidAPI)
    const fetchSeoData = fetch(`${API_URL}?domain=${activeSiteData.domain}&type=seo`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          const m = data.metrics;
          document.getElementById('da-val').textContent = m.da;[cite: 1]
          document.getElementById('pa-val').textContent = m.pa;[cite: 1]
          document.getElementById('dr-val').textContent = m.dr;[cite: 1]
          document.getElementById('backlinks-val').textContent = m.backlinks;[cite: 1]
          document.getElementById('ref-domains-val').textContent = m.ref_domains;[cite: 1]
          document.getElementById('traffic-val').textContent = m.organic_traffic;[cite: 1]
          document.getElementById('keywords-val').textContent = m.keywords;[cite: 1]
          document.getElementById('spam-val').textContent = m.spam_score;[cite: 1]
          
          statusBadge.textContent = "SEO listo";
          analyzeBtn.textContent = "Midiendo Velocidad...";
        } else {
          statusBadge.textContent = "Error SEO";
        }
      })
      .catch(err => {
        console.error("Error SEO:", err);
        statusBadge.textContent = "Error servidor";
      });

    // Petición B: Rendimiento pesado (Google PageSpeed)
    const fetchSpeedData = fetch(`${API_URL}?domain=${activeSiteData.domain}&type=speed`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          const m = data.metrics;
          document.getElementById('speed-val').textContent = `${m.pagespeed} / 100`;[cite: 1]
          document.getElementById('onpage-val').textContent = `${m.seo_onpage} / 100`;[cite: 1]
        } else {
          document.getElementById('speed-val').textContent = "Error";[cite: 1]
          document.getElementById('onpage-val').textContent = "Error";[cite: 1]
        }
      })
      .catch(err => {
        console.error("Error PageSpeed:", err);
        document.getElementById('speed-val').textContent = "Error";[cite: 1]
        document.getElementById('onpage-val').textContent = "Error";[cite: 1]
      });

    // Esperar a que ambas peticiones concluyan para liberar el botón por completo
    await Promise.allSettled([fetchSeoData, fetchSpeedData]);
    
    statusBadge.textContent = "Completado";[cite: 1]
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analizar Dominio";[cite: 1]
  });

});
