const API_URL = 'https://visorseo.vercel.app/';

document.addEventListener('DOMContentLoaded', () => {
  let activeSiteData = { domain: '', isValid: false };

  // 1. LÓGICA DE PESTAÑAS (Tabs)
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

  // FUNCIÓN MATEMÁTICA PARA LOS PUNTOS DE COLOR
  function evaluateMetricClass(value, type) {
    if (!value || value === "--" || value === "--%") return ""; 
    let strVal = value.toString().toLowerCase();
    let num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return "";
    if (strVal.includes('k')) num *= 1000;
    if (strVal.includes('m')) num *= 1000000;

    if (type === 'authority') return num >= 40 ? "dot-good" : (num >= 20 ? "dot-average" : "dot-bad");
    if (type === 'spam') return num <= 5 ? "dot-good" : (num <= 30 ? "dot-average" : "dot-bad");
    if (type === 'traffic' || type === 'keywords') return num >= 1000 ? "dot-good" : (num >= 100 ? "dot-average" : "dot-bad");
    if (type === 'links') return num >= 500 ? "dot-good" : (num >= 50 ? "dot-average" : "dot-bad");
    return "";
  }

  // ELEMENTOS DEL DOM
  const analyzeBtn = document.getElementById('btn-analyze');
  const btnText = document.getElementById('btn-text');
  const btnIconSvg = document.getElementById('btn-icon-svg');
  const statusBadge = document.getElementById('status-badge');
  const allMetricValues = document.querySelectorAll('.metric-value, #spam-val');
  const allStatusDots = document.querySelectorAll('.status-dot');
  const spamGauge = document.getElementById('spam-gauge-fill');
  const maxDashOffset = 110;

  // FUNCIÓN CENTRAL: Pinta los datos en la interfaz y aplica las animaciones
  function populateMetrics(m) {
    const updateUI = (id, value, type) => {
      const valEl = document.getElementById(id + '-val');
      const dotEl = document.getElementById(id + '-status');
      
      valEl.textContent = value || "--";
      valEl.classList.remove("skeleton"); 
      
      if(dotEl && type) {
        dotEl.className = "status-dot"; // Resetea clases previas
        const dotClass = evaluateMetricClass(value, type);
        if (dotClass) dotEl.classList.add(dotClass);
      }
    };

    updateUI('da', m.da, 'authority');
    updateUI('pa', m.pa, 'authority');
    updateUI('dr', m.dr, 'authority');
    updateUI('backlinks', m.backlinks, 'links');
    updateUI('ref-domains', m.ref_domains, 'links');
    updateUI('traffic', m.organic_traffic, 'traffic');
    updateUI('keywords', m.keywords, 'traffic');
    
    // Gráfico de Spam Score
    const spamVal = document.getElementById('spam-val');
    spamVal.textContent = m.spam_score || "--%";
    spamVal.classList.remove("skeleton");

    let spamNum = parseFloat((m.spam_score || "0").toString().replace(/[^0-9.]/g, ''));
    if (!isNaN(spamNum)) {
      let offset = maxDashOffset - (maxDashOffset * spamNum / 100);
      spamGauge.style.strokeDashoffset = offset;
      let gaugeColor = evaluateMetricClass(spamNum, 'spam');
      if(gaugeColor === "dot-good") spamGauge.style.stroke = "var(--good-color)";
      if(gaugeColor === "dot-average") spamGauge.style.stroke = "var(--average-color)";
      if(gaugeColor === "dot-bad") spamGauge.style.stroke = "var(--bad-color)";
    }

    // Cambiar estado a ÉXITO
    statusBadge.textContent = "Completado";
    statusBadge.className = "badge badge-neutral";
    analyzeBtn.classList.add('btn-success');
    analyzeBtn.disabled = true; // Evita re-consultar si ya hay datos
    btnText.textContent = "¡Dominio Inspeccionado!";
    btnIconSvg.innerHTML = `<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"></path>`;
  }

  // 2. DETECTAR DOMINIO Y COMPROBAR DATOS GUARDADOS (Storage)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      const urlObject = new URL(tabs[0].url);
      
      // FILTRO DE SEGURIDAD: Solo permitimos http o https
      if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
        throw new Error("Protocolo interno de Chrome");
      }

      activeSiteData.domain = urlObject.hostname;
      activeSiteData.isValid = true;
      document.getElementById('current-domain').textContent = activeSiteData.domain;

      // Buscar si este dominio ya fue analizado recientemente y está guardado
      chrome.storage.local.get([`visor_data_${activeSiteData.domain}`], (result) => {
        const savedData = result[`visor_data_${activeSiteData.domain}`];
        
        if (savedData) {
          // Calculamos cuántas horas han pasado desde que se guardó
          const now = new Date().getTime();
          const hoursPassed = (now - savedData.timestamp) / (1000 * 60 * 60);

          if (hoursPassed < 24) { 
            // Si tiene menos de 24 horas de antigüedad, lo mostramos (ojo: savedData.metrics)
            populateMetrics(savedData.metrics);
          } else {
            // Si ya pasaron más de 24 horas, borramos ese dato viejo de Chrome Storage
            chrome.storage.local.remove(`visor_data_${activeSiteData.domain}`);
          }
        }
      });

    } catch (error) {
      // SI LA URL ES INVÁLIDA (Ej: chrome://extensions)
      activeSiteData.isValid = false;
      document.getElementById('current-domain').textContent = "Página no analizable";
      document.getElementById('current-domain').style.color = "var(--text-muted)";
      
      analyzeBtn.disabled = true;
      btnText.textContent = "URL no válida para SEO";
      statusBadge.textContent = "Bloqueado";
      statusBadge.className = "badge badge-error";
      btnIconSvg.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`;
    }
  });

  // 3. CONSULTAR LA API
  analyzeBtn.addEventListener('click', () => {
    if (!activeSiteData.isValid) return;

    // ESTADO DE CARGA
    statusBadge.textContent = "Analizando...";
    statusBadge.className = "badge badge-active";
    analyzeBtn.disabled = true;
    analyzeBtn.classList.remove('btn-success');
    btnText.textContent = "Obteniendo datos...";
    
    // Reiniciar gráfico de spam
    spamGauge.style.strokeDashoffset = maxDashOffset;
    spamGauge.style.stroke = "var(--neutral-color)";

    // Aplicar Skeleton y reiniciar puntos
    allMetricValues.forEach(el => {
      el.textContent = "00";
      el.classList.add("skeleton");
    });
    allStatusDots.forEach(dot => {
      dot.className = "status-dot";
    });

    fetch(`${API_URL}?domain=${activeSiteData.domain}`)
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          // Pintar métricas
          populateMetrics(data.metrics);
          
          // GUARDAR EN CACHÉ LOCAL CON MARCA DE TIEMPO (Timestamp)
          const dataToSave = {
            metrics: data.metrics,
            timestamp: new Date().getTime() // Guarda la hora exacta actual en milisegundos
          };
          chrome.storage.local.set({ [`visor_data_${activeSiteData.domain}`]: dataToSave });
        } else {
          throw new Error("API devolvió error");
        }
      })
      .catch(error => {
        console.error("Error al consultar:", error);
        statusBadge.textContent = "Error";
        statusBadge.className = "badge badge-error";
        allMetricValues.forEach(el => { el.classList.remove("skeleton"); el.textContent = "--"; });
        btnText.textContent = "Intentar de nuevo";
        analyzeBtn.disabled = false; // Permitimos reintentar si hubo error
        btnIconSvg.innerHTML = `<polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>`;
      });
  });
});
