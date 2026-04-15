// Focuz Sync v5.3 - Carrito con + / -, límite por stock y carga optimizada

window.allProd = [];
window.carrito = [];
window.config = {};
window.catAct = "Todas";
window.prodIndex = {};
window.groupedByName = {};

// --- UTILIDADES ---
window.parsePrecioFocuz = function(val) {
    if (val === undefined || val === null || val === "") return 0;
    let limpio = String(val).replace(/[^\d.]/g, '');
    return parseFloat(limpio) || 0;
};

window.normalizarHex = function(hex) {
    if (!hex) return null;
    hex = String(hex).trim().replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return `#${hex}`;
};

window.esColorClaro = function(hex) {
    const limpio = window.normalizarHex(hex);
    if (!limpio) return false;

    const h = limpio.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);

    const luminancia = (0.299 * r) + (0.587 * g) + (0.114 * b);
    return luminancia > 186;
};

window.formatearMoneda = function(valor) {
    const moneda = window.config.moneda || "C$";
    return `${moneda} ${valor}`;
};

window.getProdById = function(id) {
    return window.prodIndex[String(id)] || null;
};

window.getStockDisponibleProducto = function(id) {
    const p = window.getProdById(id);
    if (!p) return 0;
    return Number(p._stock || 0);
};

window.getCantidadEnCarrito = function(id) {
    const item = window.carrito.find(i => String(i.id) === String(id));
    return item ? Number(item.cant || 0) : 0;
};

window.puedeAgregarMas = function(id) {
    const stock = window.getStockDisponibleProducto(id);
    const cantidad = window.getCantidadEnCarrito(id);
    return cantidad < stock;
};

window.getStockTotalByNombre = function(nombre) {
    const variants = window.groupedByName[nombre] || [];
    return variants.reduce((acc, v) => acc + Number(v._stock || 0), 0);
};

window.rebuildIndexes = function() {
    window.prodIndex = {};
    window.groupedByName = {};

    window.allProd.forEach(p => {
        window.prodIndex[String(p.ID_unico)] = p;

        if (!window.groupedByName[p.Nombre]) {
            window.groupedByName[p.Nombre] = [];
        }
        window.groupedByName[p.Nombre].push(p);
    });
};

// --- INIT ---
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
            document.documentElement.style.setProperty(
                '--text-on-primary',
                window.esColorClaro(colorPrincipal) ? '#000000' : '#ffffff'
            );

            document.title = nombreTienda;

            const waFloatBtn = document.getElementById('wa-float-btn');
            if (waFloatBtn && window.config.celular) {
                const num = window.config.celular.replace(/\s+/g, '');
                const msg = window.config.mensaje_base || "¡Hola! Tengo una consulta.";
                waFloatBtn.href = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
            }

            if (document.getElementById('brand-name')) {
                document.getElementById('brand-name').innerText = nombreTienda;
            }

            if (document.getElementById('dinamic-title')) {
                document.getElementById('dinamic-title').innerText = nombreTienda;
            }

            if (document.getElementById('hero') && window.config.portada) {
                document.getElementById('hero').style.backgroundImage = `url('${window.config.portada}')`;
            }

            if (document.getElementById('favicon') && window.config.favicon) {
                document.getElementById('favicon').href = window.config.favicon;
            }

            let socHTML = '';
            if (window.config.facebook) socHTML += `<a href="${window.config.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
            if (window.config.instagram) socHTML += `<a href="${window.config.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
            if (window.config.tiktok) socHTML += `<a href="${window.config.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;
            if (document.getElementById('socials')) {
                document.getElementById('socials').innerHTML = socHTML;
            }

            Papa.parse(PROD_LINK, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(res) {
                    window.allProd = res.data
                        .filter(p => p.Nombre && p.Visible === "Mostrar")
                        .map(p => {
                            const precioNormal = window.parsePrecioFocuz(p.Precio);
                            const precioDescuento = window.parsePrecioFocuz(p['Precio Descuento']);
                            const precioFinal = precioDescuento > 0 ? precioDescuento : precioNormal;
                            const stock = parseInt(p.Stock || 0, 10);

                            return {
                                ...p,
                                _precioNormal: precioNormal,
                                _precioDescuento: precioDescuento,
                                _precioFinal: precioFinal,
                                _stock: isNaN(stock) ? 0 : stock
                            };
                        });

                    window.rebuildIndexes();
                    window.renderCats();
                    window.filtrar();
                    window.actualizarCarrito();
                }
            });
        }
    });
};

// --- CATEGORÍAS ---
window.renderCats = function() {
    const tieneOfertas = window.allProd.some(p => p._precioDescuento > 0);

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
        if (btn.getAttribute('data-cat') === c) btn.classList.add('active');
    });

    window.filtrar();
};

// --- FILTRO Y RENDER DE PRODUCTOS ---
window.filtrar = function() {
    const searchVal = document.getElementById('search')
        ? document.getElementById('search').value.toLowerCase()
        : "";

    const filtered = window.allProd.filter(p => {
        const cumpleBusqueda = (p.Nombre || "").toLowerCase().includes(searchVal);
        const cumpleCat =
            (window.catAct === "Todas") ||
            (window.catAct === "Ofertas" ? p._precioDescuento > 0 : p.Category === window.catAct);

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
        const padre =
            variants.find(v =>
                !v['Color o Estilo'] ||
                v['Color o Estilo'].trim() === "" ||
                v['Color o Estilo'] === "Único"
            ) || variants[0];

        const stockTotal = variants.reduce((acc, v) => acc + Number(v._stock || 0), 0);
        const pBase = padre._precioFinal;
        const esUnico = variants.length === 1 && (padre['Color o Estilo'] === "Único" || !padre['Color o Estilo']);

        const clickImagen = `window.verDetalle('${nombre.replace(/'/g, "\\'")}')`;
        const clickBoton = esUnico
            ? `window.addAlCarrito('${padre.ID_unico}')`
            : `window.verDetalle('${nombre.replace(/'/g, "\\'")}')`;

        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="p-card h-100 position-relative ${stockTotal <= 0 ? 'opacity-75' : ''}">
                    ${padre.Etiqueta ? `<span class="badge bg-danger position-absolute m-2" style="z-index:5">${padre.Etiqueta}</span>` : ""}
                    <img src="${padre['Imagen 1'] || padre['Imagen_App'] || ''}" class="p-img" onclick="${clickImagen}">
                    <div class="p-3 text-center">
                        <h6 class="fw-bold small text-truncate mb-1">${nombre}</h6>
                        <p class="text-success fw-bold mb-2">
                            ${variants.length > 1 && !esUnico ? 'Varias opciones' : window.formatearMoneda(pBase)}
                        </p>
                        <button
                            class="btn btn-main btn-sm w-100 rounded-pill"
                            ${stockTotal <= 0 ? 'disabled' : ''}
                            id="btn-main-${padre.ID_unico}"
                            onclick="${clickBoton}"
                        >
                            ${stockTotal <= 0 ? 'Agotado' : (variants.length > 1 && !esUnico ? 'Ver opciones' : '+ Agregar')}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// --- DETALLE ---
window.verDetalle = function(nombre) {
    const variants = window.groupedByName[nombre] || [];
    if (!variants.length) return;

    const padre =
        variants.find(v =>
            !v['Color o Estilo'] ||
            v['Color o Estilo'].trim() === "" ||
            v['Color o Estilo'] === "Único"
        ) || variants[0];

    document.getElementById('det-name').innerText = nombre;
    document.getElementById('det-desc').innerText = padre['Descripción'] || "Sin descripción.";

    if (document.getElementById('det-code')) {
        document.getElementById('det-code').innerText = padre.codigo ? `COD: ${padre.codigo}` : "";
    }

    document.getElementById('det-img-main').src = padre['Imagen 1'] || padre['Imagen_App'] || '';

    const fotos = [padre['Imagen 1'], padre['Imagen 2'], padre['Imagen 3']].filter(f => f && f.trim() !== "");
    document.getElementById('det-thumbs').innerHTML = fotos.map(f =>
        `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`
    ).join('');

    let htmlSelector = "";

    if (variants.length > 1) {
        htmlSelector = `<select id="variant-select" class="form-select mb-3" onchange="window.updateVariantDetail(this)">
            <option value="" disabled selected>Seleccionar...</option>`;

        variants.forEach(v => {
            const agotadoTxt = Number(v._stock || 0) <= 0 ? " (Agotado)" : "";
            htmlSelector += `<option value="${v.ID_unico}" ${Number(v._stock || 0) <= 0 ? 'disabled' : ''}>
                ${v['Color o Estilo']} - ${window.formatearMoneda(v._precioFinal)}${agotadoTxt}
            </option>`;
        });

        htmlSelector += `</select>`;
    }

    document.getElementById('det-selector-area').innerHTML = htmlSelector;

    const btn = document.getElementById('det-btn-add');
    const stockPadre = Number(padre._stock || 0);

    if (variants.length > 1) {
        btn.disabled = true;
        btn.innerText = "SELECCIONA UNA OPCIÓN";
        btn.onclick = null;
    } else {
        btn.disabled = stockPadre <= 0 || !window.puedeAgregarMas(padre.ID_unico);
        btn.innerText = stockPadre <= 0 ? "AGOTADO" : (!window.puedeAgregarMas(padre.ID_unico) ? "LÍMITE ALCANZADO" : "AGREGAR AL CARRITO");
        btn.onclick = () => window.addAlCarrito(padre.ID_unico);
    }

    new bootstrap.Modal(document.getElementById('detalleModal')).show();
};

window.updateVariantDetail = function(select) {
    const p = window.getProdById(select.value);
    if (!p) return;

    document.getElementById('det-img-main').src = p['Imagen 1'] || p['Imagen_App'] || '';

    const btn = document.getElementById('det-btn-add');
    const stock = Number(p._stock || 0);
    const puedeAgregar = window.puedeAgregarMas(p.ID_unico);

    btn.disabled = stock <= 0 || !puedeAgregar;
    btn.innerText = stock <= 0 ? "AGOTADO" : (puedeAgregar ? "AGREGAR AL CARRITO" : "LÍMITE ALCANZADO");
    btn.onclick = () => window.addAlCarrito(p.ID_unico);
};

// --- CARRITO ---
window.addAlCarrito = function(id) {
    const p = window.getProdById(id);
    if (!p) return;

    const stock = Number(p._stock || 0);
    if (stock <= 0) return;

    const index = window.carrito.findIndex(item => String(item.id) === String(id));

    if (index > -1) {
        if (window.carrito[index].cant >= stock) {
            return;
        }
        window.carrito[index].cant += 1;
    } else {
        window.carrito.push({
            id: String(p.ID_unico),
            n: p.Nombre,
            v: p['Color o Estilo'] || "Único",
            p: Number(p._precioFinal || 0),
            f: p['Imagen 1'] || p['Imagen_App'] || "",
            cant: 1,
            stock: stock
        });
    }

    window.actualizarCarrito();

    const modal = document.getElementById('detalleModal');
    const btnAction = modal && modal.classList.contains('show')
        ? document.getElementById('det-btn-add')
        : document.getElementById(`btn-main-${id}`);

    if (btnAction) {
        const txtOriginal = btnAction.innerText;
        btnAction.innerText = "¡LISTO! ✅";
        btnAction.classList.replace('btn-main', 'btn-success');

        setTimeout(() => {
            btnAction.innerText = txtOriginal;
            btnAction.classList.replace('btn-success', 'btn-main');
            window.refrescarBotonesSegunStock();
        }, 700);
    }

    window.refrescarBotonesSegunStock();
};

window.cambiarCant = function(idx, delta) {
    const item = window.carrito[idx];
    if (!item) return;

    const stock = Number(item.stock || window.getStockDisponibleProducto(item.id) || 0);

    if (delta > 0) {
        if (item.cant < stock) {
            item.cant += 1;
        }
    } else if (delta < 0) {
        if (item.cant > 1) {
            item.cant -= 1;
        } else {
            window.carrito.splice(idx, 1);
        }
    }

    window.actualizarCarrito();
    window.refrescarBotonesSegunStock();
};

window.actualizarCarrito = function() {
    const cartList = document.getElementById('cart-list');
    if (!cartList) return;

    cartList.innerHTML = window.carrito.map((i, idx) => {
        const limiteAlcanzado = Number(i.cant) >= Number(i.stock || 0);

        return `
            <div class="d-flex align-items-center mb-3">
                <img src="${i.f}" style="width:50px;height:50px;object-fit:cover" class="me-3 rounded">
                <div class="flex-grow-1">
                    <h6 class="mb-0 small">${i.n}</h6>
                    <small class="d-block text-muted">${i.v}</small>
                    <small>${window.formatearMoneda(i.p)} c/u</small>

                    <div class="d-flex align-items-center gap-2 mt-2">
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-2" onclick="window.cambiarCant(${idx}, -1)">−</button>
                        <span class="fw-bold">${i.cant}</span>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-2" onclick="window.cambiarCant(${idx}, 1)" ${limiteAlcanzado ? 'disabled' : ''}>+</button>
                        <small class="text-muted ms-2">Stock: ${i.stock}</small>
                    </div>
                </div>

                <div class="text-end ms-2">
                    <div class="fw-bold small">${window.formatearMoneda(i.p * i.cant)}</div>
                    <button class="btn btn-sm text-danger" onclick="window.borrarItem(${idx})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    const total = window.carrito.reduce((s, i) => s + (Number(i.p) * Number(i.cant)), 0);

    const cCount = document.getElementById('c-count');
    const cTotal = document.getElementById('c-total');
    const totalVal = document.getElementById('total-val');

    if (cCount) cCount.innerText = window.carrito.reduce((s, i) => s + Number(i.cant), 0);
    if (cTotal) cTotal.innerText = window.formatearMoneda(total);
    if (totalVal) totalVal.innerText = window.formatearMoneda(total);
};

window.refrescarBotonesSegunStock = function() {
    // refresca visualmente botones en catálogo
    document.querySelectorAll('[id^="btn-main-"]').forEach(btn => {
        const id = btn.id.replace('btn-main-', '');
        const p = window.getProdById(id);
        if (!p) return;

        const stock = Number(p._stock || 0);
        const puedeAgregar = window.puedeAgregarMas(id);

        if (stock <= 0) {
            btn.disabled = true;
            btn.innerText = 'Agotado';
        } else if (!puedeAgregar) {
            btn.disabled = true;
            btn.innerText = 'Límite alcanzado';
        } else {
            btn.disabled = false;
            btn.innerText = '+ Agregar';
        }
    });

    // refresca botón del modal si está abierto
    const select = document.getElementById('variant-select');
    const btnDet = document.getElementById('det-btn-add');

    if (btnDet) {
        if (select && select.value) {
            const p = window.getProdById(select.value);
            if (p) {
                const stock = Number(p._stock || 0);
                const puedeAgregar = window.puedeAgregarMas(p.ID_unico);

                btnDet.disabled = stock <= 0 || !puedeAgregar;
                btnDet.innerText = stock <= 0 ? "AGOTADO" : (puedeAgregar ? "AGREGAR AL CARRITO" : "LÍMITE ALCANZADO");
            }
        }
    }
};

window.borrarItem = function(idx) {
    window.carrito.splice(idx, 1);
    window.actualizarCarrito();
    window.refrescarBotonesSegunStock();
};

window.vaciarCarrito = function() {
    if (confirm("¿Vaciar pedido?")) {
        window.carrito = [];
        window.actualizarCarrito();
        window.refrescarBotonesSegunStock();
    }
};

window.enviarWhatsApp = function() {
    if (!window.carrito.length) return;

    const saludo = window.config.mensaje_base || "Hola! Quiero hacer este pedido:";
    const numero = (window.config.celular || "").replace(/\s+/g, '');

    let m = `${saludo}\n\n`;

    window.carrito.forEach(i => {
        m += `• ${i.n} (${i.v}) x${i.cant} - ${window.formatearMoneda(i.p * i.cant)}\n`;
    });

    const total = window.carrito.reduce((s, i) => s + (Number(i.p) * Number(i.cant)), 0);
    m += `\n*TOTAL: ${window.formatearMoneda(total)}*`;

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(m)}`, '_blank');
};
