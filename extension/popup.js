// ⚠️ REEMPLAZA ESTA URL CON LA TUYA DE VERCEL (manteniendo el /api al final)
const API_URL = 'https://visorseo.vercel.app/api';

document.addEventListener('DOMContentLoaded', () => {
  
  let activeSiteData = {
    domain: '',
    fullUrl: ''
  };

  // ==========================================
  // 1. LÓGICA DE LAS PESTAÑAS (Tabs)
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
  // 2. DETECTAR DOMINIO ACTUAL EN CHROME
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
  // 3. CONSULTAR EL BACKEND (Fetch)
  // ==========================================
  const analyzeBtn = document.getElementById('btn-analyze');
  const statusBadge = document.getElementById('status-badge');

  analyzeBtn.addEventListener('click', async () => {
    if (!activeSiteData.domain || activeSiteData.domain === "Página no válida") {
      alert("No se puede analizar este tipo de pestaña.");
      return;
    }

    // Cambiar estado visual mientras carga
    statusBadge.textContent = "Analizando...";
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Cargando métricas...";

    try {
      // Hacer la petición HTTP a Vercel pasando el dominio actual
      const response = await fetch(`${API_URL}?domain=${activeSiteData.domain}`);
      const data = await response.json();

      if (data.status === "success") {
        const m = data.metrics;

        // Pestaña Autoridad
        document.getElementById('da-val').textContent = m.autoridad.da;
        document.getElementById('pa-val').textContent = m.autoridad.pa;
        document.getElementById('dr-val').textContent = m.autoridad.dr;

        // Pestaña Enlaces
        document.getElementById('backlinks-val').textContent = m.enlaces.backlinks;
        document.getElementById('ref-domains-val').textContent = m.enlaces.ref_domains;

        // Pestaña Tráfico
        document.getElementById('traffic-val').textContent = m.trafico.organic_traffic;
        document.getElementById('keywords-val').textContent = m.trafico.keywords;

        // Pestaña Riesgo
        document.getElementById('spam-val').textContent = m.riesgo.spam_score;

        // Pestaña Rendimiento
        document.getElementById('speed-val').textContent = `${m.rendimiento.pagespeed} / 100`;
        document.getElementById('onpage-val').textContent = `${m.rendimiento.seo_onpage} / 100`;

        statusBadge.textContent = "Completado";
      } else {
        statusBadge.textContent = "Error";
      }

    } catch (error) {
      console.error("Error al consultar el servidor:", error);
      statusBadge.textContent = "Error servidor";
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "Analizar Dominio";
    }
  });

});
