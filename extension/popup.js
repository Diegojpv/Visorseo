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
  // 3. CONSULTAR EL BACKEND (Fetch Doble / Asíncrono)
  // ==========================================
  const analyzeBtn = document.getElementById('btn-analyze');
  const statusBadge = document.getElementById('status-badge');

  analyzeBtn.addEventListener('click', () => {
    if (!activeSiteData.domain || activeSiteData.domain === "Página no válida") {
      alert("No se puede analizar este tipo de pestaña.");
      return;
    }

    // --- PREPARAR LA UI (Interfaz) ---
    statusBadge.textContent = "Analizando...";
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Cargando métricas...";

    // Ponemos puntos suspensivos en los campos rápidos
    document.getElementById('da-val').textContent = "...";
    document.getElementById('pa-val').textContent = "...";
    document.getElementById('dr-val').textContent = "...";
    document.getElementById('backlinks-val').textContent = "...";
    document.getElementById('ref-domains-val').textContent = "...";
    document.getElementById('traffic-val').textContent = "...";
    document.getElementById('keywords-val').textContent = "...";
    document.getElementById('spam-val').textContent = "...";

    // Dejamos muy claro que PageSpeed tardará
    document.getElementById('speed-val').textContent = "⏳ Calculando...";
    document.getElementById('onpage-val').textContent = "⏳ Calculando...";

    // --- PETICIÓN A (Rápida): Solicitar métricas de SEO a RapidAPI ---
    fetch(`${API_URL}?domain=${activeSiteData.domain}&type=seo`)
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          const m = data.metrics;
          // Pestañas SEO: Se llenan casi de inmediato
          document.getElementById('da-val').textContent = m.da || "--";
          document.getElementById('pa-val').textContent = m.pa || "--";
          document.getElementById('dr-val').textContent = m.dr || "--";
          document.getElementById('backlinks-val').textContent = m.backlinks || "--";
          document.getElementById('ref-domains-val').textContent = m.ref_domains || "--";
          document.getElementById('traffic-val').textContent = m.organic_traffic || "--";
          document.getElementById('keywords-val').textContent = m.keywords || "--";
          document.getElementById('spam-val').textContent = m.spam_score || "--%";

          // Actualizamos los textos para avisar que falta Google
          analyzeBtn.textContent = "Midiendo Velocidad...";
          statusBadge.textContent = "Midiendo...";
        }
      })
      .catch(error => {
        console.error("Error cargando SEO:", error);
      });

    // --- PETICIÓN B (Lenta): Solicitar velocidad a Google PageSpeed ---
    fetch(`${API_URL}?domain=${activeSiteData.domain}&type=speed`)
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          const m = data.metrics;
          // Pestaña Rendimiento: Se llena cuando Google termine
          document.getElementById('speed-val').textContent = `${m.pagespeed} / 100`;
          document.getElementById('onpage-val').textContent = `${m.seo_onpage} / 100`;
        } else {
          document.getElementById('speed-val').textContent = "Error";
          document.getElementById('onpage-val').textContent = "Error";
        }
      })
      .catch(error => {
        console.error("Error cargando PageSpeed:", error);
        document.getElementById('speed-val').textContent = "Error";
        document.getElementById('onpage-val').textContent = "Error";
      })
      .finally(() => {
        // Pase lo que pase (éxito o error), liberamos los botones al final
        statusBadge.textContent = "Completado";
        analyzeBtn.textContent = "Analizar Dominio";
        analyzeBtn.disabled = false;
      });

  });

});
