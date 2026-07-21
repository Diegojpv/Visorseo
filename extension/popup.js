// Esperar a que el HTML cargue completamente
document.addEventListener('DOMContentLoaded', () => {
  
  // Variable global para guardar la información del sitio activo
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
  // 2. DETECTAR DOMINIO Y URL COMPLETA
  // ==========================================
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0].url;
    
    try {
      const urlObject = new URL(currentUrl);
      
      // Guardamos AMBOS datos en nuestro objeto
      activeSiteData.domain = urlObject.hostname; // ej: ejemplo.com
      activeSiteData.fullUrl = urlObject.href;     // ej: https://ejemplo.com/blog/articulo

      // Mostramos solo el dominio en el diseño para que se vea limpio
      document.getElementById('current-domain').textContent = activeSiteData.domain;

    } catch (error) {
      document.getElementById('current-domain').textContent = "Página no válida";
    }
  });

});
