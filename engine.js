// Focuz Engine v2.7 - Arranque Directo
window.initFocuz = function(PROD_LINK, CONF_LINK) {
    console.log("Motor Focuz iniciado..."); // Esto nos avisará en la consola
    let config = {}, allProd = [], carrito = [], catAct = "Todas";

    // 1. CARGAR CONFIGURACIÓN
    Papa.parse(CONF_LINK, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
            console.log("Configuración cargada");
            results.data.forEach(row => { 
                if(row.clave) config[row.clave.trim()] = row.valor ? row.valor.trim() : ""; 
            });
            
            // Aplicar Estilos Dinámicos
            if(config.color_principal) document.documentElement.style.setProperty('--p-color', config.color_principal);
            document.getElementById('brand-name').innerText = config.nombre_tienda || "Tienda";
            document.getElementById('dinamic-title').innerText = config.nombre_tienda || "Tienda";
            if(config.portada) document.getElementById('hero').style.backgroundImage = `url('${config.portada}')`;
            if(config.favicon) document.getElementById('favicon').href = config.favicon;
            
            let socHTML = '';
            if(config.facebook) socHTML += `<a href="${config.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
            if(config.instagram) socHTML += `<a href="${config.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
            if(config.tiktok) socHTML += `<a href="${config.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;
            document.getElementById('socials').innerHTML = socHTML;

            // 2. CARGAR PRODUCTOS
            Papa.parse(PROD_LINK, {
                download: true, header: true, skipEmptyLines: true,
                complete: function(res) {
                    console.log("Productos cargados");
                    allProd = res.data.filter(p => p.Name).map(p => {
                        p.desc = p['Descripción'] || 'Sin descripción adicional.'; 
                        p.f1 = p['Imagen 1'] || p.Imagen_App; 
                        p.f2 = p['Imagen 2']; 
                        p.f3 = p['Imagen 3']; 
                        p.attr = p['Color/ Estilo'] ? p['Color/ Estilo'].trim() : ""; 
                        p.price = parseFloat(p.Price || 0);
                        p.oldPrice = parseFloat(p['Precio Anterior'] || 0); 
                        return p;
                    });
                    window.filtrar(); 
                }
            });
        }
    });

    // ... (Mantené el resto de funciones: filtrar, verDetalle, updateCart, enviarWhatsApp igual que antes) ...
    // IMPORTANTE: Asegurate de que todas empiecen con "window.nombreDeLaFuncion = function..."
}
