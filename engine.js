// Focuz Engine v4.1 - Pro: Ofertas Inteligentes, Feedback de Carrito y SKU
window.allProd = [];
window.carrito = [];
window.config = {};
window.catAct = "Todas";

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

            // Configuración Global
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
    // LÓGICA DE OFERTAS: Verificamos si hay algún producto con descuento
    const tieneOfertas = window.allProd.some(p => p['Precio Descuento'] && parseFloat(p['Precio Descuento']) > 0);
    
    let cats = ["Todas"];
    if (tieneOfertas) cats.push("Ofertas"); // Inyectamos la categoría inteligente
    
    const catsExcel = [...new Set(window.allProd.map(p => p.Category).filter(Boolean))];
    cats = cats.concat(catsExcel);

    const catDiv = document.getElementById('categories');
    if (!catDiv) return;

    catDiv.innerHTML = cats.map(c =>
        `<div class="cat-btn ${c === window.catAct ? 'active' : ''}" onclick="window.setCat('${c.replace(/'/g, "\\'")}')">${c}</div>`
    ).join('');
};

window.setCat = function(c) {
    window.catAct = c;
    window.filtrar();
};

window.filtrar = function() {
    const searchVal = document.getElementById('search') ? document.getElementById('search').value.toLowerCase() : "";
    const moneda = window.config.moneda || "C$";

    const filtered = window.allProd.filter(p => {
        const cumpleBusqueda = (p.Nombre || "").toLowerCase().includes(searchVal);
        let cumpleCat = false;

        if (window.catAct === "Todas") {
            cumpleCat = true;
        } else if (window.catAct === "Ofertas") {
            cumpleCat = p['Precio Descuento'] && parseFloat(p['Precio Descuento']) > 0;
        } else {
            cumpleCat = p.Category === window.catAct;
        }

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
        const padre = variants.find(v => !v['Color o Estilo'] || v['Color o Estilo'].trim() === "") || variants[0];
        const stockTotal = variants.reduce((acc, v) => acc + parseInt(v.Stock || 0), 0);
        const imagen = padre['Imagen 1'] || padre['Imagen_App'] || padre['Imagen_excel'] || "";
        const precioBase = padre['Precio Descuento'] || padre.Precio || "0";

        return `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="p-card h-100 position-relative ${stockTotal <= 0 ? 'opacity-75' : ''}">
                ${padre.Etiqueta ? `<span class="badge bg-danger position-absolute m-2" style="z-index:5">${padre.Etiqueta}</span>` : ""}
                <img src="${imagen}" class="p-img" onclick="window.verDetalle('${nombre.replace(/'/g, "\\'")}')">
                <div class="p-3 text-center">
                    <h6 class="fw-bold small text-truncate mb-1">${nombre}</h6>
                    <p class="text-success fw-bold mb-2">
                        ${variants.length > 1 ? 'Varias opciones' : `${moneda} ${precioBase}`}
                    </p>
                    <button class="btn btn-main btn-sm w-100 rounded-pill" ${stockTotal <= 0 ? 'disabled' : ''} onclick="window.verDetalle('${nombre.replace(/'/g, "\\'")}')">
                        ${stockTotal <= 0 ? 'Agotado' : (variants.length > 1 ? 'Ver opciones' : '+ Agregar')}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
};

window.verDetalle = function(nombre) {
    const variants = window.allProd.filter(p => p.Nombre === nombre);
    const padre = variants.find(v => !v['Color o Estilo'] || v['Color o Estilo'].trim() === "") || variants[0];
    const moneda = window.config.moneda || "C$";

    if (document.getElementById('det-name')) document.getElementById('det-name').innerText = nombre;
    if (document.getElementById('det-desc')) document.getElementById('det-desc').innerText = padre['Descripción'] || "Sin descripción.";
    
    // MOSTRAR CÓDIGO (SKU)
    const detCode = document.getElementById('det-code');
    if (detCode) {
        detCode.innerText = padre.codigo ? `COD: ${padre.codigo}` : "";
    }

    const imagenPrincipal = padre['Imagen 1'] || padre['Imagen_App'] || padre['Imagen_excel'] || "";
    if (document.getElementById('det-img-main')) document.getElementById('det-img-main').src = imagenPrincipal;

    const fotos = [padre['Imagen 1'], padre['Imagen 2'], padre['Imagen 3'], padre['Imagen_App'], padre['Imagen_excel']]
                  .filter((f, i, arr) => f && f.trim() !== "" && arr.indexOf(f) === i);

    if (document.getElementById('det-thumbs')) {
        document.getElementById('det-thumbs').innerHTML = fotos.map(f =>
            `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`
        ).join('');
    }

    let htmlSelector = "";
    const detPrice = document.getElementById('det-price');

    if (variants.length > 1) {
        htmlSelector = `<label class="small fw-bold mb-1">Elige una opción:</label>
                        <select id="variant-select" class="form-select mb-3 rounded-3" onchange="window.updateVariantDetail(this)">
                        <option value="" disabled selected>Seleccionar...</option>`;
        variants.forEach(v => {
            if (v['Color o Estilo']) {
                const precioMostrado = v['Precio Descuento'] || v.Precio || "0";
                const isOut = parseInt(v.Stock || 0) <= 0;
                htmlSelector += `<option value="${v.ID_unico}" ${isOut ? 'disabled' : ''}>${v['Color o Estilo']} - ${moneda} ${precioMostrado} ${isOut ? '(Agotado)' : ''}</option>`;
            }
        });
        htmlSelector += `</select>`;
        const minPrecio = Math.min(...variants.map(v => parseFloat(v['Precio Descuento'] || v.Precio || 0)));
        if (detPrice) detPrice.innerText = `Desde ${moneda} ${minPrecio}`;
    } else {
        const pFinal = padre['Precio Descuento'] || padre.Precio || "0";
        if (detPrice) {
            detPrice.innerHTML = padre['Precio Descuento']
                ? `<span class="text-muted text-decoration-line-through small">${moneda} ${padre.Precio}</span> ${moneda} ${pFinal}`
                : `${moneda} ${pFinal}`;
        }
    }

    if (document.getElementById('det-selector-area')) document.getElementById('det-selector-area').innerHTML = htmlSelector;

    const btn = document.getElementById('det-btn-add');
    if (btn) {
        const stockPadre = parseInt(padre.Stock || 0);
        btn.disabled = (variants.length === 1 && stockPadre <= 0) || variants.length > 1;
        btn.innerText = (variants.length === 1 && stockPadre <= 0) ? "AGOTADO" : (variants.length > 1 ? "SELECCIONA UNA OPCIÓN" : "AGREGAR AL CARRITO");
        btn.onclick = (variants.length === 1 && stockPadre > 0) ? () => window.addAlCarrito(padre.ID_unico) : null;
    }

    new bootstrap.Modal(document.getElementById('detalleModal')).show();
};

window.updateVariantDetail = function(select) {
    const id = select.value;
    const p = window.allProd.find(v => String(v.ID_unico) === String(id));
    if (!p) return;

    const moneda = window.config.moneda || "C$";
    const detPrice = document.getElementById('det-price');
    if (detPrice) {
        detPrice.innerHTML = p['Precio Descuento']
            ? `<span class="text-muted text-decoration-line-through small">${moneda} ${p.Precio}</span> ${moneda} ${p['Precio Descuento']}`
            : `${moneda} ${p.Precio}`;
    }

    const img = p['Imagen 1'] || p['Imagen_App'] || p['Imagen_excel'] || "";
    if (img && document.getElementById('det-img-main')) document.getElementById('det-img-main').src = img;

    const isOut = parseInt(p.Stock || 0) <= 0;
    const btn = document.getElementById('det-btn-add');
    if (btn) {
        btn.disabled = isOut;
        btn.innerText = isOut ? "AGOTADO" : "AGREGAR AL CARRITO";
        btn.onclick = isOut ? null : () => window.addAlCarrito(id);
    }
};

window.addAlCarrito = function(id) {
    const p = window.allProd.find(v => String(v.ID_unico) === String(id));
    if (!p) return;

    const index = window.carrito.findIndex(item => String(item.id) === String(id));
    if (index > -1) {
        window.carrito[index].cant += 1;
    } else {
        window.carrito.push({
            id: String(p.ID_unico),
            n: p.Nombre,
            v: p['Color o Estilo'] || "Único",
            p: parseFloat(p['Precio Descuento'] || p.Precio || 0),
            f: p['Imagen 1'] || p['Imagen_App'] || p['Imagen_excel'] || "",
            cant: 1
        });
    }

    window.actualizarCarrito();

    // FEEDBACK VISUAL EN BOTÓN
    const btn = document.getElementById('det-btn-add');
    if (btn) {
        const txtOriginal = btn.innerText;
        btn.innerText = "¡AGREGADO! ✅";
        btn.style.backgroundColor = "#28a745"; // Color verde éxito temporal
        
        setTimeout(() => {
            btn.innerText = txtOriginal;
            btn.style.backgroundColor = ""; // Vuelve al color del CSS
            // Cerramos el modal después del feedback
            const m = bootstrap.Modal.getInstance(document.getElementById('detalleModal'));
            if (m) m.hide();
        }, 800);
    }
    
    // ELIMINADO: Ya no se abre el offcanvas automáticamente.
};

window.actualizarCarrito = function() {
    const list = document.getElementById('cart-list');
    const moneda = window.config.moneda || "C$";

    if (list) {
        list.innerHTML = window.carrito.map((i, idx) => `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <img src="${i.f}" style="width:55px; height:55px; object-fit:cover" class="rounded-3 me-3">
                <div class="flex-grow-1">
                    <h6 class="mb-0 small fw-bold">${i.n} ${i.cant > 1 ? `<span class="badge bg-secondary">x${i.cant}</span>` : ''}</h6>
                    <small class="text-muted">${i.v}</small>
                </div>
                <div class="text-end"><b>${moneda} ${i.p * i.cant}</b><br><button class="btn btn-sm text-danger p-0" onclick="window.borrarItem(${idx})">✕</button></div>
            </div>
        `).join('');
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
        m += `✅ *${i.n}* (x${i.cant}) - ${i.v} | ${moneda} ${i.p * i.cant}\n`;
    });
    const granTotal = window.carrito.reduce((s, i) => s + (i.p * i.cant), 0);
    m += `\n*TOTAL: ${moneda} ${granTotal}*`;

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(m)}`, '_blank');
};
