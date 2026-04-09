// Focuz Engine v3.1 - Ligero y Estable (Columnas en Español)
window.allProd = [];
window.carrito = [];
window.config = {};
window.catAct = "Todas";

window.initFocuz = function(PROD_LINK, CONF_LINK) {
    console.log("Motor Focuz v3.1: Sincronizando...");

    // 1. CARGAR CONFIG
    Papa.parse(CONF_LINK, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
            results.data.forEach(row => { 
                if(row.clave) window.config[row.clave.trim()] = row.valor ? row.valor.trim() : ""; 
            });
            
            // Estética e Identidad
            if(window.config.color_principal) document.documentElement.style.setProperty('--p-color', window.config.color_principal);
            document.getElementById('brand-name').innerText = window.config.nombre_tienda || "Focuz Store";
            document.getElementById('dinamic-title').innerText = window.config.nombre_tienda || "Focuz Store";
            if(window.config.portada) document.getElementById('hero').style.backgroundImage = `url('${window.config.portada}')`;
            if(window.config.favicon) document.getElementById('favicon').href = window.config.favicon;
            
            // Redes Sociales
            let socHTML = '';
            if(window.config.facebook) socHTML += `<a href="${window.config.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
            if(window.config.instagram) socHTML += `<a href="${window.config.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
            if(window.config.tiktok) socHTML += `<a href="${window.config.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;
            document.getElementById('socials').innerHTML = socHTML;

            // 2. CARGAR PRODUCTOS
            window.cargarProductos(PROD_LINK);
        }
    });
};

window.cargarProductos = function(link) {
    Papa.parse(link, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(res) {
            window.allProd = res.data.filter(p => p.Nombre && p.Visible === "Mostrar").map(p => {
                return {
                    id: p.ID_unico || Math.random(),
                    nombre: p.Nombre,
                    // Lógica de Precios: Si hay 'Precio Descuento', ese es el actual
                    precioActual: parseFloat(p['Precio Descuento'] || p.Precio || 0),
                    precioViejo: p['Precio Descuento'] ? parseFloat(p.Precio || 0) : 0,
                    categoria: p.Category || "General",
                    estilo: p['Color o Estilo'] || "",
                    desc: p['Descripción'] || "Sin descripción.",
                    stock: parseInt(p.Stock || 0),
                    f1: p['Imagen 1'], // Columna K
                    f2: p['Imagen 2'], // Columna L
                    f3: p['Imagen 3']  // Columna M
                };
            });
            window.renderCats();
            window.filtrar(); 
        }
    });
};

window.renderCats = function() {
    const cats = ["Todas", ...new Set(window.allProd.map(p => p.categoria).filter(Boolean))];
    const catDiv = document.getElementById('categories');
    if(catDiv) {
        catDiv.innerHTML = cats.map(c => 
            `<div class="cat-btn ${c==window.catAct?'active':''}" onclick="window.setCat('${c}')">${c}</div>`
        ).join('');
    }
};

window.setCat = function(c) { window.catAct = c; window.filtrar(); };

window.filtrar = function() {
    const search = document.getElementById('search').value.toLowerCase();
    const filtered = window.allProd.filter(p => (window.catAct === "Todas" || p.categoria === window.catAct) && p.nombre.toLowerCase().includes(search));
    
    const contenedor = document.getElementById('productos');
    if(!contenedor) return;

    contenedor.innerHTML = filtered.map(p => {
        const isAgotado = p.stock <= 0;
        let badge = "";
        if(p.precioViejo > p.precioActual) {
            badge = `<span class="badge bg-danger position-absolute m-2" style="z-index:5">OFERTA</span>`;
        }

        return `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="p-card h-100 position-relative ${isAgotado ? 'opacity-75' : ''}">
                ${badge}
                <img src="${p.f1}" class="p-img" onclick="window.verDetalle('${p.id}')">
                <div class="p-3 text-center">
                    <h6 class="fw-bold small text-truncate mb-0">${p.nombre}</h6>
                    <small class="text-muted d-block mb-1">${p.estilo}</small>
                    <p class="text-success fw-bold mb-2">
                        ${p.precioViejo ? `<span class="text-muted text-decoration-line-through small me-1">C$ ${p.precioViejo}</span>` : ''}
                        C$ ${p.precioActual}
                    </p>
                    <button class="btn btn-main btn-sm w-100 rounded-pill" ${isAgotado ? 'disabled' : ''} 
                        onclick="window.verDetalle('${p.id}')">
                        ${isAgotado ? 'Agotado' : '+ Agregar'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
};

window.verDetalle = function(id) {
    const p = window.allProd.find(prod => prod.id == id);
    if(!p) return;

    document.getElementById('det-name').innerText = p.nombre + (p.estilo ? " - " + p.estilo : "");
    document.getElementById('det-price').innerHTML = p.precioViejo ? 
        `<span class="text-muted text-decoration-line-through h5 me-2">C$ ${p.precioViejo}</span> C$ ${p.precioActual}` : 
        `C$ ${p.precioActual}`;
    document.getElementById('det-desc').innerText = p.desc;
    document.getElementById('det-img-main').src = p.f1;

    // Galería K, L, M
    const fotos = [p.f1, p.f2, p.f3].filter(f => f && f.trim() !== "");
    document.getElementById('det-thumbs').innerHTML = fotos.map(f => 
        `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`
    ).join('');

    const btn = document.getElementById('det-btn-add');
    btn.disabled = p.stock <= 0;
    btn.innerText = p.stock <= 0 ? "AGOTADO" : "AGREGAR AL CARRITO";
    btn.onclick = () => window.addAlCarrito(p);
    
    new bootstrap.Modal(document.getElementById('detalleModal')).show();
};

window.addAlCarrito = function(p) {
    window.carrito.push({ n: p.nombre, v: p.estilo || "Único", p: p.precioActual, f: p.f1 });
    window.actualizarCarrito();
    bootstrap.Modal.getInstance(document.getElementById('detalleModal')).hide();
    new bootstrap.Offcanvas(document.getElementById('cart')).show();
};

window.actualizarCarrito = function() {
    const list = document.getElementById('cart-list');
    list.innerHTML = window.carrito.map((i, idx) => `
        <div class="d-flex align-items-center mb-3 border-bottom pb-2">
            <img src="${i.f}" style="width:55px; height:55px; object-fit:cover" class="rounded-3 me-3">
            <div class="flex-grow-1"><h6 class="mb-0 small fw-bold">${i.n}</h6><small>${i.v}</small></div>
            <div class="text-end"><b>C$ ${i.p}</b><br><button class="btn btn-sm text-danger p-0" onclick="window.borrarItem(${idx})">✕</button></div>
        </div>`).join('');
    const total = window.carrito.reduce((s, i) => s + i.p, 0);
    document.getElementById('c-count').innerText = window.carrito.length;
    document.getElementById('c-total').innerText = "C$ " + total;
    document.getElementById('total-val').innerText = "C$ " + total;
};

window.borrarItem = function(idx) { window.carrito.splice(idx, 1); window.actualizarCarrito(); };
window.vaciarCarrito = function() { if(confirm("¿Vaciar pedido?")) { window.carrito = []; window.actualizarCarrito(); } };

window.enviarWhatsApp = function() {
    if(!window.carrito.length) return;
    let m = `*PEDIDO: ${window.config.nombre_tienda}*\n` + (window.config.mensaje_base || "Hola! Quiero este pedido:\n\n");
    window.carrito.forEach(i => m += `✅ *${i.n}* (${i.v}) - C$ ${i.p}\n`);
    m += `\n*TOTAL: C$ ${window.carrito.reduce((s, i) => s + i.p, 0)}*`;
    window.open(`https://wa.me/${window.config.celular.replace(/\s+/g,'')}?text=${encodeURIComponent(m)}`, '_blank');
};
