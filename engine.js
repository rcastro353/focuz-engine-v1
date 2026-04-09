// Focuz Engine v2.3 - El cerebro de la tienda
function initFocuz(PROD_LINK, CONF_LINK) {
    let config = {}, allProd = [], carrito = [], catAct = "Todas";

    // CARGAR CONFIGURACIÓN
    Papa.parse(CONF_LINK, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
            results.data.forEach(row => { if(row.clave) config[row.clave.trim()] = row.valor ? row.valor.trim() : ""; });
            if(config.color_principal) document.documentElement.style.setProperty('--p-color', config.color_principal);
            document.getElementById('brand-name').innerText = config.nombre_tienda || "Tienda";
            document.getElementById('dinamic-title').innerText = config.nombre_tienda || "Tienda";
            document.getElementById('hero').style.backgroundImage = `url('${config.portada}')`;
            if(config.favicon) document.getElementById('favicon').href = config.favicon;
            
            let socHTML = '';
            if(config.facebook) socHTML += `<a href="${config.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`;
            if(config.instagram) socHTML += `<a href="${config.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
            if(config.tiktok) socHTML += `<a href="${config.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`;
            document.getElementById('socials').innerHTML = socHTML;

            cargarProductos();
        }
    });

    function cargarProductos() {
        Papa.parse(PROD_LINK, {
            download: true, header: true, skipEmptyLines: true,
            complete: function(res) {
                allProd = res.data.filter(p => p.Name).map(p => {
                    p.normalizedDescription = p['Información'] || 'Sin descripción adicional.';
                    p.attribute = p['Estilo / Color'] || p['Estilo'] || p['Color'] || 'Variante';
                    return p;
                });
                renderCats();
                filtrar();
            }
        });
    }

    window.renderCats = function() {
        const cats = ["Todas", ...new Set(allProd.map(p => p.Category).filter(Boolean))];
        document.getElementById('categories').innerHTML = cats.map(c => 
            `<div class="cat-btn ${c==catAct?'active':''}" onclick="setCat('${c}')">${c}</div>`).join('');
    };

    window.setCat = function(c) { catAct = c; filtrar(); };

    window.filtrar = function() {
        const search = document.getElementById('search').value.toLowerCase();
        const filtered = allProd.filter(p => (catAct === "Todas" || p.Category === catAct) && p.Name.toLowerCase().includes(search));
        const groups = filtered.reduce((acc, i) => { if (!acc[i.Name]) acc[i.Name] = { ...i, vars: [] }; acc[i.Name].vars.push(i); return acc; }, {});

        document.getElementById('productos').innerHTML = Object.values(groups).map(p => {
            const hasVars = p.vars.length > 1;
            const fotoHome = (p.Imagen_2 && p.Imagen_2.trim() !== "") ? p.Imagen_2 : p.Imagen_App;
            const stockTotal = p.vars.reduce((sum, v) => sum + parseInt(v.Stock || 0), 0);
            const isAgotado = stockTotal <= 0;
            const btnLabel = isAgotado ? 'Agotado' : (hasVars ? 'Ver Opciones' : '+ Agregar');
            
            return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="p-card h-100 ${isAgotado ? 'opacity-75' : ''}">
                    <img src="${fotoHome}" class="p-img" onclick="verDetalle('${p.Name}')">
                    <div class="p-3 text-center">
                        <h6 class="fw-bold small text-truncate mb-1">${p.Name}</h6>
                        <p class="text-success fw-bold mb-2">C$ ${p.Price}</p>
                        <button class="btn btn-main btn-sm w-100 rounded-pill" ${isAgotado ? 'disabled' : ''} 
                            onclick="${hasVars ? `verDetalle('${p.Name}')` : `directAdd('${p.Name}')`}">
                            ${btnLabel}
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
        renderCats();
    };

    window.directAdd = function(nombre) {
        const p = allProd.find(prod => prod.Name === nombre);
        if(parseInt(p.Stock || 0) <= 0) return alert("Producto agotado.");
        const foto = (p.Imagen_2 && p.Imagen_2.trim() !== "") ? p.Imagen_2 : p.Imagen_App;
        carrito.push({ n: p.Name, v: "Único", p: parseFloat(p.Price), f: foto });
        updateCart();
        new bootstrap.Offcanvas(document.getElementById('cart')).show();
    };

    window.verDetalle = function(nombre) {
        const p = allProd.find(prod => prod.Name === nombre);
        const vars = allProd.filter(prod => prod.Name === nombre);
        document.getElementById('det-name').innerText = p.Name;
        document.getElementById('det-price').innerText = "C$ " + p.Price;
        document.getElementById('det-desc').innerText = p.normalizedDescription;
        const fotoPrincipal = (p.Imagen_2 && p.Imagen_2.trim() !== "") ? p.Imagen_2 : p.Imagen_App;
        document.getElementById('det-img-main').src = fotoPrincipal;

        const fotos = [p.Imagen_App, p.Imagen_2, p.Imagen_3, p.Imagen_4].filter(f => f && f.trim() !== "");
        document.getElementById('det-thumbs').innerHTML = fotos.map(f => `<img src="${f}" class="thumb-img" onclick="document.getElementById('det-img-main').src='${f}'">`).join('');

        let selectorHTML = "";
        if(vars.length > 1) {
            selectorHTML = `<h6 class="small fw-bold mt-3">Selecciona Estilo/Color:</h6><select id="det-sel" class="form-select mb-3 shadow-sm" onchange="cambiarVarDetalle(this)">`;
            vars.forEach(v => {
                const fotoVar = (v.Imagen_2 && v.Imagen_2.trim() !== "") ? v.Imagen_2 : v.Imagen_App;
                selectorHTML += `<option value="${v.ID}|${v.Price}|${fotoVar}|${v.Stock}|${v.attribute}">${v.attribute} - C$ ${v.Price}</option>`;
            });
            selectorHTML += `</select>`;
        }
        document.getElementById('det-selector-area').innerHTML = selectorHTML;

        const btn = document.getElementById('det-btn-add');
        btn.disabled = parseInt(p.Stock) <= 0 && vars.length === 1;
        btn.innerText = btn.disabled ? "AGOTADO" : "AGREGAR AL CARRITO";
        btn.onclick = () => addDesdeDetalle(nombre, p);
        new bootstrap.Modal(document.getElementById('detalleModal')).show();
    };

    window.cambiarVarDetalle = function(sel) {
        const [id, precio, img, stock, attr] = sel.value.split('|');
        document.getElementById('det-price').innerText = "C$ " + precio;
        if(img && img !== "undefined") document.getElementById('det-img-main').src = img;
        const btn = document.getElementById('det-btn-add');
        btn.disabled = parseInt(stock) <= 0;
        btn.innerText = btn.disabled ? "OPCIÓN AGOTADA" : "AGREGAR AL CARRITO";
    };

    window.addDesdeDetalle = function(n, pOriginal) {
        const sel = document.getElementById('det-sel');
        let vFinal = "Único", pFinal = pOriginal.Price, imgFinal = (pOriginal.Imagen_2 || pOriginal.Imagen_App), sFinal = pOriginal.Stock;
        if(sel) {
            const [vid, vpr, vimg, vs, vattr] = sel.value.split('|');
            vFinal = vattr; pFinal = vpr; imgFinal = vimg; sFinal = vs;
        }
        if(parseInt(sFinal) <= 0) return alert("Opción agotada.");
        carrito.push({ n, v: vFinal, p: parseFloat(pFinal), f: imgFinal });
        updateCart();
        bootstrap.Modal.getInstance(document.getElementById('detalleModal')).hide();
        new bootstrap.Offcanvas(document.getElementById('cart')).show();
    };

    window.updateCart = function() {
        const list = document.getElementById('cart-list');
        list.innerHTML = carrito.map((i, idx) => `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <img src="${i.f}" style="width:60px; height:60px; object-fit:cover" class="rounded-3 me-3 shadow-sm">
                <div class="flex-grow-1"><h6 class="mb-0 small fw-bold text-truncate" style="max-width:140px">${i.n}</h6><small class="text-muted">${i.v}</small></div>
                <div class="text-end"><b>C$ ${i.p}</b><br><button class="btn btn-sm text-danger p-0 small" onclick="borrarItem(${idx})">✕</button></div>
            </div>`).join('');
        const total = carrito.reduce((s, i) => s + i.p, 0);
        document.getElementById('c-count').innerText = carrito.length;
        document.getElementById('c-total').innerText = "C$ " + total;
        document.getElementById('total-val').innerText = "C$ " + total;
    };

    window.borrarItem = function(idx) { carrito.splice(idx, 1); updateCart(); };
    window.vaciarCarrito = function() { if(confirm("¿Vaciar carrito?")) { carrito = []; updateCart(); } };

    window.enviarWhatsApp = function() {
        if(!carrito.length) return;
        let m = `*PEDIDO: ${config.nombre_tienda}*\n` + (config.mensaje_base || "Hola! Vengo de tu web y quiero estos productos:\n\n");
        carrito.forEach(i => m += `✅ *${i.n}* [${i.v}] - C$ ${i.p}\n`);
        const total = carrito.reduce((s, i) => s + i.p, 0);
        m += `\n*TOTAL: C$ ${total}*`;
        const tel = config.celular ? config.celular.replace(/\s+/g,'') : "50588888888";
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(m)}`, '_blank');
    };
}
