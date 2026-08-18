const API_URL = 'https://visorseo.vercel.app/api';

document.addEventListener('DOMContentLoaded', () => {
  let activeSiteData = { domain: '', fullUrl: '' };

  // 1. LÓGICA DE LAS PESTAÑAS (Tabs)
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

  // 2. DETECTAR DOMINIO ACTUAL EN CHROME
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      const urlObject = new URL(tabs[0].url);
      activeSiteData.domain = urlObject.hostname;
      document.getElementById('current-domain').textContent = activeSiteData.domain;
    } catch (error) {
      document.getElementById('current-domain').textContent = "Página no válida";
    }
  });

  // 3. CONSULTAR EL BACKEND (Un solo Fetch Rápido)
  const analyzeBtn = document.getElementById('btn-analyze');
  const statusBadge = document.getElementById('status-badge');

  analyzeBtn.addEventListener('click', () => {
    if (!activeSiteData.domain || activeSiteData.domain === "Página no válida") return;

    statusBadge.textContent = "Analizando...";
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Cargando métricas...";

    document.getElementById('da-val').textContent = "...";
    document.getElementById('pa-val').textContent = "...";
    document.getElementById('dr-val').textContent = "...";
    document.getElementById('backlinks-val').textContent = "...";
    document.getElementById('ref-domains-val').textContent = "...";
    document.getElementById('traffic-val').textContent = "...";
    document.getElementById('keywords-val').textContent = "...";
    document.getElementById('spam-val').textContent = "...";

    fetch(`${API_URL}?domain=${activeSiteData.domain}`)
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          const m = data.metrics;
          document.getElementById('da-val').textContent = m.da || "--";
          document.getElementById('pa-val').textContent = m.pa || "--";
          document.getElementById('dr-val').textContent = m.dr || "--";
          document.getElementById('backlinks-val').textContent = m.backlinks || "--";
          document.getElementById('ref-domains-val').textContent = m.ref_domains || "--";
          document.getElementById('traffic-val').textContent = m.organic_traffic || "--";
          document.getElementById('keywords-val').textContent = m.keywords || "--";
          document.getElementById('spam-val').textContent = m.spam_score || "--%";
          statusBadge.textContent = "Completado";
        } else {
          statusBadge.textContent = "Error";
        }
      })
      .catch(error => {
        console.error("Error al consultar:", error);
        statusBadge.textContent = "Error";
      })
      .finally(() => {
        analyzeBtn.textContent = "Analizar Dominio";
        analyzeBtn.disabled = false;
      });
  });
});
