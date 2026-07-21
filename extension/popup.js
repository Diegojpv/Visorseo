// Esperar a que el HTML cargue completamente
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. LÓGICA DE LAS PESTAÑAS
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remover la clase 'active' de todos los botones y contenidos
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Añadir la clase 'active' al botón clicado
      button.classList.add('active');

      // Obtener el ID del contenido a mostrar desde el atributo data-tab
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Aquí agregaremos luego la lógica para detectar la URL actual
  // y comunicarse con nuestro backend en Python.
});