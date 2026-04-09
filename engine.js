// Focuz Engine v4.0 - plantilla base clonable
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

            // Config global
            const nombreTienda = window.config.nombre_tienda || "Focuz Shop";
            const colorPrincipal = window.config.color_principal || "#4E0E86";
            const portada = window.config.portada || "";
            const favicon = window.config.favicon || "";
            const moneda = window.config.moneda || "C$";

            document.documentElement.style.setProperty('--p-color', colorPrincipal);
            document.title = nombreTienda;

            const brandName = document.getElementById('brand-name');
            if (brandName) brandName.innerText = nombreTienda;

            const dynTitle = document.getElementById('dinamic-title');
            if (dynTitle) dynTitle.innerText = nombreTienda;

            const hero = document.getElementById('hero');
            if (hero && portada) hero.style.backgroundImage = `url('${portada}')`;

            const fav = document.getElementById('favicon');
            if (fav && favicon) fav.href = favicon;

            let socHTML = '';
            if (window.config.facebook) socHTML += `<a href="${window.config.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
            if (window.config.instagram) socHTML += `<a href="${window.config.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
            if (window.config.tiktok) socHTML += `<a href="${window.config.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;

            const socials = document.getElementById('socials');
            if (socials) socials.innerHTML = socHTML;

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
    const cats = ["Todas", ...new Set(window.allProd.map(p => p.Category).filter(Boolean))];
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
    const searchInput = document.getElementById('search');
    const searchVal = searchInput ? searchInput.value.toLowerCase() : "";
    const moneda = window.config.moneda || "C$";

    const filtered = window.allProd.filter(p =>
        (window.catAct === "Todas" || p.Category === window.catAct) &&
        (p.Nombre || "").toLowerCase().includes(searchVal)
    );

    const groups = filtered.reduce((acc, p) => {
        if (!acc[p.Nombre]) acc[p.Nombre] = [];
        acc[p.Nombre].push(p);
        return acc;
    }, {});

    const productos = document.getElementById('productos');
    if (!productos) return;

    productos.innerHTML = Object.keys(groups).map(nombre => {
        const variants = groups[nombre];
        const padre = variants.find(v => !v['Color o Estilo'] || v['Color o Estilo'].trim() === "") || variants[0];
        const stockTotal = variants.reduce((acc, v) => acc + parseInt(v.Stock || 0), 0);
        const etiqueta = padre.Etiqueta || "";
        const imagen = padre['Imagen 1'] || padre['Imagen_App'] || padre['Imagen_excel'] || "";
        const precioBase = padre['Precio Descuento'] || padre.Precio || "0";

        return `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="p-card h-100 position-relative ${stockTotal <= 0 ? 'opacity-75' : ''}">
                ${etiqueta ? `<span class="badge bg-danger position-absolute m-2" style="z-index:5">${etiqueta}</span>` : ""}
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

    const detName = document.getElementById('det-name');
    if (detName) detName.innerText = nombre;

    const detDesc = document.getElementById('det-desc');
    if (detDesc) detDesc.innerText = padre['Descripción'] || "Sin descripción.";

    const imagenPrincipal = padre['Imagen 1'] || padre['Imagen_App'] || padre['Imagen_excel'] || "";
    const detImgMain = document.getElementById('det-img-main');
    if (detImgMain) detImgMain.src = imagenPrincipal;

    const fotos = [
        padre['Imagen 1'],
        padre['Imagen 2'],
        padre['Imagen 3'],
        padre['Imagen_App'],
        padre['Imagen_App_1'],
        padre['Imagen_App_2'],
        padre['Imagen_App_3'],
        padre['Imagen_excel']
    ].filter((f, i, arr) => f && f.trim() !== "" && arr.indexOf(f) === i);

    const thumbs = document.getElementById('det-thumbs');
    if (thumbs) {
        thumbs.innerHTML = fotos.map(f =>
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

    const selectorArea = document.getElementById('det-selector-area');
    if (selectorArea) selectorArea.innerHTML = htmlSelector;

    const btn = document.getElementById('det-btn-add');
    if (btn) {
        const stockPadre = parseInt(padre.Stock || 0);

        if (variants.length === 1 && stockPadre <= 0) {
            btn.disabled = true;
            btn.innerText = "PRODUCTO AGOTADO";
            btn.onclick = null;
        } else {
            btn.disabled = variants.length > 1;
            btn.innerText = variants.length > 1 ? "SELECCIONA UNA OPCIÓN" : "AGREGAR AL CARRITO";
        }

        if (variants.length === 1 && stockPadre > 0) {
            btn.onclick = () => window.addAlCarrito(padre.ID_unico);
        }
    }

    new bootstrap.Modal(document.getElementById('detalleModal')).show();
};

window.updateVariantDetail = function(select) {
    const id = select.value;
    const p = window.allProd.find(v => v.ID_unico == id);
    if (!p) return;

    const moneda = window.config.moneda || "C$";
    const detPrice = document.getElementById('det-price');
    if (detPrice) {
        detPrice.innerHTML = p['Precio Descuento']
            ? `<span class="text-muted text-decoration-line-through small">${moneda} ${p.Precio}</span> ${moneda} ${p['Precio Descuento']}`
            : `${moneda} ${p.Precio}`;
    }

    const img = p['Imagen 1'] || p['Imagen_App'] || p['Imagen_excel'] || "";
    if (img) {
        const detImgMain = document.getElementById('det-img-main');
        if (detImgMain) detImgMain.src = img;
    }

    const isOut = parseInt(p.Stock || 0) <= 0;
    const btn = document.getElementById('det-btn-add');
    if (btn) {
        btn.disabled = isOut;
        btn.innerText = isOut ? "AGOTADO" : "AGREGAR AL CARRITO";
        btn.onclick = isOut ? null : () => window.addAlCarrito(id);
    }
};

window.addAlCarrito = function(id) {
    const p = window.allProd.find(v => v.ID_unico == id);
    if (!p) return;

    const index = window.carrito.findIndex(item => item.id === id);

    if (index > -1) {
        window.carrito[index].cant += 1;
    } else {
        window.carrito.push({
            id: p.ID_unico,
            n: p.Nombre,
            v: p['Color o Estilo'] || "Único",
            p: parseFloat(p['Precio Descuento'] || p.Precio || 0),
            f: p['Imagen 1'] || p['Imagen_App'] || p['Imagen_excel'] || "",
            cant: 1
        });
    }

    window.actualizarCarrito();

    const m = bootstrap.Modal.getInstance(document.getElementById('detalleModal'));
    if (m) m.hide();

    const cartEl = document.getElementById('cart');
    if (cartEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(cartEl);
        bsOffcanvas.show();
    }
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

    const cCount = document.getElementById('c-count');
    if (cCount) cCount.innerText = totalItems;

    const cTotal = document.getElementById('c-total');
    if (cTotal) cTotal.innerText = `${moneda} ${total}`;

    const totalVal = document.getElementById('total-val');
    if (totalVal) totalVal.innerText = `${moneda} ${total}`;
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
