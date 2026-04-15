// Focuz Sync v5.2 - Pro: Lógica de Interacción Refinada, WhatsApp Flotante y Blindaje Total
window.allProd = [];
window.carrito = [];
window.config = {};
window.catAct = "Todas";

// --- PUNTO 1: BLINDAJE DE PRECIOS MEJORADO ---
window.parsePrecioFocuz = function(val) {
    if (val === undefined || val === null || val === "") return 0;
    let limpio = String(val).replace(/[^\d.]/g, ''); 
    return parseFloat(limpio) || 0;
};

window.initFocuz = function(PROD_LINK, CONF_LINK) {
    Papa.parse(CONF_LINK, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            window.config = {};
            results.data.forEach(row => {
                if (row.clave) {
                    window.config[row.clave.trim()] = row.valor ? row.valor.trim() : "";
                }
            });

            const nombreTienda = window.config.nombre_tienda || "Focuz Shop";
            const colorPrincipal = window.config.color_principal || "#4E0E86";
            // Aquí jalamos el color de la celda B12 (asumiendo que su clave en el Excel es 'color_whatsapp')
            const colorWA = window.config.color_whatsapp || "#25d366"; 
            const moneda = window.config.moneda || "C$";

            // Aplicamos los colores dinámicos al CSS
            document.documentElement.style.setProperty('--p-color', colorPrincipal);
            document.documentElement.style.setProperty('--wa-color', colorWA);
            document.title = nombreTienda;

            // Configuración del botón flotante de WhatsApp
            const waFloatBtn = document.getElementById('wa-float-btn');
            if (waFloatBtn && window.config.celular) {
                const num = window.config.celular.replace(/\s+/g, '');
                const msg = window.config.mensaje_base || "¡Hola! Tengo una consulta.";
                waFloatBtn.href = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
            }

            if (document.getElementById('brand-name')) document.getElementById('brand-name').innerText = nombreTienda;
            if (document.getElementById('dinamic-title')) document.getElementById('dinamic-title').innerText = nombreTienda;
            if (document.getElementById('hero') && window.config.portada) document.getElementById('hero').style.backgroundImage = `url('${window.config.portada}')`;
            if (document.getElementById('favicon') && window.config.favicon) document.getElementById('favicon').href = window.config.favicon;

            let socHTML = '';
            if (window.config.facebook) socHTML += `<a href="${window.config.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
            if (window.config.instagram) socHTML += `<a href="${window.config.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
            if (window.config.tiktok) socHTML += `<a href="${window.config.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;
            if (document.getElementById('socials')) document.getElementById('socials').innerHTML = socHTML;

            Papa.parse(PROD_LINK, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(res) {
                    window.allProd = res.data.filter(p => p.Nombre && p.Visible === "Mostrar");
                    window.renderCats();
                    window.filtrar();
                }
            });
        }
    });
};

// --- EL RESTO DE TUS FUNCIONES SE MANTIENEN IGUAL ---

window.renderCats = function() {
    const tieneOfertas = window.allProd.some(p => window.parsePrecioFocuz(p['Precio Descuento']) > 0);
    let cats = ["Todas"];
    if (tieneOfertas) cats.push("Ofertas");
    const catsExcel = [...new Set(window.allProd.map(p => p.Category).filter(Boolean))];
    cats = cats.concat(catsExcel);
    const catDiv = document.getElementById('categories');
    if (!catDiv) return;
    catDiv.innerHTML = cats.map(c =>
        `<div class="cat-btn ${c === window.catAct ? 'active' : ''}" data-cat="${c}" onclick="window.setCat('${c.replace(/'/g, "\\'")}')">${c}</div>`
    ).join('');
};

window.setCat = function(c) {
    window.catAct = c;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-cat') === c) btn.classList.add('active');
    });
    window.filtrar();
};

window.filtrar = function() {
    const searchVal = document.getElementById('search') ? document.getElementById('search').value.toLowerCase() : "";
    const moneda = window.config.moneda || "C$";
    const filtered = window.allProd.filter(p => {
        const cumpleBusqueda = (p.Nombre || "").toLowerCase().includes(searchVal);
        let cumpleCat = (window.catAct === "Todas") || (window.catAct === "Ofertas" ? window.parsePrecioFocuz(p['Precio Descuento']) > 0 : p.Category === window.catAct);
        return cumpleBusqueda && cumpleCat;
    });
    const groups = filtered.reduce((acc, p) => {
        if (!acc[p.Nombre]) acc[p.Nombre] = [];
        acc[p.Nombre].push(p);
        return acc;
    }, {});
    const productosDiv = document.getElementById('productos');
    if (!productosDiv) return;
    productosDiv.innerHTML = Object.keys(groups).map(nombre => {
        const variants = groups[nombre];
        const padre = variants.find(v => !v['Color o Estilo'] || v['Color o Estilo'].trim() === "" || v['Color o Estilo'] === "Único") || variants[0];
        const stockTotal = variants.reduce((acc, v) => acc + parseInt(v.Stock || 0), 0);
        const pBase = window.parsePrecioFocuz(padre['Precio Descuento']) > 0 ? window.parsePrecioFocuz(padre['Precio Descuento']) : window.parsePrecioFocuz(padre.Precio);
        const esUnico = variants.length === 1 && (padre['Color o Estilo'] === "Único" || !padre['Color o Estilo']);
        const clickImagen = `window.verDetalle('${nombre.replace(/'/g, "\\'")}')`;
        const clickBoton = esUnico ? `window.addAlCarrito('${padre.ID_unico}')` : `window.verDetalle('${nombre.replace(/'/g, "\\'")}')`;
        return `<div class="col-6 col-md-4 col-lg-3"><div class="p-card h-100 position-relative ${stockTotal <= 0 ? 'opacity-75' : ''}">${padre.Etiqueta ? `<span class="badge bg-danger position-absolute m-2" style="z-index:5">${padre.Etiqueta}</span>` : ""}<img src="${padre['Imagen 1'] || padre['Imagen_App'] || ''}" class="p-img" onclick="${clickImagen}"><div class="p-3 text-center"><h6 class="fw-bold small text-truncate mb-1">${nombre}</h6><p class="text-success fw-bold mb-2">${variants.length > 1 && !esUnico ? 'Varias opciones' : `${moneda} ${pBase}`}</p><button class="btn btn-main btn-sm w-100 rounded-pill" ${stockTotal <= 0 ? 'disabled' : ''} id="btn-main-${padre.ID_unico}" onclick="${clickBoton}">${stockTotal <= 0 ? 'Agotado' : (variants.length > 1 && !esUnico ? 'Ver opciones' : '+ Agregar')}</button></div></div></div>`;
    }).join('');
};

window.verDetalle = function(nombre) {
    const variants = window.allProd.filter(p => p.Nombre === nombre);
    const padre = variants.find(v => !v['Color o Estilo'] || v['Color o Estilo'].trim() === "" || v['Color o Estilo'] === "Único") || variants[0];
    const moneda = window.config.moneda || "C$";
    document.getElementById('det-name').innerText = nombre;
    document.getElementById('det-desc').innerText = padre['Descripción'] || "Sin descripción.";
    if (document.getElementById('det-code')) document.getElementById('det-code').innerText = padre.codigo ? `COD: ${padre.codigo}` : "";
    document.getElementById('det-img-main').src = padre['Imagen 1'] || padre['Imagen_App'] || '';
    const fotos = [padre['Imagen 1'], padre['Imagen 2'], padre['Imagen 3']].filter(f => f && f.trim() !== "");
    document.getElementById('det-thumbs').innerHTML = fotos.map(f => `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`).join('');
    let htmlSelector = "";
    if (variants.length > 1) {
        htmlSelector = `<select id="variant-select" class="form-select mb-3" onchange="window.updateVariantDetail(this)"><option value="" disabled selected>Seleccionar...</option>`;
        variants.forEach(v => { htmlSelector += `<option value="${v.ID_unico}">${v['Color o Estilo']} - ${moneda} ${window.parsePrecioFocuz(v['Precio Descuento']) > 0 ? v['Precio Descuento'] : v.Precio}</option>`; });
        htmlSelector += `</select>`;
    }
    document.getElementById('det-selector-area').innerHTML = htmlSelector;
    const btn = document.getElementById('det-btn-add');
    btn.disabled = variants.length > 1;
    btn.innerText = variants.length > 1 ? "SELECCIONA UNA OPCIÓN" : "AGREGAR AL CARRITO";
    btn.onclick = variants.length === 1 ? () => window.addAlCarrito(padre.ID_unico) : null;
    new bootstrap.Modal(document.getElementById('detalleModal')).show();
};

window.updateVariantDetail = function(select) {
    const p = window.allProd.find(v => String(v.ID_unico) === String(select.value));
    if (!p) return;
    const moneda = window.config.moneda || "C$";
    document.getElementById('det-img-main').src = p['Imagen 1'] || p['Imagen_App'] || '';
    const btn = document.getElementById('det-btn-add');
    btn.disabled = false; btn.innerText = "AGREGAR AL CARRITO";
    btn.onclick = () => window.addAlCarrito(p.ID_unico);
};

window.addAlCarrito = function(id) {
    const p = window.allProd.find(v => String(v.ID_unico) === String(id));
    if (!p) return;
    const index = window.carrito.findIndex(item => String(item.id) === String(id));
    if (index > -1) { window.carrito[index].cant += 1; }
    else {
        const precio = window.parsePrecioFocuz(p['Precio Descuento']) > 0 ? p['Precio Descuento'] : p.Precio;
        window.carrito.push({ id: String(p.ID_unico), n: p.Nombre, v: p['Color o Estilo'] || "Único", p: precio, f: p['Imagen 1'] || p['Imagen_App'] || "", cant: 1 });
    }
    window.actualizarCarrito();
    const btnAction = document.getElementById('detalleModal').classList.contains('show') ? document.getElementById('det-btn-add') : document.getElementById(`btn-main-${id}`);
    if (btnAction) {
        const txtOriginal = btnAction.innerText;
        btnAction.innerText = "¡LISTO! ✅";
        btnAction.classList.replace('btn-main', 'btn-success');
        setTimeout(() => {
            btnAction.innerText = txtOriginal;
            btnAction.classList.replace('btn-success', 'btn-main');
        }, 700);
    }
};

window.cambiarCant = function(idx, delta) {
    const item = window.carrito[idx];
    if (delta > 0) item.cant += 1; else if (delta < 0 && item.cant > 1) item.cant -= 1;
    window.actualizarCarrito();
};

window.actualizarCarrito = function() {
    const moneda = window.config.moneda || "C$";
    document.getElementById('cart-list').innerHTML = window.carrito.map((i, idx) => `<div class="d-flex align-items-center mb-3"><img src="${i.f}" style="width:50px;height:50px;object-fit:cover" class="me-3"><div><h6 class="mb-0 small">${i.n}</h6><small>${i.cant} x ${moneda} ${i.p}</small></div><button class="btn btn-sm text-danger ms-auto" onclick="window.borrarItem(${idx})">🗑️</button></div>`).join('');
    const total = window.carrito.reduce((s, i) => s + (i.p * i.cant), 0);
    document.getElementById('c-count').innerText = window.carrito.length;
    document.getElementById('c-total').innerText = `${moneda} ${total}`;
    document.getElementById('total-val').innerText = `${moneda} ${total}`;
};

window.borrarItem = function(idx) { window.carrito.splice(idx, 1); window.actualizarCarrito(); };
window.vaciarCarrito = function() { if (confirm("¿Vaciar pedido?")) { window.carrito = []; window.actualizarCarrito(); } };
window.enviarWhatsApp = function() {
    if (!window.carrito.length) return;
    const moneda = window.config.moneda || "C$";
    const saludo = window.config.mensaje_base || "Hola! Quiero hacer este pedido:";
    const numero = (window.config.celular || "").replace(/\s+/g, '');
    let m = `${saludo}\n\n`;
    window.carrito.forEach(i => { m += `• ${i.n} (x${i.cant}) - ${moneda} ${i.p * i.cant}\n`; });
    m += `\n*TOTAL: ${moneda} ${window.carrito.reduce((s, i) => s + (i.p * i.cant), 0)}*`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(m)}`, '_blank');
};
