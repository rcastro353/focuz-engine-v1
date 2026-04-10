// Focuz Sync v5.1 - Pro: Lógica de Interacción Refinada y Blindaje Total
window.allProd = [];
window.carrito = [];
window.config = {};
window.catAct = "Todas";

// --- PUNTO 1: BLINDAJE DE PRECIOS MEJORADO ---
window.parsePrecioFocuz = function(val) {
    if (val === undefined || val === null || val === "") return 0;
    // Eliminamos todo lo que no sea número o punto decimal
    let limpio = String(val).replace(/[^\d.]/g, ''); 
    // Si después de limpiar queda algo, lo convertimos a flotante
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
            const moneda = window.config.moneda || "C$";

            document.documentElement.style.setProperty('--p-color', colorPrincipal);
            document.title = nombreTienda;

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
        let cumpleCat = false;
        if (window.catAct === "Todas") cumpleCat = true;
        else if (window.catAct === "Ofertas") cumpleCat = window.parsePrecioFocuz(p['Precio Descuento']) > 0;
        else cumpleCat = p.Category === window.catAct;
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
        const imagen = padre['Imagen 1'] || padre['Imagen_App'] || padre['Imagen_excel'] || "";
        
        const pDesc = window.parsePrecioFocuz(padre['Precio Descuento']);
        const pNorm = window.parsePrecioFocuz(padre.Precio);
        const precioBase = pDesc > 0 ? pDesc : pNorm;

        // --- PUNTO 2 CORREGIDO: Lógica de Botón vs Imagen ---
        const esUnico = variants.length === 1 && (padre['Color o Estilo'] === "Único" || !padre['Color o Estilo']);
        
        // Imagen siempre abre detalles
        const clickImagen = `window.verDetalle('${nombre.replace(/'/g, "\\'")}')`;
        // Botón agrega directo si es único, sino abre detalles
        const clickBoton = esUnico ? `window.addAlCarrito('${padre.ID_unico}')` : `window.verDetalle('${nombre.replace(/'/g, "\\'")}')`;

        return `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="p-card h-100 position-relative ${stockTotal <= 0 ? 'opacity-75' : ''}">
                ${padre.Etiqueta ? `<span class="badge bg-danger position-absolute m-2" style="z-index:5">${padre.Etiqueta}</span>` : ""}
                <img src="${imagen}" class="p-img" onclick="${clickImagen}">
                <div class="p-3 text-center">
                    <h6 class="fw-bold small text-truncate mb-1">${nombre}</h6>
                    <p class="text-success fw-bold mb-2">
                        ${variants.length > 1 && !esUnico ? 'Varias opciones' : `${moneda} ${precioBase}`}
                    </p>
                    <button class="btn btn-main btn-sm w-100 rounded-pill" ${stockTotal <= 0 ? 'disabled' : ''} id="btn-main-${padre.ID_unico}" onclick="${clickBoton}">
                        ${stockTotal <= 0 ? 'Agotado' : (variants.length > 1 && !esUnico ? 'Ver opciones' : '+ Agregar')}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
};

window.verDetalle = function(nombre) {
    const variants = window.allProd.filter(p => p.Nombre === nombre);
    const padre = variants.find(v => !v['Color o Estilo'] || v['Color o Estilo'].trim() === "" || v['Color o Estilo'] === "Único") || variants[0];
    const moneda = window.config.moneda || "C$";

    document.getElementById('det-name').innerText = nombre;
    document.getElementById('det-desc').innerText = padre['Descripción'] || "Sin descripción.";
    
    const detCode = document.getElementById('det-code');
    if (detCode) detCode.innerText = padre.codigo ? `COD: ${padre.codigo}` : "";

    const imagenPrincipal = padre['Imagen 1'] || padre['Imagen_App'] || padre['Imagen_excel'] || "";
    document.getElementById('det-img-main').src = imagenPrincipal;

    const fotos = [padre['Imagen 1'], padre['Imagen 2'], padre['Imagen 3'], padre['Imagen_App'], padre['Imagen_excel']]
                  .filter((f, i, arr) => f && f.trim() !== "" && arr.indexOf(f) === i);

    document.getElementById('det-thumbs').innerHTML = fotos.map(f =>
        `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`
    ).join('');

    let htmlSelector = "";
    const detPrice = document.getElementById('det-price');

    if (variants.length > 1) {
        htmlSelector = `<label class="small fw-bold mb-1">Elige una opción:</label>
                        <select id="variant-select" class="form-select mb-3 rounded-3" onchange="window.updateVariantDetail(this)">
                        <option value="" disabled selected>Seleccionar...</option>`;
        variants.forEach(v => {
            if (v['Color o Estilo']) {
                const pD = window.parsePrecioFocuz(v['Precio Descuento']);
                const pN = window.parsePrecioFocuz(v.Precio);
                const precioMostrado = pD > 0 ? pD : pN;
                const isOut = parseInt(v.Stock || 0) <= 0;
                htmlSelector += `<option value="${v.ID_unico}" ${isOut ? 'disabled' : ''}>${v['Color o Estilo']} - ${moneda} ${precioMostrado} ${isOut ? '(Agotado)' : ''}</option>`;
            }
        });
        htmlSelector += `</select>`;
        const minPrecio = Math.min(...variants.map(v => {
            const d = window.parsePrecioFocuz(v['Precio Descuento']);
            const p = window.parsePrecioFocuz(v.Precio);
            return d > 0 ? d : p;
        }));
        detPrice.innerText = `Desde ${moneda} ${minPrecio}`;
    } else {
        const pD = window.parsePrecioFocuz(padre['Precio Descuento']);
        const pN = window.parsePrecioFocuz(padre.Precio);
        const pFinal = pD > 0 ? pD : pN;
        detPrice.innerHTML = pD > 0
            ? `<span class="text-muted text-decoration-line-through small">${moneda} ${pN}</span> ${moneda} ${pFinal}`
            : `${moneda} ${pFinal}`;
    }

    document.getElementById('det-selector-area').innerHTML = htmlSelector;

    const btn = document.getElementById('det-btn-add');
    const stockPadre = parseInt(padre.Stock || 0);
    btn.disabled = (variants.length === 1 && stockPadre <= 0) || variants.length > 1;
    btn.innerText = (variants.length === 1 && stockPadre <= 0) ? "AGOTADO" : (variants.length > 1 ? "SELECCIONA UNA OPCIÓN" : "AGREGAR AL CARRITO");
    btn.onclick = (variants.length === 1 && stockPadre > 0) ? () => window.addAlCarrito(padre.ID_unico) : null;

    new bootstrap.Modal(document.getElementById('detalleModal')).show();
};

window.updateVariantDetail = function(select) {
    const id = select.value;
    const p = window.allProd.find(v => String(v.ID_unico) === String(id));
    if (!p) return;

    const moneda = window.config.moneda || "C$";
    const detPrice = document.getElementById('det-price');
    const pD = window.parsePrecioFocuz(p['Precio Descuento']);
    const pN = window.parsePrecioFocuz(p.Precio);

    detPrice.innerHTML = pD > 0
        ? `<span class="text-muted text-decoration-line-through small">${moneda} ${pN}</span> ${moneda} ${pD}`
        : `${moneda} ${pN}`;

    const img = p['Imagen 1'] || p['Imagen_App'] || p['Imagen_excel'] || "";
    if (img) document.getElementById('det-img-main').src = img;

    const isOut = parseInt(p.Stock || 0) <= 0;
    const btn = document.getElementById('det-btn-add');
    btn.disabled = isOut;
    btn.innerText = isOut ? "AGOTADO" : "AGREGAR AL CARRITO";
    btn.onclick = isOut ? null : () => window.addAlCarrito(id);
};

window.addAlCarrito = function(id) {
    const p = window.allProd.find(v => String(v.ID_unico) === String(id));
    if (!p) return;

    const index = window.carrito.findIndex(item => String(item.id) === String(id));
    const stockDisp = parseInt(p.Stock || 0);

    // Si no hay stock, salimos sin hacer NADA (ni siquiera feedback)
    if (stockDisp <= 0) return;

    if (index > -1) {
        if (window.carrito[index].cant < stockDisp) {
            window.carrito[index].cant += 1;
        } else {
            alert("Límite de stock alcanzado.");
            return;
        }
    } else {
        const pD = window.parsePrecioFocuz(p['Precio Descuento']);
        const pN = window.parsePrecioFocuz(p.Precio);
        window.carrito.push({
            id: String(p.ID_unico),
            n: p.Nombre,
            v: p['Color o Estilo'] || "Único",
            p: pD > 0 ? pD : pN,
            f: p['Imagen 1'] || p['Imagen_App'] || p['Imagen_excel'] || "",
            cant: 1
        });
    }

    window.actualizarCarrito();

    // FEEDBACK VISUAL ÚNICAMENTE SI SE AGREGÓ
    const btnModal = document.getElementById('det-btn-add');
    const btnCard = document.getElementById(`btn-main-${id}`);
    
    // Si el modal está abierto, usamos el botón del modal, sino el de la tarjeta
    const modalAbierto = document.getElementById('detalleModal').classList.contains('show');
    const btnAction = modalAbierto ? btnModal : btnCard;

    if (btnAction) {
        const txtOriginal = btnAction.innerText;
        btnAction.innerText = "¡LISTO! ✅";
        btnAction.classList.replace('btn-main', 'btn-success');
        
        setTimeout(() => {
            btnAction.innerText = txtOriginal;
            btnAction.classList.replace('btn-success', 'btn-main');
            if (modalAbierto) {
                const m = bootstrap.Modal.getInstance(document.getElementById('detalleModal'));
                if (m) m.hide();
            }
        }, 700);
    }
};

window.cambiarCant = function(idx, delta) {
    const item = window.carrito[idx];
    const pOriginal = window.allProd.find(v => String(v.ID_unico) === String(item.id));
    const stockMax = parseInt(pOriginal.Stock || 0);

    if (delta > 0 && item.cant < stockMax) {
        item.cant += 1;
    } else if (delta < 0 && item.cant > 1) {
        item.cant -= 1;
    }
    window.actualizarCarrito();
};

window.actualizarCarrito = function() {
    const list = document.getElementById('cart-list');
    const moneda = window.config.moneda || "C$";

    if (list) {
        list.innerHTML = window.carrito.map((i, idx) => {
            const pOrig = window.allProd.find(v => String(v.ID_unico) === String(i.id));
            const stockMax = parseInt(pOrig.Stock || 0);
            const disablePlus = i.cant >= stockMax ? 'disabled opacity-50' : '';

            return `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <img src="${i.f}" style="width:50px; height:50px; object-fit:cover" class="rounded-3 me-3">
                <div class="flex-grow-1">
                    <h6 class="mb-0 small fw-bold">${i.n}</h6>
                    <small class="text-muted">${i.v === 'Único' ? '' : i.v}</small>
                    <div class="d-flex align-items-center mt-1">
                        <button class="btn btn-outline-secondary btn-xs py-0 px-2" onclick="window.cambiarCant(${idx}, -1)">-</button>
                        <span class="mx-2 small fw-bold">${i.cant}</span>
                        <button class="btn btn-outline-secondary btn-xs py-0 px-2 ${disablePlus}" onclick="window.cambiarCant(${idx}, 1)">+</button>
                    </div>
                </div>
                <div class="text-end">
                    <b class="small">${moneda} ${i.p * i.cant}</b><br>
                    <button class="btn btn-sm text-danger p-0 mt-1" onclick="window.borrarItem(${idx})"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    const total = window.carrito.reduce((s, i) => s + (i.p * i.cant), 0);
    const totalItems = window.carrito.reduce((s, i) => s + i.cant, 0);

    if (document.getElementById('c-count')) document.getElementById('c-count').innerText = totalItems;
    if (document.getElementById('c-total')) document.getElementById('c-total').innerText = `${moneda} ${total}`;
    if (document.getElementById('total-val')) document.getElementById('total-val').innerText = `${moneda} ${total}`;
};

window.borrarItem = function(idx) {
    window.carrito.splice(idx, 1);
    window.actualizarCarrito();
};

window.vaciarCarrito = function() {
    if (confirm("¿Vaciar pedido?")) {
        window.carrito = [];
        window.actualizarCarrito();
    }
};

window.enviarWhatsApp = function() {
    if (!window.carrito.length) return;

    const moneda = window.config.moneda || "C$";
    const saludo = window.config.mensaje_base || "Hola! Quiero hacer este pedido:";
    const numero = (window.config.celular || "").replace(/\s+/g, '');

    let m = `${saludo}\n\n`;
    window.carrito.forEach(i => {
        const varianteTxt = i.v === "Único" ? "" : ` - ${i.v}`;
        m += `✅ *${i.n}* (x${i.cant})${varianteTxt} | ${moneda} ${i.p * i.cant}\n\n`;
    });
    
    const granTotal = window.carrito.reduce((s, i) => s + (i.p * i.cant), 0);
    m += `*TOTAL: ${moneda} ${granTotal}*`;

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(m)}`, '_blank');
};
