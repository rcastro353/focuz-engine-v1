window.allProd = []; window.carrito = []; window.config = {}; window.catAct = "Todas";

window.parsePrecioFocuz = function(val) {
    if (val === undefined || val === null || val === "") return 0;
    return parseFloat(String(val).replace(/[^\d.]/g, '')) || 0;
};

window.getFocuzContrast = function(hex) {
    if (!hex || hex.indexOf('#') !== 0) return '#ffffff';
    const r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
};

window.initFocuz = function(PROD_LINK, CONF_LINK) {
    const fC = new Promise((res) => Papa.parse(CONF_LINK, {download:true, header:true, complete:(r)=>res(r.data)}));
    const fP = new Promise((res) => Papa.parse(PROD_LINK, {download:true, header:true, complete:(r)=>res(r.data)}));

    Promise.all([fC, fP]).then(([cData, pData]) => {
        cData.forEach(row => { if (row.clave) window.config[row.clave.trim()] = row.valor ? row.valor.trim() : ""; });
        const pCol = window.config.color_principal || "#25d366", cCol = window.getFocuzContrast(pCol);
        document.documentElement.style.setProperty('--p-color', pCol);
        document.documentElement.style.setProperty('--p-contrast', cCol);
        
        if (document.getElementById('brand-name')) document.getElementById('brand-name').innerText = window.config.nombre_tienda || "Focuz Shop";
        if (document.getElementById('hero') && window.config.portada) document.getElementById('hero').style.backgroundImage = `url('${window.config.portada}')`;

        if (window.config.celular) {
            let wa = document.getElementById('wa-float-btn');
            if (!wa) {
                wa = document.createElement('a'); wa.id = 'wa-float-btn'; wa.className = 'wa-float'; wa.target = '_blank';
                wa.innerHTML = '<i class="fab fa-whatsapp"></i>'; document.body.appendChild(wa);
            }
            wa.href = `https://wa.me/${String(window.config.celular).replace(/\s+/g, '')}?text=${encodeURIComponent(window.config.mensaje_base || "Hola!")}`;
            wa.style.backgroundColor = pCol; wa.style.color = cCol;
        }

        window.allProd = pData.filter(p => p.Nombre && p.Visible === "Mostrar");
        window.renderCats(); window.filtrar();
    });
};

window.renderCats = function() {
    let cats = ["Todas"]; 
    if (window.allProd.some(p => window.parsePrecioFocuz(p['Precio Descuento']) > 0)) cats.push("Ofertas");
    cats = cats.concat([...new Set(window.allProd.map(p => p.Category).filter(Boolean))]);
    const catDiv = document.getElementById('categories');
    if (catDiv) catDiv.innerHTML = cats.map(c => `<div class="cat-btn ${c === window.catAct ? 'active' : ''}" onclick="window.setCat('${c.replace(/'/g, "\\'")}')">${c}</div>`).join('');
};

window.setCat = function(c) { window.catAct = c; window.renderCats(); window.filtrar(); };

window.filtrar = function() {
    const s = document.getElementById('search') ? document.getElementById('search').value.toLowerCase() : "";
    const mon = window.config.moneda || "C$";
    const fil = window.allProd.filter(p => {
        const b = (p.Nombre || "").toLowerCase().includes(s);
        let c = (window.catAct === "Todas") || (window.catAct === "Ofertas" ? window.parsePrecioFocuz(p['Precio Descuento']) > 0 : p.Category === window.catAct);
        return b && c;
    });
    const groups = fil.reduce((acc, p) => { if (!acc[p.Nombre]) acc[p.Nombre] = []; acc[p.Nombre].push(p); return acc; }, {});
    const pDiv = document.getElementById('productos');
    if (pDiv) pDiv.innerHTML = Object.keys(groups).map(n => {
        const v = groups[n], padre = v.find(x => !x['Color o Estilo'] || x['Color o Estilo'] === "Único") || v[0];
        const stock = v.reduce((a, x) => a + parseInt(x.Stock || 0), 0);
        const pB = window.parsePrecioFocuz(padre['Precio Descuento']) > 0 ? window.parsePrecioFocuz(padre['Precio Descuento']) : window.parsePrecioFocuz(padre.Precio);
        const esU = v.length === 1 && (!padre['Color o Estilo'] || padre['Color o Estilo'] === "Único");
        return `<div class="col-6 col-md-4 col-lg-3"><div class="p-card h-100 position-relative ${stock <= 0 ? 'opacity-75' : ''}">${padre.Etiqueta ? `<span class="badge bg-danger position-absolute m-2">${padre.Etiqueta}</span>` : ""}<img src="${padre['Imagen 1'] || padre['Imagen_App'] || ''}" class="p-img" onclick="window.verDetalle('${n.replace(/'/g, "\\'")}')"><div class="p-3 text-center"><h6 class="fw-bold small text-truncate mb-1">${n}</h6><p class="text-success fw-bold mb-2">${v.length > 1 && !esU ? 'Varias opciones' : `${mon} ${pB}`}</p><button class="btn btn-main btn-sm w-100 rounded-pill" id="btn-main-${padre.ID_unico}" ${stock <= 0 ? 'disabled' : ''} onclick="${esU ? `window.addAlCarrito('${padre.ID_unico}')` : `window.verDetalle('${n.replace(/'/g, "\\'")}')'}">${stock <= 0 ? 'Agotado' : (v.length > 1 && !esU ? 'Ver opciones' : '+ Agregar')}</button></div></div></div>`;
    }).join('');
};

window.verDetalle = function(n) {
    const v = window.allProd.filter(p => p.Nombre === n), padre = v.find(x => !x['Color o Estilo'] || x['Color o Estilo'] === "Único") || v[0], mon = window.config.moneda || "C$";
    document.getElementById('det-name').innerText = n;
    document.getElementById('det-desc').innerText = padre['Descripción'] || "Sin descripción.";
    document.getElementById('det-img-main').src = padre['Imagen 1'] || padre['Imagen_App'] || '';
    let selHTML = "";
    if (v.length > 1) {
        selHTML = `<label class="small fw-bold mb-1">Elige una opción:</label><select id="variant-select" class="form-select mb-3" onchange="window.updateVariantDetail(this)"><option value="" disabled selected>Seleccionar...</option>`;
        v.forEach(x => { selHTML += `<option value="${x.ID_unico}">${x['Color o Estilo']} - ${mon} ${window.parsePrecioFocuz(x['Precio Descuento']) > 0 ? x['Precio Descuento'] : x.Precio}</option>`; });
        selHTML += `</select>`;
    }
    document.getElementById('det-selector-area').innerHTML = selHTML;
    const btn = document.getElementById('det-btn-add');
    btn.disabled = v.length > 1; btn.innerText = v.length > 1 ? "ELIGE UNA OPCIÓN" : "AGREGAR AL CARRITO";
    btn.onclick = v.length === 1 ? () => window.addAlCarrito(padre.ID_unico) : null;
    new bootstrap.Modal(document.getElementById('detalleModal')).show();
};

window.updateVariantDetail = function(s) {
    const p = window.allProd.find(x => String(x.ID_unico) === String(s.value));
    if(!p) return;
    document.getElementById('det-img-main').src = p['Imagen 1'] || p['Imagen_App'] || '';
    const btn = document.getElementById('det-btn-add');
    btn.disabled = false; btn.innerText = "AGREGAR AL CARRITO"; btn.onclick = () => window.addAlCarrito(p.ID_unico);
};

window.addAlCarrito = function(id) {
    const p = window.allProd.find(x => String(x.id_unico || x.ID_unico) === String(id));
    if (!p) return;
    const idx = window.carrito.findIndex(x => String(x.id) === String(id)), sMax = parseInt(p.Stock || 0);
    if (idx > -1) { 
        if (window.carrito[idx].cant < sMax) window.carrito[idx].cant += 1;
        else { alert("Límite de stock."); return; }
    } else {
        const precio = window.parsePrecioFocuz(p['Precio Descuento']) > 0 ? p['Precio Descuento'] : p.Precio;
        window.carrito.push({ id: String(id), n: p.Nombre, v: p['Color o Estilo'] || "Único", p: precio, f: p['Imagen 1'] || p['Imagen_App'] || "", cant: 1 });
    }
    window.actualizarCarrito();
    // REINCORPORACIÓN DE ANIMACIÓN "BONITA"
    const btnModal = document.getElementById('det-btn-add'), btnCard = document.getElementById(`btn-main-${id}`), modal = document.getElementById('detalleModal').classList.contains('show'), btn = modal ? btnModal : btnCard;
    if (btn) {
        const oldT = btn.innerText; btn.innerText = "¡LISTO! ✅"; btn.classList.replace('btn-main', 'btn-success');
        setTimeout(() => {
            btn.innerText = oldT; btn.classList.replace('btn-success', 'btn-main');
            if (modal) bootstrap.Modal.getInstance(document.getElementById('detalleModal')).hide();
        }, 700);
    }
};

window.cambiarCant = function(idx, delta) {
    const item = window.carrito[idx], pO = window.allProd.find(x => String(x.id_unico || x.ID_unico) === String(item.id)), sM = parseInt(pO.Stock || 0);
    if (delta > 0 && item.cant < sM) item.cant += 1; else if (delta < 0 && item.cant > 1) item.cant -= 1;
    window.actualizarCarrito();
};

window.actualizarCarrito = function() {
    const mon = window.config.moneda || "C$";
    document.getElementById('cart-list').innerHTML = window.carrito.map((i, idx) => `
        <div class="d-flex align-items-center mb-3 border-bottom pb-2">
            <img src="${i.f}" style="width:50px;height:50px;object-fit:cover" class="rounded me-3">
            <div class="flex-grow-1">
                <h6 class="mb-0 small fw-bold">${i.n}</h6>
                <div class="d-flex align-items-center mt-1">
                    <button class="btn btn-outline-secondary btn-xs py-0 px-2" onclick="window.cambiarCant(${idx}, -1)">-</button>
                    <span class="mx-2 small fw-bold">${i.cant}</span>
                    <button class="btn btn-outline-secondary btn-xs py-0 px-2" onclick="window.cambiarCant(${idx}, 1)">+</button>
                </div>
            </div>
            <div class="text-end"><b class="small">${mon} ${i.p * i.cant}</b><br><button class="btn btn-sm text-danger p-0" onclick="window.borrarItem(${idx})">🗑️</button></div>
        </div>`).join('');
    const tot = window.carrito.reduce((a, x) => a + (x.p * x.cant), 0);
    document.getElementById('c-count').innerText = window.carrito.length;
    document.getElementById('c-total').innerText = `${mon} ${tot}`;
    document.getElementById('total-val').innerText = `${mon} ${tot}`;
};

window.borrarItem = function(idx) { window.carrito.splice(idx, 1); window.actualizarCarrito(); };
window.vaciarCarrito = function() { if (confirm("¿Vaciar?")) { window.carrito = []; window.actualizarCarrito(); } };
window.enviarWhatsApp = function() {
    if (!window.carrito.length) return;
    const num = String(window.config.celular).replace(/\s+/g, ''), mon = window.config.moneda || "C$";
    let m = `¡Hola! Pedido:\n\n`;
    window.carrito.forEach(i => { m += `• ${i.n} (x${i.cant}) - ${mon} ${i.p * i.cant}\n`; });
    m += `\n*TOTAL: ${mon} ${window.carrito.reduce((a,x)=>a+(x.p*x.cant),0)}*`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(m)}`, '_blank');
};
